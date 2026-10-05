import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_application_1/screens/incident_detail_sheet.dart';
import 'package:flutter_application_1/screens/water_sources_map.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter_application_1/services/phone_location_service.dart';
import 'package:flutter_application_1/services/road_routing_service.dart';
import 'package:flutter_application_1/services/water_source_store.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:latlong2/latlong.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const hydrant = MobileWaterSource(
  id: 'near-incident',
  municipalityName: 'Belison',
  exactLocation: 'Barangay Concepcion hydrant',
  sourceKind: 'FIRE_HYDRANT',
  latitude: 10.831,
  longitude: 121.964,
);
const farSource = MobileWaterSource(
  id: 'near-station',
  municipalityName: 'San Jose de Buenavista',
  exactLocation: 'Station reservoir',
  sourceKind: 'WATER_SOURCE',
  latitude: 10.74,
  longitude: 121.94,
);
const assignment = MobileDispatchAssignment(
  dispatchId: 'dispatch-live',
  recipientStatus: 'COMPLETED',
  referenceNumber: 'FIRE-REAL-27',
  fireType: 'HOUSE_BUILDING',
  reportStatus: 'RESOLVED',
  latitude: 10.8306,
  longitude: 121.9631,
  stationName: 'San Jose Fire Station',
  municipality: 'Belison',
  barangay: 'Concepcion',
  stationLatitude: 10.74,
  stationLongitude: 121.94,
);

class MemorySources extends WaterSourceStore {
  MemorySources({
    this.cached = const [],
    this.fresh = const [farSource, hydrant],
    this.offline = false,
  }) : super(fetchSources: () async => [], databaseFactory: databaseFactoryFfi);
  final List<MobileWaterSource> cached, fresh;
  final bool offline;
  @override
  Future<List<MobileWaterSource>> loadCached() async => cached;
  @override
  Future<List<MobileWaterSource>> refresh() async {
    if (offline) throw Exception('offline');
    return fresh;
  }
}

class PhonePlatform extends GeolocatorPlatform {
  bool enabled = true;
  LocationPermission permission = LocationPermission.whileInUse;
  LocationPermission afterRequest = LocationPermission.whileInUse;
  LatLng point = const LatLng(10.829, 121.961);
  Completer<Position>? pending;
  @override
  Future<bool> isLocationServiceEnabled() async => enabled;
  @override
  Future<LocationPermission> checkPermission() async => permission;
  @override
  Future<LocationPermission> requestPermission() async => afterRequest;
  @override
  Future<Position> getCurrentPosition({
    LocationSettings? locationSettings,
  }) async =>
      pending?.future ??
      Position(
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: DateTime(2026, 10, 6),
        accuracy: 5,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );
}

