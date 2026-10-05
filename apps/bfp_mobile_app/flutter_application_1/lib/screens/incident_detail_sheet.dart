import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';

import '../services/mobile_bfp_api.dart';
import '../services/phone_location_service.dart';
import '../services/road_routing_service.dart';
import '../services/water_source_store.dart';
import '../theme/app_colors.dart';
import 'response_history_screen.dart' show formatHistoryDateTime;
import 'water_sources_map.dart';

class IncidentDetailSheet extends StatefulWidget {
  const IncidentDetailSheet({
    super.key,
    this.title,
    this.location,
    this.severity,
    this.eta,
    this.distance,
    this.unitsAssigned,
    this.assignment,
    this.onNavigateTab,
    this.sessionToken,
    this.api,
    this.roadRoute,
    this.waterSourceStore,
  });

  final String? title, location, severity, eta, distance, unitsAssigned;
  final MobileDispatchAssignment? assignment;
  final ValueChanged<int>? onNavigateTab;
  final String? sessionToken;
  final MobileBfpApi? api;
  final RoadRouteOption? roadRoute;
  final WaterSourceStore? waterSourceStore;

  static void show(
    BuildContext context, {
    String? title,
    String? location,
    String? severity,
    String? eta,
    String? distance,
    String? unitsAssigned,
    MobileDispatchAssignment? assignment,
    ValueChanged<int>? onNavigateTab,
    String? sessionToken,
    MobileBfpApi? api,
    RoadRouteOption? roadRoute,
  }) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => IncidentDetailSheet(
        title: title,
        location: location,
        severity: severity,
        eta: eta,
        distance: distance,
        unitsAssigned: unitsAssigned,
        assignment: assignment,
        onNavigateTab: onNavigateTab,
        sessionToken: sessionToken,
        api: api,
        roadRoute: roadRoute,
      ),
    );
  }

  @override
  State<IncidentDetailSheet> createState() => _IncidentDetailSheetState();
}

class _IncidentDetailSheetState extends State<IncidentDetailSheet> {
  late final MobileBfpApi _api;
  WaterSourceStore? _waterStore;
  MobileWaterSource? _nearest;
  RoadRouteOption? _route;
  bool _loadingWater = false, _loadingRoute = false, _cachedWater = false;
  String? _waterMessage, _routeMessage;

  MobileDispatchAssignment? get _assignment => widget.assignment;
  bool get _resolved =>
      _assignment?.reportStatus == 'RESOLVED' ||
      _assignment?.recipientStatus == 'COMPLETED';
  LatLng get _incident => LatLng(_assignment!.latitude, _assignment!.longitude);
  String get _status => _resolved
      ? 'RESOLVED'
      : switch (_assignment?.recipientStatus ?? widget.severity) {
          'ON_SCENE' => 'ON SCENE',
          'EN_ROUTE' => 'EN ROUTE',
          'ACKNOWLEDGED' => 'ACKNOWLEDGED',
          'ASSIGNED' => 'DISPATCHED',
          final String value => value.replaceAll('_', ' '),
          _ => 'Not recorded',
        };

  @override
  void initState() {
    super.initState();
    _api = widget.api ?? MobileBfpApi();
    _route = widget.roadRoute;
    if (_assignment != null &&
        (widget.sessionToken != null || widget.waterSourceStore != null)) {
      _waterStore =
          widget.waterSourceStore ??
          WaterSourceStore(
            fetchSources: () => _api.listWaterSources(widget.sessionToken!),
          );
      unawaited(_loadWater());
      if (!_resolved && _route == null && widget.sessionToken != null) {
        unawaited(_loadRoute());
      }
    }
  }

