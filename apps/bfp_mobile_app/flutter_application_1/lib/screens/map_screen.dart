import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' hide Path;

import '../services/mobile_dispatch_store.dart';
import '../services/mobile_bfp_api.dart';
import '../services/road_routing_service.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';
import '../widgets/request_backup_button.dart';
import '../widgets/map_layer_tabs.dart';
import 'water_sources_map.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({
    super.key,
    required this.dispatchStore,
    this.onNavigateTab,
    this.requestedMode = MapLayerMode.incidents,
    this.requestId = 0,
  });

  final MobileDispatchStore dispatchStore;
  final void Function(int)? onNavigateTab;
  final MapLayerMode requestedMode;
  final int requestId;

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with TickerProviderStateMixin {
  late MapLayerMode _mapMode;
  final MapController _mapController = MapController();
  final RoadRoutingService _routingService = RoadRoutingService();
  Position? _responder;
  final ValueNotifier<double> _headingNotifier = ValueNotifier<double>(0.0);
  double _deviceHeading = 0.0;
  double _unwrappedHeading = 0.0;
  double _lockedHeading = 0.0;
  bool _hasInitialHeading = false;
  String? _locationMessage;
  bool _isLocating = false;
  String? _lastCenteredDispatchId;
  StreamSubscription<Position>? _positionStream;
  StreamSubscription<CompassEvent>? _compassStream;

  // Backup request state
  bool _backupSending = false;
  bool _backupRequested = false;
  String? _backupRequestedForDispatchId;

  // Road Routing state
  List<RoadRouteOption> _roadRoutes = [];
  int _selectedRouteIndex = 0;
  bool _isLoadingRoutes = false;
  String? _lastRouteKey;

  // Smooth Live GPS & Vehicle Movement
  LatLng? _currentSmoothPoint;
  LatLng? _prevSmoothPoint;
  LatLng? _targetGpsPoint;
  AnimationController? _movementController;

  // Default Antique province center (Hamtic / San Jose area)
  static const LatLng _defaultCenter = LatLng(10.7432, 121.9841);

  @override
  void initState() {
    super.initState();
    _mapMode = widget.requestedMode;
    _movementController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..addListener(() {
      if (!mounted || _prevSmoothPoint == null || _targetGpsPoint == null) return;
      final t = Curves.linear.transform(_movementController!.value);
      setState(() {
        _currentSmoothPoint = LatLng(
          _prevSmoothPoint!.latitude + (_targetGpsPoint!.latitude - _prevSmoothPoint!.latitude) * t,
          _prevSmoothPoint!.longitude + (_targetGpsPoint!.longitude - _prevSmoothPoint!.longitude) * t,
        );
      });
    });

    widget.dispatchStore.addListener(_onStoreChanged);
    _locate();
    _startPositionStream();
    _startCompassStream();
  }

  @override
  void didUpdateWidget(covariant MapScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.requestId != oldWidget.requestId) {
      _mapMode = widget.requestedMode;
    }
  }

  @override
  void dispose() {
    _movementController?.dispose();
    _compassStream?.cancel();
    _positionStream?.cancel();
    _headingNotifier.dispose();
    widget.dispatchStore.removeListener(_onStoreChanged);
    _mapController.dispose();
    super.dispose();
  }

  void _onStoreChanged() {
    final assignment = widget.dispatchStore.activeAssignment;
    if (assignment != null && assignment.dispatchId != _lastCenteredDispatchId) {
      _lastCenteredDispatchId = assignment.dispatchId;
      unawaited(_syncBackupState(assignment.dispatchId));
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _mapMode != MapLayerMode.incidents) return;
        _centerOn(LatLng(assignment.latitude, assignment.longitude), zoom: 15.5);
      });
    }
    _checkAndUpdateRoutes();
    if (mounted) setState(() {});
  }

  void _startCompassStream() {
    try {
      _compassStream = FlutterCompass.events?.listen((event) {
        if (!mounted) return;
        final heading = event.heading;
        if (heading == null || !heading.isFinite) return;

        final rawTarget = (heading % 360 + 360) % 360;

        if (!_hasInitialHeading) {
          _hasInitialHeading = true;
          _lockedHeading = rawTarget;
          _unwrappedHeading = rawTarget;
          _deviceHeading = rawTarget;
          _headingNotifier.value = rawTarget;
          return;
        }

        // Calculate angular difference relative to our locked stationary anchor
        double delta = (rawTarget - (_lockedHeading % 360)) % 360;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        // STRICT ANCHOR DEADBAND:
        // Electronic magnetometers produce 2°-4° thermal/sensor noise when steady.
        // Ignore any fluctuation under 5.0 degrees.
        // The beam stays 100% frozen in place when phone is not physically rotated.
        if (delta.abs() < 5.0) return;

        // Physical rotation confirmed: update the anchor
        _lockedHeading = rawTarget;

        double diff = (rawTarget - (_unwrappedHeading % 360)) % 360;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        _unwrappedHeading += diff;
        _deviceHeading = _unwrappedHeading;
        _headingNotifier.value = _unwrappedHeading;
      });
    } catch (_) {}
  }

  Future<void> _locate() async {
    if (_isLocating) return;
    setState(() => _isLocating = true);

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _setMessage('Turn on GPS location for responder tracking.');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _setMessage('Location permission is needed for live navigation.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      if (!mounted) return;
      final newPoint = LatLng(position.latitude, position.longitude);
      setState(() {
        _responder = position;
        _currentSmoothPoint = newPoint;
        _prevSmoothPoint = newPoint;
        _targetGpsPoint = newPoint;
        _locationMessage = null;
      });

      _checkAndUpdateRoutes();

      // Report location ping to backend if active dispatch exists
      final active = widget.dispatchStore.activeAssignment;
      if (active != null) {
        unawaited(widget.dispatchStore.api.sendDispatchLocation(
          token: widget.dispatchStore.session.token,
          dispatchId: active.dispatchId,
          latitude: position.latitude,
          longitude: position.longitude,
        ));
      }
    } catch (_) {
      _setMessage('Unable to acquire GPS position.');
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  void _startPositionStream() {
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((position) {
      if (!mounted) return;
      _onNewPosition(position);
    }, onError: (_) {});
  }

  void _onNewPosition(Position position) {
    final newTarget = LatLng(position.latitude, position.longitude);

    if (_currentSmoothPoint == null) {
      _currentSmoothPoint = newTarget;
      _prevSmoothPoint = newTarget;
      _targetGpsPoint = newTarget;
      _responder = position;
      if (mounted) setState(() {});
      return;
    }

    _prevSmoothPoint = _currentSmoothPoint;
    _targetGpsPoint = newTarget;
    _responder = position;

    final distanceMeters = Geolocator.distanceBetween(
      _prevSmoothPoint!.latitude,
      _prevSmoothPoint!.longitude,
      newTarget.latitude,
      newTarget.longitude,
    );

    // Ignore GPS drift while the responder is standing still.
    if (distanceMeters < 5) return;

    // Smoothly animate the truck marker from previous coordinate to new GPS coordinate over 1000ms
    _movementController?.stop();
    _movementController?.reset();
    _movementController?.forward();

    // Re-calculate full road route if responder moved significantly (> 40m)
    if (distanceMeters > 40) {
      _checkAndUpdateRoutes(force: true);
    }

    final active = widget.dispatchStore.activeAssignment;
    if (active != null) {
      unawaited(widget.dispatchStore.api.sendDispatchLocation(
        token: widget.dispatchStore.session.token,
        dispatchId: active.dispatchId,
        latitude: position.latitude,
        longitude: position.longitude,
      ));
    }
  }

  double _calculateRemainingDistance(LatLng currentPos, List<LatLng> polylinePoints) {
    if (polylinePoints.isEmpty) return 0.0;
    if (polylinePoints.length == 1) {
      return Geolocator.distanceBetween(
        currentPos.latitude,
        currentPos.longitude,
        polylinePoints.first.latitude,
        polylinePoints.first.longitude,
      );
    }

    int closestIdx = 0;
    double minDistance = double.infinity;
    for (int i = 0; i < polylinePoints.length; i++) {
      final d = Geolocator.distanceBetween(
        currentPos.latitude,
        currentPos.longitude,
        polylinePoints[i].latitude,
        polylinePoints[i].longitude,
      );
      if (d < minDistance) {
        minDistance = d;
        closestIdx = i;
      }
    }

    double total = Geolocator.distanceBetween(
      currentPos.latitude,
      currentPos.longitude,
      polylinePoints[closestIdx].latitude,
      polylinePoints[closestIdx].longitude,
    );

    for (int i = closestIdx; i < polylinePoints.length - 1; i++) {
      total += Geolocator.distanceBetween(
        polylinePoints[i].latitude,
        polylinePoints[i].longitude,
        polylinePoints[i + 1].latitude,
        polylinePoints[i + 1].longitude,
      );
    }

    return total;
  }

  String _formatRemainingDistance(double meters) {
    if (meters >= 1000) {
      return '${(meters / 1000).toStringAsFixed(1)} km';
    } else if (meters > 20) {
      return '${meters.round()} m';
    } else {
      return 'On Scene';
    }
  }

  String _formatRemainingEta(double meters) {
    if (meters <= 25) return 'Arrived';
    final minutes = (meters / 583.0).ceil();
    if (minutes <= 1) return '< 1 min';
    return '$minutes mins';
  }

  void _setMessage(String value) {
    if (mounted) setState(() => _locationMessage = value);
  }

  void _checkAndUpdateRoutes({bool force = false}) {
    final assignment = widget.dispatchStore.activeAssignment;
    if (assignment == null) {
      if (_roadRoutes.isNotEmpty) {
        setState(() {
          _roadRoutes = [];
          _lastRouteKey = null;
        });
      }
      return;
    }

    final LatLng? origin = _responder != null
        ? LatLng(_responder!.latitude, _responder!.longitude)
        : null;

    if (origin == null) return;
    final destination = LatLng(assignment.latitude, assignment.longitude);

    final routeKey = '${origin.latitude.toStringAsFixed(4)},${origin.longitude.toStringAsFixed(4)}->'
        '${destination.latitude.toStringAsFixed(4)},${destination.longitude.toStringAsFixed(4)}';

    if (_lastRouteKey == routeKey && !force && _roadRoutes.isNotEmpty) return;
    _lastRouteKey = routeKey;

    _fetchRoadRoutes(origin: origin, destination: destination);
  }

  Future<void> _fetchRoadRoutes({
    required LatLng origin,
    required LatLng destination,
  }) async {
    if (_isLoadingRoutes) return;
    setState(() => _isLoadingRoutes = true);

    try {
      final routes = await _routingService.fetchRoadRoutes(
        from: origin,
        to: destination,
      );
      if (!mounted) return;
      setState(() {
        _roadRoutes = routes;
        _selectedRouteIndex = 0;
      });
      if (routes.isNotEmpty) {
        widget.dispatchStore.setActiveRoadRoute(routes.first);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoadingRoutes = false);
    }
  }

  void _centerOn(LatLng point, {double? zoom}) {
    try {
      _mapController.move(point, zoom ?? _mapController.camera.zoom);
    } catch (_) {}
  }

  void _zoomIn() {
    try {
      final currentZoom = _mapController.camera.zoom;
      if (currentZoom < 19) {
        _mapController.move(_mapController.camera.center, currentZoom + 1);
      }
    } catch (_) {}
  }

  void _zoomOut() {
    try {
      final currentZoom = _mapController.camera.zoom;
      if (currentZoom > 4) {
        _mapController.move(_mapController.camera.center, currentZoom - 1);
      }
    } catch (_) {}
  }

  void _fitRoute(RoadRouteOption route) {
    if (route.polylinePoints.isEmpty) return;
    try {
      final bounds = LatLngBounds.fromPoints(route.polylinePoints);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.only(top: 140, bottom: 260, left: 35, right: 35),
        ),
      );
    } catch (_) {
      if (route.polylinePoints.isNotEmpty) {
        _centerOn(route.polylinePoints.first, zoom: 14.5);
      }
    }
  }

  void _fitAllMarkers(MobileDispatchAssignment? assignment) {
    if (_roadRoutes.isNotEmpty && _selectedRouteIndex < _roadRoutes.length) {
      _fitRoute(_roadRoutes[_selectedRouteIndex]);
      return;
    }

    final points = <LatLng>[];
    if (assignment != null) {
      points.add(LatLng(assignment.latitude, assignment.longitude));
    }
    if (_currentSmoothPoint != null) {
      points.add(_currentSmoothPoint!);
    } else if (_responder != null) {
      points.add(LatLng(_responder!.latitude, _responder!.longitude));
    }

    if (points.isEmpty) {
      _centerOn(_defaultCenter, zoom: 12.0);
      return;
    }

    if (points.length == 1) {
      _centerOn(points.first, zoom: 15.5);
      return;
    }

    try {
      final bounds = LatLngBounds.fromPoints(points);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.only(top: 130, bottom: 220, left: 40, right: 40),
        ),
      );
    } catch (_) {
      _centerOn(points.first, zoom: 14.5);
    }
  }

  /// Evaluates all possible routes and recommends/selects the fastest route,
  /// then shows a detailed route comparison sheet.
  void _recommendFastestRoute() {
    if (_roadRoutes.isEmpty) {
      _checkAndUpdateRoutes(force: true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Calculating all possible road routes…'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    // Find the route with minimum duration (and lowest distance)
    int fastestIndex = 0;
    for (int i = 1; i < _roadRoutes.length; i++) {
      if (_roadRoutes[i].durationMinutes < _roadRoutes[fastestIndex].durationMinutes ||
          (_roadRoutes[i].durationMinutes == _roadRoutes[fastestIndex].durationMinutes &&
              _roadRoutes[i].distanceKm < _roadRoutes[fastestIndex].distanceKm)) {
        fastestIndex = i;
      }
    }

    setState(() => _selectedRouteIndex = fastestIndex);
    final fastest = _roadRoutes[fastestIndex];
    _fitRoute(fastest);

    // Show modal sheet with all possible routes comparison
    _showRouteComparisonSheet();
  }

  void _showRouteComparisonSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [
              BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, -4)),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(4)),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.alt_route_rounded, color: AppColors.primaryRed, size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Available Road Routes',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.textDark),
                        ),
                        Text(
                          'Compare route distances and estimated travel times',
                          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ...List.generate(_roadRoutes.length, (idx) {
                final r = _roadRoutes[idx];
                final isSelected = idx == _selectedRouteIndex;
                final isFastest = idx == 0;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      setState(() => _selectedRouteIndex = idx);
                      widget.dispatchStore.setActiveRoadRoute(r);
                      Navigator.pop(ctx);
                      _fitRoute(r);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? AppColors.primaryRed : const Color(0xFFE2E8F0),
                          width: isSelected ? 1.8 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                            color: isSelected ? AppColors.primaryRed : Colors.grey,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      r.title,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w800,
                                        color: isSelected ? AppColors.primaryRed : AppColors.textDark,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    if (isFastest)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFECFDF5),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: const Text(
                                          '⚡ FASTEST',
                                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFF047857)),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  r.description,
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                r.formattedDistance,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.textDark),
                              ),
                              Text(
                                '~${r.formattedEta}',
                                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFFEA580C)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  /// Opens the backup request sheet for the dispatch this responder is on.
  Future<void> _openBackupRequest(MobileDispatchAssignment assignment) async {
    // A new dispatch clears the sent state so backup can be raised again.
    if (_backupRequestedForDispatchId != assignment.dispatchId) {
      _backupRequested = false;
    }
    if (_backupSending || _backupRequested) return;

    final result = await showModalBottomSheet<RequestBackupResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RequestBackupSheet(referenceNumber: assignment.referenceNumber),
    );
    if (result == null || !mounted) return;

    setState(() => _backupSending = true);
    try {
      await MobileBfpApi().requestBackup(
        token: widget.dispatchStore.session.token,
        dispatchId: assignment.dispatchId,
        reason: result.description,
        requestedFiretrucks: result.firetrucks,
        requestedPersonnel: result.personnel,
        photos: result.photos,
      );
      if (!mounted) return;
      setState(() {
        _backupRequested = true;
        _backupRequestedForDispatchId = assignment.dispatchId;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Backup requested. Your station has been notified.'),
          backgroundColor: Color(0xFF047857),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      final already = error is MobileBfpApiException && error.statusCode == 409;
      if (already) {
        // Someone on this incident already called it in.
        setState(() {
          _backupRequested = true;
          _backupRequestedForDispatchId = assignment.dispatchId;
        });
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            already
                ? 'Backup was already requested for this incident.'
                : error is MobileBfpApiException
                    ? error.message
                    : 'Could not request backup. Try again.',
          ),
          backgroundColor: already ? const Color(0xFFB45309) : const Color(0xFFB91C1C),
        ),
      );
    } finally {
      if (mounted) setState(() => _backupSending = false);
    }
  }

  /// Reflects the server's view of whether backup is already open.
  Future<void> _syncBackupState(String dispatchId) async {
    try {
      final open = await MobileBfpApi().hasOpenBackupRequest(
        token: widget.dispatchStore.session.token,
        dispatchId: dispatchId,
      );
      if (!mounted) return;
      setState(() {
        _backupRequested = open;
        _backupRequestedForDispatchId = open ? dispatchId : null;
      });
    } catch (_) {
      // A failed check leaves the control enabled; the server still refuses a
      // duplicate, so the worst case is one rejected tap.
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_mapMode == MapLayerMode.waterSources) {
      return Scaffold(
        body: Stack(children: [
          WaterSourcesMap(
            api: widget.dispatchStore.api,
            token: widget.dispatchStore.session.token,
          ),
          Positioned(
            top: 92, left: 16, right: 16,
            child: MapLayerTabs(
              selected: _mapMode,
              onChanged: (mode) => setState(() => _mapMode = mode),
            ),
          ),
        ]),
      );
    }
    final assignment = widget.dispatchStore.activeAssignment;
    final incidentPoint = assignment != null
        ? LatLng(assignment.latitude, assignment.longitude)
        : _defaultCenter;

    final LatLng? responderPoint = _currentSmoothPoint ??
        (_responder != null
            ? LatLng(_responder!.latitude, _responder!.longitude)
            : null);

    final RoadRouteOption? activeRoute = _roadRoutes.isNotEmpty && _selectedRouteIndex < _roadRoutes.length
        ? _roadRoutes[_selectedRouteIndex]
        : null;

    final double? remainingMeters = (activeRoute != null && responderPoint != null)
        ? _calculateRemainingDistance(responderPoint, activeRoute.polylinePoints)
        : activeRoute?.distanceMeters;

    // Build real road polylines (Alternative routes in muted slate, Active route in vivid red with glow)
    final List<Polyline> polylines = [];
    if (_roadRoutes.isNotEmpty) {
      // 1. Draw unselected alternative routes first (behind active route)
      for (int i = 0; i < _roadRoutes.length; i++) {
        if (i == _selectedRouteIndex) continue;
        final alt = _roadRoutes[i];
        polylines.add(
          Polyline(
            points: alt.polylinePoints,
            strokeWidth: 4.5,
            color: const Color(0xFF64748B).withValues(alpha: 0.85),
          ),
        );
      }

      // 2. Draw selected active route on top with glowing border
      if (activeRoute != null && activeRoute.polylinePoints.isNotEmpty) {
        // Outer halo
        polylines.add(
          Polyline(
            points: activeRoute.polylinePoints,
            strokeWidth: 8.5,
            color: const Color(0x66DC2626),
          ),
        );
        // Inner vivid route line
        polylines.add(
          Polyline(
            points: activeRoute.polylinePoints,
            strokeWidth: 5.5,
            color: AppColors.primaryRed,
          ),
        );
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFE2EAF2),
      body: SizedBox.expand(
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 1. FULL SCREEN INTERACTIVE TACTICAL FLUTTER MAP
            Positioned.fill(
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: incidentPoint,
                  initialZoom: assignment != null ? 15.0 : 12.0,
                  minZoom: 4.0,
                  maxZoom: 19.0,
                  interactionOptions: const InteractionOptions(
                    flags: InteractiveFlag.all,
                    enableMultiFingerGestureRace: true,
                  ),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'Alab.BFP101',
                    maxZoom: 19,
                    minZoom: 3,
                  ),
                  if (polylines.isNotEmpty) PolylineLayer(polylines: polylines),
                  if (assignment != null)
                    CircleLayer(
                      circles: [
                        CircleMarker(
                          point: incidentPoint,
                          radius: 55,
                          useRadiusInMeter: true,
                          color: const Color(0x28DC2626),
                          borderColor: const Color(0x99DC2626),
                          borderStrokeWidth: 2,
                        ),
                      ],
                    ),
                  MarkerLayer(
                    markers: [
                      // Incident Destination Pin
                      if (assignment != null)
                        Marker(
                          point: incidentPoint,
                          width: 84,
                          height: 84,
                          child: _MapPin(
                            icon: Icons.local_fire_department_rounded,
                            color: AppColors.primaryRed,
                            label: assignment.locationSummary.toUpperCase(),
                            isPulse: true,
                          ),
                        ),

                      // Responder Pin with BIG FLASHLIGHT & BFP FIRE TRUCK ICON
                      if (responderPoint != null)
                        Marker(
                          point: responderPoint,
                          width: 190,
                          height: 190,
                          child: _ResponderBeamMarker(
                            headingListenable: _headingNotifier,
                            headingDegrees: _deviceHeading,
                          ),
                        ),
                    ],
                  ),
                  const SimpleAttributionWidget(
                    source: Text('© OpenStreetMap contributors', style: TextStyle(fontSize: 8, color: Colors.black54)),
                    alignment: Alignment.bottomRight,
                  ),
                ],
              ),
            ),

            // 2. TOP FLOATING GLASS HEADER & MULTI-INCIDENT BAR
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      LiquidGlassContainer(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        borderRadius: 20,
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.map_rounded, color: AppColors.primaryRed, size: 20),
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'GIS Tactical Dispatch Map',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textDark),
                                  ),
                                  Text(
                                    'Live road routing · Dynamic BFP truck beacon',
                                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: const BoxDecoration(color: AppColors.primaryRed, shape: BoxShape.circle),
                                  ),
                                  const SizedBox(width: 4),
                                  const Text(
                                    'LIVE',
                                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: AppColors.primaryRed),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // 3. LOCATION PERMISSION / STATUS BANNER
            Positioned(
              top: 92, left: 16, right: 16,
              child: MapLayerTabs(
                selected: _mapMode,
                onChanged: (mode) => setState(() => _mapMode = mode),
              ),
            ),
            if (_locationMessage != null)
              Positioned(
                top: 164,
                left: 16,
                right: 75,
                child: LiquidGlassContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  borderRadius: 14,
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, size: 16, color: AppColors.primaryRed),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _locationMessage!,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textDark),
                        ),
                      ),
                      TextButton(
                        onPressed: _locate,
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(40, 24)),
                        child: const Text('Enable', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.primaryRed)),
                      ),
                    ],
                  ),
                ),
              ),

            // 4. FLOATING MAP CONTROLS (ZOOM, FIT, RECENTER)
            Positioned(
              right: 16,
              top: 164,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _MapActionButton(
                    icon: Icons.add_rounded,
                    tooltip: 'Zoom in',
                    onTap: _zoomIn,
                  ),
                  const SizedBox(height: 8),
                  _MapActionButton(
                    icon: Icons.remove_rounded,
                    tooltip: 'Zoom out',
                    onTap: _zoomOut,
                  ),
                  const SizedBox(height: 8),
                  _MapActionButton(
                    icon: Icons.crop_free_rounded,
                    tooltip: 'Fit route view',
                    onTap: () => _fitAllMarkers(assignment),
                  ),
                  const SizedBox(height: 8),
                  _MapActionButton(
                    icon: Icons.my_location_rounded,
                    tooltip: 'My location',
                    isLoading: _isLocating,
                    color: AppColors.infoBlue,
                    onTap: () {
                      if (_currentSmoothPoint != null) {
                        _centerOn(_currentSmoothPoint!, zoom: 16.0);
                      } else if (_responder != null) {
                        _centerOn(LatLng(_responder!.latitude, _responder!.longitude), zoom: 16.0);
                      } else {
                        _locate();
                      }
                    },
                  ),
                  if (assignment != null) ...[
                    const SizedBox(height: 8),
                    _MapActionButton(
                      icon: Icons.local_fire_department_rounded,
                      tooltip: 'Center incident',
                      color: AppColors.primaryRed,
                      onTap: () => _centerOn(incidentPoint, zoom: 16.0),
                    ),
                    // Backup is called for by the responder on scene.
                    const SizedBox(height: 8),
                    _MapActionButton(
                      icon: _backupRequested
                          ? Icons.check_circle_rounded
                          : Icons.campaign_rounded,
                      tooltip: _backupRequested ? 'Backup requested' : 'Request backup',
                      color: _backupRequested ? const Color(0xFF047857) : const Color(0xFFEA580C),
                      isLoading: _backupSending,
                      onTap: () => _openBackupRequest(assignment),
                    ),
                  ],
                ],
              ),
            ),

            // 5. MULTIPLE ROAD ROUTES SELECTOR PILLS (FLOATING ABOVE CARD)
            if (assignment != null && _roadRoutes.length > 1)
              Positioned(
                left: 16,
                right: 16,
                bottom: 236,
                child: SizedBox(
                  height: 38,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _roadRoutes.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (context, idx) {
                      final route = _roadRoutes[idx];
                      final isSelected = idx == _selectedRouteIndex;
                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedRouteIndex = idx);
                          widget.dispatchStore.setActiveRoadRoute(route);
                          _fitRoute(route);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primaryRed : Colors.white.withValues(alpha: 0.95),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? AppColors.primaryRed : const Color(0xFFE2E8F0),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: isSelected
                                    ? AppColors.primaryRed.withValues(alpha: 0.3)
                                    : Colors.black.withValues(alpha: 0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isSelected ? Icons.directions_car_rounded : Icons.alt_route_rounded,
                                size: 15,
                                color: isSelected ? Colors.white : AppColors.textDark,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '${route.title}: ${route.formattedDistance} (${route.formattedEta})',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: isSelected ? Colors.white : AppColors.textDark,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

            // 6. BOTTOM TACTICAL INCIDENT DESTINATION & ROAD METRICS CARD
            Positioned(
              left: 16,
              right: 16,
              bottom: 92,
              child: assignment != null
                  ? LiquidGlassContainer(
                      padding: const EdgeInsets.all(14),
                      borderRadius: 20,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Header: Fire type, Reference, Status
                          Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  gradient: AppColors.fireGradient,
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primaryRed.withValues(alpha: 0.3),
                                      blurRadius: 10,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: const Icon(Icons.local_fire_department_rounded, color: Colors.white, size: 24),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            assignment.fireType.replaceAll('_', ' '),
                                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.textDark),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: assignment.recipientStatus == 'ON_SCENE'
                                                ? const Color(0xFFECFDF5)
                                                : const Color(0xFFFEF2F2),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            assignment.recipientStatus == 'ON_SCENE'
                                                ? 'ON SCENE'
                                                : assignment.recipientStatus == 'EN_ROUTE'
                                                    ? 'EN ROUTE'
                                                    : 'DISPATCHED',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.w900,
                                              color: assignment.recipientStatus == 'ON_SCENE'
                                                  ? const Color(0xFF047857)
                                                  : AppColors.primaryRed,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      assignment.referenceNumber,
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          // Clean Location row: Barangay Name Only (NO LANDMARK, NO DUPLICATE COORDINATES)
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.location_on_rounded, size: 16, color: AppColors.primaryRed),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    assignment.locationSummary,
                                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppColors.textDark),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF2F2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    assignment.stationName,
                                    style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: AppColors.primaryRed),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Real Road Distance & Travel Time Strip
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF7ED),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFFFEDD5)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.directions_car_rounded, size: 16, color: Color(0xFFEA580C)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    activeRoute != null
                                        ? 'Road: ${_formatRemainingDistance(remainingMeters ?? activeRoute.distanceMeters)} · ${_formatRemainingEta(remainingMeters ?? activeRoute.distanceMeters)} (${activeRoute.title})'
                                        : _isLoadingRoutes
                                            ? 'Calculating all possible road routes…'
                                            : responderPoint == null
                                                ? 'Waiting for phone GPS to calculate a road route'
                                                : 'Road route unavailable. Check your internet connection.',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFC2410C)),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (_isLoadingRoutes)
                                  const SizedBox(
                                    width: 12,
                                    height: 12,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFEA580C)),
                                  ),
                              ],
                            ),
                          ),

                          // Bottom Action Button: Recommend Fastest Route
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              // RECOMMEND FASTEST ROUTE BUTTON
                              Expanded(
                                flex: 6,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF047857), // Forest Emerald
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    elevation: 2,
                                  ),
                                  icon: const Icon(Icons.bolt_rounded, size: 18, color: Color(0xFFFDE047)), // Yellow bolt
                                  label: const Text(
                                    'Recommend Fastest Route',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                                  ),
                                  onPressed: _recommendFastestRoute,
                                ),
                              ),
                            ],
                          ),

                        ],
                      ),
                    )
                  : LiquidGlassContainer(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      borderRadius: 20,
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
                            child: const Icon(Icons.location_searching_rounded, color: AppColors.textMuted, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.dispatchStore.isLoading ? 'Checking for live dispatches…' : 'Standby · No active destination',
                                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppColors.textDark),
                                ),
                                const Text(
                                  'Assigned dispatches will appear here automatically.',
                                  style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () => widget.onNavigateTab?.call(1),
                            child: const Text('Queue', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primaryRed)),
                          ),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapActionButton extends StatelessWidget {
  const _MapActionButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.color,
    this.isLoading = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final Color? color;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: isLoading ? null : onTap,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.95),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: (color ?? Colors.black).withValues(alpha: 0.12),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryRed),
                  )
                : Icon(icon, size: 20, color: color ?? AppColors.textDark),
          ),
        ),
      ),
    );
  }
}

