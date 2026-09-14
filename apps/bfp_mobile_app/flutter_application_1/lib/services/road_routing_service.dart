import 'dart:convert';
import 'dart:math' as math;

import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class RoadRouteOption {
  final String id;
  final String title;
  final String description;
  final double distanceKm;
  final int durationMinutes;
  final List<LatLng> polylinePoints;
  final bool isPrimary;

  const RoadRouteOption({
    required this.id,
    required this.title,
    required this.description,
    required this.distanceKm,
    required this.durationMinutes,
    required this.polylinePoints,
    this.isPrimary = false,
  });

  double get distanceMeters => distanceKm * 1000;
  String get formattedDistance => '${distanceKm.toStringAsFixed(1)} km';
  String get formattedEta => '$durationMinutes min${durationMinutes == 1 ? '' : 's'}';
}

class RoadRoutingService {
  final http.Client _client;

  RoadRoutingService({http.Client? client}) : _client = client ?? http.Client();

  /// Fetches multiple realistic road routes between [from] and [to] via OSRM.
  Future<List<RoadRouteOption>> fetchRoadRoutes({
    required LatLng from,
    required LatLng to,
  }) async {
    final List<RoadRouteOption> routes = [];

    try {
      // 1. Query OSRM with alternatives=true
      final url = Uri.parse(
        'https://router.project-osrm.org/route/v1/driving/'
        '${from.longitude},${from.latitude};${to.longitude},${to.latitude}'
        '?alternatives=true&overview=full&geometries=geojson',
      );

      final response = await _client.get(
        url,
        headers: {'Accept': 'application/json', 'User-Agent': 'Alab.BFP101'},
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>?;
        if (data != null && data['code'] == 'Ok' && data['routes'] is List) {
          final osrmRoutes = (data['routes'] as List).whereType<Map<String, dynamic>>().toList();

          for (int i = 0; i < osrmRoutes.length; i++) {
            final routeData = osrmRoutes[i];
            final geometry = routeData['geometry'] as Map<String, dynamic>?;
            final coordinates = geometry?['coordinates'];
            final distanceMeters = (routeData['distance'] as num?)?.toDouble() ?? 0;
            final durationSeconds = (routeData['duration'] as num?)?.toDouble() ?? 0;

            if (coordinates is List && coordinates.isNotEmpty) {
              final points = <LatLng>[];
              for (final pair in coordinates) {
                if (pair is List && pair.length >= 2) {
                  final lng = (pair[0] as num).toDouble();
                  final lat = (pair[1] as num).toDouble();
                  points.add(LatLng(lat, lng));
                }
              }

              if (points.length >= 2) {
                final distKm = distanceMeters / 1000.0;
                final durMins = math.max(1, (durationSeconds / 60.0).round());
                final isFastest = i == 0;

                routes.add(
                  RoadRouteOption(
                    id: 'osrm_$i',
                    title: isFastest ? 'Primary Route (Fastest)' : 'Alternative Route ${i + 1}',
                    description: isFastest ? 'Main Highway / Direct' : 'Secondary Road Option',
                    distanceKm: distKm,
                    durationMinutes: durMins,
                    polylinePoints: points,
                    isPrimary: isFastest,
                  ),
                );
              }
            }
          }
        }
      }
    } catch (_) {
      // Fallback below
    }

    // 2. If OSRM only gave 1 route, generate a tactical alternative bypass route if distance > 1.5km
    if (routes.length == 1 && routes.first.distanceKm > 1.5) {
      try {
        // Compute an offset waypoint slightly perpendicular to the midpoint
        final midLat = (from.latitude + to.latitude) / 2;
        final midLng = (from.longitude + to.longitude) / 2;
        final dLat = to.latitude - from.latitude;
        final dLng = to.longitude - from.longitude;
        // 12% offset eastward (inland)
        final altLat = midLat - (dLng * 0.15);
        final altLng = midLng + (dLat * 0.15);

        final altUrl = Uri.parse(
          'https://router.project-osrm.org/route/v1/driving/'
          '${from.longitude},${from.latitude};$altLng,$altLat;${to.longitude},${to.latitude}'
          '?overview=full&geometries=geojson',
        );

        final altResponse = await _client.get(
          altUrl,
          headers: {'Accept': 'application/json', 'User-Agent': 'Alab.BFP101'},
        ).timeout(const Duration(seconds: 6));

        if (altResponse.statusCode == 200) {
          final altData = jsonDecode(altResponse.body) as Map<String, dynamic>?;
          final altRoute = (altData?['routes'] as List?)?.firstOrNull as Map<String, dynamic>?;
          final coordinates = (altRoute?['geometry'] as Map<String, dynamic>?)?['coordinates'];
          final distanceMeters = (altRoute?['distance'] as num?)?.toDouble() ?? 0;
          final durationSeconds = (altRoute?['duration'] as num?)?.toDouble() ?? 0;

          if (coordinates is List && coordinates.isNotEmpty) {
            final points = <LatLng>[];
            for (final pair in coordinates) {
              if (pair is List && pair.length >= 2) {
                points.add(LatLng((pair[1] as num).toDouble(), (pair[0] as num).toDouble()));
              }
            }
            if (points.length >= 2) {
              routes.add(
                RoadRouteOption(
                  id: 'alt_bypass',
                  title: 'Inland Bypass Route',
                  description: 'Alternative road corridor',
                  distanceKm: distanceMeters / 1000.0,
                  durationMinutes: math.max(1, (durationSeconds / 60.0).round()),
                  polylinePoints: points,
                  isPrimary: false,
                ),
              );
            }
          }
        }
      } catch (_) {}
    }

    return routes;
  }
}