void main() {
  late PhonePlatform phone;
  late GeolocatorPlatform previous;
  setUp(() {
    previous = GeolocatorPlatform.instance;
    phone = PhonePlatform();
    GeolocatorPlatform.instance = phone;
  });
  tearDown(() => GeolocatorPlatform.instance = previous);

  test(
    'nearest source is chosen from incident coordinates across municipalities',
    () {
      expect(
        nearestWaterSource([
          farSource,
          hydrant,
        ], const LatLng(10.8306, 121.9631))?.id,
        'near-incident',
      );
      expect(nearestWaterSource([], const LatLng(10.8306, 121.9631)), isNull);
    },
  );

  test('each location request uses the current phone fix', () async {
    final service = PhoneLocationService();
    expect(await service.currentPosition(), const LatLng(10.829, 121.961));
    phone.point = const LatLng(10.83, 121.963);
    expect(await service.currentPosition(), const LatLng(10.83, 121.963));
  });

  test(
    'disabled GPS and denied permissions cannot produce a location',
    () async {
      phone.enabled = false;
      await expectLater(
        PhoneLocationService().currentPosition(),
        throwsA(isA<PhoneLocationException>()),
      );
      phone.enabled = true;
      phone.permission = LocationPermission.denied;
      phone.afterRequest = LocationPermission.denied;
      await expectLater(
        PhoneLocationService().currentPosition(),
        throwsA(isA<PhoneLocationException>()),
      );
      phone.permission = LocationPermission.deniedForever;
      await expectLater(
        PhoneLocationService().currentPosition(),
        throwsA(isA<PhoneLocationException>()),
      );
    },
  );

  testWidgets(
    'details show the actual nearest registered source on a narrow phone',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: IncidentDetailSheet(
              assignment: assignment,
              waterSourceStore: MemorySources(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Nearest water source'), 200, scrollable: find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first);
      expect(find.text('Barangay Concepcion hydrant'), findsOneWidget);
      expect(find.text('Station reservoir'), findsNothing);
      expect(find.textContaining('PSI'), findsNothing);
      expect(find.text('OPERATIONAL'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('offline details label cached sources and empty data honestly', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: IncidentDetailSheet(
            assignment: assignment,
            waterSourceStore: MemorySources(cached: [hydrant], offline: true),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Nearest water source'), 200, scrollable: find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first);
    expect(find.text('Barangay Concepcion hydrant'), findsOneWidget);
    expect(find.text('Offline · saved water-source locations'), findsOneWidget);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: IncidentDetailSheet(
            key: const ValueKey('empty'),
            assignment: assignment,
            waterSourceStore: MemorySources(fresh: []),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Nearest water source'), 200, scrollable: find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first);
    expect(
      find.text('No water sources have been registered yet.'),
      findsOneWidget,
    );
  });

  testWidgets(
    'water-source driving route starts from fresh GPS despite station and old phone coordinates',
    (tester) async {
      Uri? requested;
      final client = MockClient((request) async {
        requested = request.url;
        return http.Response(
          jsonEncode({
            'code': 'Ok',
            'routes': [
              {
                'distance': 1500,
                'duration': 240,
                'geometry': {
                  'coordinates': [
                    [121.961, 10.829],
                    [121.964, 10.831],
                  ],
                },
              },
            ],
          }),
          200,
        );
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WaterSourcesMap(
              api: MobileBfpApi(),
              token: 'test',
              municipalityName: 'Belison',
              initialSource: hydrant,
              stationPosition: const LatLng(10.74, 121.94),
              responderPosition: const LatLng(10.8, 121.95),
              routingService: RoadRoutingService(client: client),
              waterSourceStore: MemorySources(),
            ),
          ),
        ),
      );
      for (var frame = 0; frame < 5; frame++) { await tester.pump(const Duration(milliseconds: 100)); }
      expect(
        requested?.path,
        '/route/v1/driving/121.961,10.829;121.964,10.831',
      );
      expect(find.text('Road route · 1.5 km · 4 mins'), findsOneWidget);
      final lines = tester.widget<PolylineLayer>(find.byType(PolylineLayer));
      expect(lines.polylines.last.points.first, const LatLng(10.829, 121.961));
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('GPS failure shows retry and never routes from the station', (
    tester,
  ) async {
    phone.enabled = false;
    Uri? requested;
    final client = MockClient((request) async {
      requested = request.url;
      return http.Response('{}', 200);
    });
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: WaterSourcesMap(
            api: MobileBfpApi(),
            token: 'test',
            municipalityName: 'Belison',
            initialSource: hydrant,
            stationPosition: const LatLng(10.74, 121.94),
            routingService: RoadRoutingService(client: client),
            waterSourceStore: MemorySources(),
          ),
        ),
      ),
    );
    for (var frame = 0; frame < 5; frame++) { await tester.pump(const Duration(milliseconds: 100)); }
    expect(requested, isNull);
    expect(find.byType(PolylineLayer), findsNothing);
    expect(
      find.text('Turn on phone location, then retry the route.'),
      findsOneWidget,
    );
    expect(find.text('Retry road route'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
