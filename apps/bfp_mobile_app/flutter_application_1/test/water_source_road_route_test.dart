import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_application_1/services/road_routing_service.dart';

void main() {
  test(
    'uses one OSRM driving geometry from the BFP GPS to a hydrant',
    () async {
      final client = MockClient((request) async {
        expect(request.url.queryParameters['alternatives'], 'false');
        expect(request.url.path, contains('121.9631,10.8306;121.964,10.831'));
        return http.Response(
          jsonEncode({
            'code': 'Ok',
            'routes': [
              {
                'distance': 1100,
                'duration': 180,
                'geometry': {
                  'coordinates': [
                    [121.9631, 10.8306],
                    [121.9625, 10.8320],
                    [121.964, 10.831],
                  ],
                },
              },
            ],
          }),
          200,
        );
      });

      final routes = await RoadRoutingService(client: client).fetchRoadRoutes(
        from: const LatLng(10.8306, 121.9631),
        to: const LatLng(10.831, 121.964),
        includeAlternatives: false,
      );

      expect(routes, hasLength(1));
      expect(routes.single.polylinePoints, [
        const LatLng(10.8306, 121.9631),
        const LatLng(10.832, 121.9625),
        const LatLng(10.831, 121.964),
      ]);
    },
  );

  test('does not invent a straight route when roads are unavailable', () async {
    final client = MockClient((_) async => http.Response('Unavailable', 503));
    final routes = await RoadRoutingService(client: client).fetchRoadRoutes(
      from: const LatLng(10.8306, 121.9631),
      to: const LatLng(10.831, 121.964),
      includeAlternatives: false,
    );
    expect(routes, isEmpty);
  });
}