class _MapPin extends StatelessWidget {
  const _MapPin({
    required this.icon,
    required this.color,
    required this.label,
    this.isPulse = false,
  });

  final IconData icon;
  final Color color;
  final String label;
  final bool isPulse;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: isPulse ? 0.5 : 0.3),
              blurRadius: isPulse ? 16 : 10,
              spreadRadius: isPulse ? 3 : 1,
            ),
          ],
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
      const SizedBox(height: 3),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0, 1)),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(fontSize: 8, color: color, fontWeight: FontWeight.w900),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    ],
  );
}

/// Dynamic Flashlight / Compass Heading Beam Marker with BFP FIRE TRUCK ICON
/// Displays a high-intensity luminous spotlight cone radiating outward from the BFP fire truck.
class _ResponderBeamMarker extends StatelessWidget {
  const _ResponderBeamMarker({
    this.headingDegrees,
    this.headingListenable,
  });

  final double? headingDegrees;
  final ValueListenable<double>? headingListenable;

  @override
  Widget build(BuildContext context) {
    if (headingListenable != null) {
      return ValueListenableBuilder<double>(
        valueListenable: headingListenable!,
        builder: (context, heading, _) {
          return TweenAnimationBuilder<double>(
            tween: Tween<double>(end: heading),
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            builder: (context, animatedHeading, _) {
              return _buildContent(animatedHeading);
            },
          );
        },
      );
    }
    return _buildContent(headingDegrees ?? 0.0);
  }