  Future<void> _loadWater() async {
    setState(() {
      _loadingWater = true;
      _waterMessage = null;
    });
    try {
      final cached = await _waterStore!.loadCached();
      if (!mounted) return;
      if (cached.isNotEmpty) {
        setState(() {
          _nearest = nearestWaterSource(cached, _incident);
          _cachedWater = true;
        });
      }
    } catch (_) {
      /* A missing cache does not prevent a live fetch. */
    }
    try {
      final sources = await _waterStore!.refresh();
      if (!mounted) return;
      setState(() {
        _nearest = nearestWaterSource(sources, _incident);
        _cachedWater = false;
        _waterMessage = _nearest == null
            ? 'No water sources have been registered yet.'
            : null;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _waterMessage = _nearest == null
              ? 'Unable to load water sources. Connect to the internet and retry.'
              : null;
          _cachedWater = true;
        });
      }
    } finally {
      if (mounted) setState(() => _loadingWater = false);
    }
  }

  Future<void> _loadRoute() async {
    if (_loadingRoute) return;
    setState(() {
      _loadingRoute = true;
      _routeMessage = null;
      _route = null;
    });
    try {
      final origin = await PhoneLocationService().currentPosition();
      if (!mounted) return;
      final routes = await RoadRoutingService().fetchRoadRoutes(
        from: origin,
        to: _incident,
        includeAlternatives: false,
      );
      if (!mounted) return;
      setState(() {
        _route = routes.firstOrNull;
        _routeMessage = _route == null
            ? 'Driving route unavailable. Connect to the internet and retry.'
            : null;
      });
    } on PhoneLocationException catch (error) {
      if (mounted) setState(() => _routeMessage = error.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _routeMessage = 'Unable to calculate the route. Please retry.',
        );
      }
    } finally {
      if (mounted) setState(() => _loadingRoute = false);
    }
  }

  void _routeToWater() {
    final source = _nearest;
    if (source == null || widget.sessionToken == null) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Water source route')),
          body: WaterSourcesMap(
            api: _api,
            token: widget.sessionToken!,
            municipalityName: source.municipalityName,
            initialSource: source,
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    if (widget.waterSourceStore == null) unawaited(_waterStore?.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = _assignment;
    final accent = _resolved ? AppColors.successGreen : AppColors.primaryRed;
    return Container(
      height: MediaQuery.sizeOf(context).height * .9,
      decoration: const BoxDecoration(
        color: AppColors.bgLight,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 12, 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: .08),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      _resolved
                          ? Icons.verified_rounded
                          : Icons.local_fire_department_rounded,
                      color: accent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (a != null)
                          Text(
                            a.referenceNumber,
                            style: _text(
                              11,
                              AppColors.textMuted,
                              FontWeight.w700,
                            ),
                          ),
                        const SizedBox(height: 4),
                        Text(
                          a?.fireTypeLabel ??
                              widget.title ??
                              'No incident selected',
                          style: _text(20, AppColors.textDark, FontWeight.w800),
                        ),
                        if (a != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha: .08),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _status,
                              style: _text(10, accent, FontWeight.w800),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close incident details',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: a == null
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'Open an assigned incident to see its recorded details.',
                        ),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                      children: [
                        _card(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _section(
                                'Incident location',
                                Icons.location_on_outlined,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                a.locationSummary,
                                style: _text(
                                  16,
                                  AppColors.textDark,
                                  FontWeight.w700,
                                ),
                              ),
                              // The summary already ends with the municipality when it is known.
                              if (a.municipality?.isNotEmpty == true &&
                                  !a.locationSummary.contains(a.municipality!)) ...[
                                const SizedBox(height: 4),
                                Text(
                                  a.municipality!,
                                  style: _text(13, AppColors.textMuted),
                                ),
                              ],
                              if (a.landmark?.isNotEmpty == true) ...[
                                const SizedBox(height: 10),
                                Text(
                                  'Landmark: ${a.landmark}',
                                  style: _text(13, AppColors.textMuted),
                                ),
                              ],
                              const SizedBox(height: 10),
                              SelectableText(
                                '${a.latitude.toStringAsFixed(6)}, ${a.longitude.toStringAsFixed(6)}',
                                style: _text(12, AppColors.textMuted),
                              ),
                              const Divider(height: 28),
                              _row('Assigned station', a.stationName),
                              _row(
                                'Incident status',
                                a.reportStatus.replaceAll('_', ' '),
                              ),
                              _row('Level of danger', a.levelOfDangerLabel),
                            ],
                          ),
                        ),
                        if (!_resolved) ...[
                          const SizedBox(height: 14),
                          _card(
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _section(
                                  'Route from your location',
                                  Icons.near_me_outlined,
                                ),
                                const SizedBox(height: 14),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _metric(
                                        'Driving distance',
                                        _route?.formattedDistance ??
                                            widget.distance ??
                                            'Not calculated',
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _metric(
                                        'Estimated arrival',
                                        _route?.formattedEta ??
                                            widget.eta ??
                                            'Not calculated',
                                      ),
                                    ),
                                  ],
                                ),
                                if (_loadingRoute) ...[
                                  const SizedBox(height: 14),
                                  const LinearProgressIndicator(minHeight: 2),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Getting your location and driving route…',
                                    style: _text(12, AppColors.textMuted),
                                  ),
                                ],
                                if (_routeMessage != null) ...[
                                  const SizedBox(height: 12),
                                  Text(
                                    _routeMessage!,
                                    style: _text(12, AppColors.textMuted),
                                  ),
                                ],
                                const SizedBox(height: 8),
                                TextButton.icon(
                                  onPressed: _loadingRoute ? null : _loadRoute,
                                  icon: const Icon(
                                    Icons.my_location_rounded,
                                    size: 18,
                                  ),
                                  label: const Text('Refresh from my location'),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),
                        _card(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _section(
                                'Response timeline',
                                Icons.schedule_rounded,
                              ),
                              const SizedBox(height: 16),
                              _timeline('Dispatched', a.assignedAt),
                              _timeline('En route', a.enRouteAt),
                              _timeline('On scene', a.onSceneAt),
                              _timeline(
                                'Response completed',
                                a.completedAt,
                                last: true,
                              ),
                              if (a.responseSeconds != null) ...[
                                const Divider(height: 24),
                                _row('Response time', a.responseTimeLabel),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        _card(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _section(
                                'Nearest water source',
                                Icons.water_drop_outlined,
                                color: AppColors.infoBlue,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Closest registered source to this incident',
                                style: _text(11, AppColors.textMuted),
                              ),
                              const SizedBox(height: 14),
                              if (_loadingWater && _nearest == null)
                                const LinearProgressIndicator(minHeight: 2)
                              else if (_nearest case final source?) ...[
                                Text(
                                  source.exactLocation,
                                  style: _text(
                                    15,
                                    AppColors.textDark,
                                    FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${source.kindLabel} · ${source.municipalityName}',
                                  style: _text(12, AppColors.textMuted),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${_waterDistance(source)} from incident · straight-line distance',
                                  style: _text(
                                    12,
                                    AppColors.infoBlue,
                                    FontWeight.w600,
                                  ),
                                ),
                                if (_cachedWater) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    'Offline · saved water-source locations',
                                    style: _text(11, AppColors.textMuted),
                                  ),
                                ],
                                if (widget.sessionToken != null) ...[
                                  const SizedBox(height: 14),
                                  SizedBox(
                                    width: double.infinity,
                                    child: FilledButton.icon(
                                      style: FilledButton.styleFrom(
                                        backgroundColor: AppColors.infoBlue,
                                        minimumSize: const Size(0, 48),
                                      ),
                                      onPressed: _routeToWater,
                                      icon: const Icon(Icons.alt_route_rounded),
                                      label: const Text(
                                        'Route from my location',
                                      ),
                                    ),
                                  ),
                                ],
                              ] else
                                Text(
                                  _waterMessage ??
                                      'Water-source information is unavailable.',
                                  style: _text(13, AppColors.textMuted),
                                ),
                              if (_waterStore != null &&
                                  !_loadingWater &&
                                  (_waterMessage != null || _cachedWater))
                                TextButton.icon(
                                  onPressed: _loadWater,
                                  icon: const Icon(Icons.refresh_rounded),
                                  label: const Text('Retry water sources'),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            widget.onNavigateTab?.call(3);
                          },
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 48),
                          ),
                          icon: const Icon(Icons.history_rounded),
                          label: const Text('View Response History'),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  String _waterDistance(MobileWaterSource source) {
    final meters = const Distance()(
      _incident,
      LatLng(source.latitude, source.longitude),
    );
    return meters < 1000
        ? '${meters.round()} m'
        : '${(meters / 1000).toStringAsFixed(1)} km';
  }

  TextStyle _text(
    double size,
    Color color, [
    FontWeight weight = FontWeight.w500,
  ]) => GoogleFonts.plusJakartaSans(
    fontSize: size,
    color: color,
    fontWeight: weight,
    height: 1.4,
  );

  Widget _card(Widget child) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: const Color(0xFFE2E8F0)),
    ),
    child: child,
  );

  Widget _section(
    String label,
    IconData icon, {
    Color color = AppColors.textDark,
  }) => Row(
    children: [
      Icon(icon, size: 19, color: color),
      const SizedBox(width: 8),
      Expanded(child: Text(label, style: _text(14, color, FontWeight.w800))),
    ],
  );

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: Text(label, style: _text(12, AppColors.textMuted))),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: _text(12, AppColors.textDark, FontWeight.w700),
          ),
        ),
      ],
    ),
  );

  Widget _metric(String label, String value) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(value, style: _text(18, AppColors.textDark, FontWeight.w800)),
      const SizedBox(height: 4),
      Text(label, style: _text(11, AppColors.textMuted)),
    ],
  );

  Widget _timeline(String label, DateTime? time, {bool last = false}) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Column(
        children: [
          Icon(
            time == null
                ? Icons.radio_button_unchecked
                : Icons.check_circle_rounded,
            size: 18,
            color: time == null ? AppColors.textMuted : AppColors.successGreen,
          ),
          if (!last)
            Container(width: 1, height: 42, color: const Color(0xFFE2E8F0)),
        ],
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: _text(13, AppColors.textDark, FontWeight.w700)),
            const SizedBox(height: 3),
            Text(
              time == null ? 'Not recorded' : formatHistoryDateTime(time),
              style: _text(12, AppColors.textMuted),
            ),
          ],
        ),
      ),
    ],
  );
}
