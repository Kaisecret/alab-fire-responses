import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mobile navigation uses phone GPS and never draws station or straight-line routes', () {
    final root = Directory.current.path;
    final store = File('$root/lib/services/mobile_dispatch_store.dart').readAsStringSync();
    final map = File('$root/lib/screens/map_screen.dart').readAsStringSync();
    final routing = File('$root/lib/services/road_routing_service.dart').readAsStringSync();

    expect(store, isNot(contains('assignment.stationLatitude')));
    expect(map, isNot(contains('stationPoint')));
    expect(map, isNot(contains('Assigned Station Pin')));
    expect(map, isNot(contains('Direct connector fallback')));
    expect(routing, isNot(contains('_generateInterpolatedPath')));
    expect(map, contains('distanceMeters < 5'));
  });
}
