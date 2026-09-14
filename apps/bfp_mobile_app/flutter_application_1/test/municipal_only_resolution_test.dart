import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('BFP mobile map does not offer incident resolution', () {
    final root = Directory.current.path;
    final map = File('$root/lib/screens/map_screen.dart').readAsStringSync();
    final incidents = File('$root/lib/screens/incidents_screen.dart').readAsStringSync();

    expect(map, isNot(contains('_promptResolveFire')));
    expect(map, isNot(contains('resolveDispatchIncident')));
    expect(map, isNot(contains('Fire Resolved')));
    expect(incidents, isNot(contains('resolveDispatchIncident')));
  });
}
