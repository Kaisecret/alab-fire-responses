import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_application_1/services/road_routing_service.dart';

void main() {
  group('RoadRoutingService', () {
    test('parses multiple road routes from OSRM response with distance and ETA', () async {
      final mockClient = MockClient((request) async {
        final mockResponse = {
          'code': 'Ok',
          'routes': [
            {
              'distance': 9400.0,
              'duration': 540.0,
              'geometry': {
                'coordinates': [
                  [121.979, 10.648],
                  [121.975, 10.680],
                  [121.964, 10.723],
                ],
              },
            },
            {
              'distance': 13200.0,
              'duration': 840.0,
              'geometry': {
                'coordinates': [
                  [121.979, 10.648],
                  [121.990, 10.690],
                  [121.964, 10.723],
                ],
              },
            },
          ],
        };
        return http.Response(jsonEncode(mockResponse), 200, headers: {'content-type': 'application/json'});
      });

      final service = RoadRoutingService(client: mockClient);
      final routes = await service.fetchRoadRoutes(
        from: const LatLng(10.648, 121.979),
        to: const LatLng(10.723, 121.964),
      );

      expect(routes.length, 2);
      expect(routes[0].isPrimary, isTrue);
      expect(routes[0].formattedDistance, '9.4 km');
      expect(routes[0].formattedEta, '9 mins');
      expect(routes[0].polylinePoints.length, 3);

      expect(routes[1].isPrimary, isFalse);
      expect(routes[1].formattedDistance, '13.2 km');
      expect(routes[1].formattedEta, '14 mins');
    });

    test('falls back gracefully to direct estimated road path if network fails', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Server Error', 500);
      });

      final service = RoadRoutingService(client: mockClient);
      final routes = await service.fetchRoadRoutes(
        from: const LatLng(10.648, 121.979),
        to: const LatLng(10.723, 121.964),
      );

      expect(routes.isNotEmpty, isTrue);
      expect(routes.first.distanceKm, greaterThan(0));
      expect(routes.first.durationMinutes, greaterThan(0));
      expect(routes.first.polylinePoints.length, greaterThan(2));
    });
  });
}