  Widget _buildContent(double angleDegrees) {
    return SizedBox(
      width: 190,
      height: 190,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // 1. Dynamic Rotating Flashlight Beam & Fire Truck
          Transform.rotate(
            angle: angleDegrees * (math.pi / 180),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Giant radiant spotlight beam
                CustomPaint(
                  size: const Size(190, 190),
                  painter: _BigFlashlightBeamPainter(),
                ),

                // Pulsing emergency halo behind truck
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFFDC2626).withValues(alpha: 0.25),
                  ),
                ),

                // BFP Fire Truck Badge with 3D styling
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFE5252A), Color(0xFF991B1B)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2.8),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFDC2626).withValues(alpha: 0.55),
                        blurRadius: 14,
                        spreadRadius: 2,
                        offset: const Offset(0, 3),
                      ),
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.fire_truck_rounded,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 2. "BFP UNIT · YOU" Badge
          Positioned(
            bottom: 22,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.95),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 6, offset: const Offset(0, 2)),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.circle, color: Color(0xFF16A34A), size: 6), // Green GPS active dot
                  SizedBox(width: 4),
                  Text(
                    'BFP UNIT',
                    style: TextStyle(fontSize: 8.5, color: AppColors.textDark, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom painter that draws a giant radiant flashlight / headlight beam
class _BigFlashlightBeamPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    const radius = 90.0;
    const sweepAngle = math.pi / 2.2; // ~82 degrees wide cone angle
    const startAngle = -math.pi / 2 - (sweepAngle / 2); // points strictly upward (0 deg heading)

    final path = Path()
      ..moveTo(center.dx, center.dy)
      ..arcTo(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
      )
      ..close();

    // Multi-stop radiant shader representing high-powered fire truck spotlight
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFBAE6FD).withValues(alpha: 0.85), // Intense bright beam at headlights
          const Color(0xFF38BDF8).withValues(alpha: 0.50), // Vibrant cyan-blue cone
          const Color(0xFF0284C7).withValues(alpha: 0.22), // Deep blue body
          const Color(0xFF0284C7).withValues(alpha: 0.0),  // Soft fade into map
        ],
        stops: const [0.0, 0.28, 0.65, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));

    canvas.drawPath(path, paint);

    // Left and Right Headlight projection rays for authentic emergency vehicle look
    final rayPaint = Paint()
      ..color = const Color(0xFFE0F2FE).withValues(alpha: 0.65)
      ..strokeWidth = 1.4
      ..style = PaintingStyle.stroke;

    final leftRayAngle = startAngle + 0.15;
    final rightRayAngle = startAngle + sweepAngle - 0.15;

    canvas.drawLine(
      center,
      Offset(center.dx + radius * math.cos(leftRayAngle), center.dy + radius * math.sin(leftRayAngle)),
      rayPaint,
    );
    canvas.drawLine(
      center,
      Offset(center.dx + radius * math.cos(rightRayAngle), center.dy + radius * math.sin(rightRayAngle)),
      rayPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
