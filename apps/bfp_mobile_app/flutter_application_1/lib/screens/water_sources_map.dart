import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../services/mobile_bfp_api.dart';
import '../services/water_source_store.dart';
import '../theme/app_colors.dart';

class WaterSourcesMap extends StatefulWidget {
  const WaterSourcesMap({super.key, required this.api, required this.token});

  final MobileBfpApi api;
  final String token;

  @override
  State<WaterSourcesMap> createState() => _WaterSourcesMapState();
}

class _WaterSourcesMapState extends State<WaterSourcesMap>
    with WidgetsBindingObserver {
  final MapController _controller = MapController();
  late final WaterSourceStore _store;
  List<MobileWaterSource> _sources = const [];
  List<LatLng> _boundary = const [];
  MobileWaterSource? _selected;
  Timer? _refreshTimer;
  bool _mapReady = false;
  bool _didFit = false;
  bool _loading = true;
  bool _syncing = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _store = WaterSourceStore(
      fetchSources: () => widget.api.listWaterSources(widget.token),
    );
    unawaited(_load());
    unawaited(_loadBoundary());
    _refreshTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => unawaited(_refresh()),
    );
  }

  Future<void> _loadBoundary() async {
    try {
      final raw = await rootBundle.loadString(
        'assets/data/antique-boundary.geojson',
      );
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final features = json['features'] as List;
      final geometry =
          (features.first as Map<String, dynamic>)['geometry']
              as Map<String, dynamic>;
      final ring = ((geometry['coordinates'] as List).first as List);
      final points = ring.map((pair) {
        final coords = pair as List;
        return LatLng(
          (coords[1] as num).toDouble(),
          (coords[0] as num).toDouble(),
        );
      }).toList();
      if (mounted) setState(() => _boundary = points);
    } catch (_) {
      // Water-source pins remain available if the optional outline cannot load.
    }
  }

  Future<void> _load() async {
    try {
      final cached = await _store.loadCached();
      if (mounted) {
        setState(() {
          _sources = cached;
          _loading = false;
        });
        _fitSources();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
    await _refresh();
  }

  Future<void> _refresh() async {
    if (_syncing) return;
    if (mounted) setState(() => _syncing = true);
    try {
      final fresh = await _store.refresh();
      if (!mounted) return;
      setState(() {
        _sources = fresh;
        _message = null;
        if (_selected != null) {
          final matches = fresh.where((source) => source.id == _selected!.id);
          _selected = matches.isEmpty ? null : matches.first;
        }
      });
      _fitSources();
    } catch (_) {
      if (mounted) {
        setState(
          () => _message = _sources.isEmpty
              ? 'Connect once to download Antique water sources.'
              : 'Offline · showing saved water sources',
        );
      }
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  void _fitSources() {
    if (!_mapReady || _didFit || _sources.isEmpty) return;
    _didFit = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final points = _sources
          .map((source) => LatLng(source.latitude, source.longitude))
          .toList();
      _controller.fitCamera(
        CameraFit.bounds(
          bounds: LatLngBounds.fromPoints(points),
          padding: const EdgeInsets.only(
            top: 165,
            bottom: 165,
            left: 32,
            right: 32,
          ),
        ),
      );
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_refresh());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    _controller.dispose();
    unawaited(_store.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      Positioned.fill(
        child: FlutterMap(
          mapController: _controller,
          options: MapOptions(
            initialCenter: const LatLng(11.25, 121.98),
            initialZoom: 9,
            onMapReady: () {
              _mapReady = true;
              _fitSources();
            },
          ),
          children: [
            if (_boundary.isNotEmpty)
              PolygonLayer(
                polygons: [
                  Polygon(
                    points: _boundary,
                    color: const Color(0xFFDDF3E8),
                    borderColor: const Color(0xFF0F766E),
                    borderStrokeWidth: 2,
                  ),
                ],
              ),
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'Alab.BFP101',
              maxZoom: 19,
            ),
            MarkerLayer(
              markers: _sources
                  .map(
                    (source) => Marker(
                      point: LatLng(source.latitude, source.longitude),
                      width: 42,
                      height: 42,
                      child: Tooltip(
                        message:
                            '${source.exactLocation}, ${source.municipalityName}',
                        child: IconButton.filled(
                          tooltip: source.exactLocation,
                          style: IconButton.styleFrom(
                            backgroundColor: source.sourceKind == 'FIRE_HYDRANT'
                                ? const Color(0xFF0F766E)
                                : const Color(0xFF0284C7),
                          ),
                          icon: Icon(
                            source.sourceKind == 'FIRE_HYDRANT'
                                ? Icons.fire_hydrant_alt_rounded
                                : Icons.water_drop_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          onPressed: () {
                            setState(() => _selected = source);
                            _controller.move(
                              LatLng(source.latitude, source.longitude),
                              15,
                            );
                          },
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            const SimpleAttributionWidget(
              source: Text(
                '© OpenStreetMap contributors',
                style: TextStyle(fontSize: 9),
              ),
              alignment: Alignment.bottomRight,
            ),
          ],
        ),
      ),
      Positioned(
        top: 0,
        left: 0,
        right: 0,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.water_drop_rounded,
                    color: Color(0xFF0F766E),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Antique water sources',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark,
                          ),
                        ),
                        Text(
                          _loading
                              ? 'Loading saved locations…'
                              : '${_sources.length} saved locations',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Sync water sources',
                    onPressed: _syncing ? null : _refresh,
                    icon: _syncing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.sync_rounded),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      if (_message != null)
        Positioned(
          top: 151,
          left: 16,
          right: 16,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Text(_message!, textAlign: TextAlign.center),
            ),
          ),
        ),
      if (_selected != null)
        Positioned(
          left: 16,
          right: 16,
          bottom: 92,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  const Icon(
                    Icons.location_on_rounded,
                    color: Color(0xFF0F766E),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _selected!.exactLocation,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        Text(
                          _selected!.municipalityName,
                          style: const TextStyle(fontSize: 12),
                        ),
                        Text(
                          '${_selected!.latitude.toStringAsFixed(6)}, ${_selected!.longitude.toStringAsFixed(6)}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close water source details',
                    onPressed: () => setState(() => _selected = null),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
          ),
        ),
    ],
  );
}
