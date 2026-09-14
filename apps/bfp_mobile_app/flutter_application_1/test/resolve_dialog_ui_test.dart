import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('map and incident tabs share the balanced resolve dialog', () {
    final root = Directory.current.path;
    final map = File('$root/lib/screens/map_screen.dart').readAsStringSync();
    final incidents = File('$root/lib/screens/incidents_screen.dart').readAsStringSync();
    final dialog = File('$root/lib/widgets/resolve_incident_dialog.dart');

    expect(dialog.existsSync(), isTrue);
    expect(map, contains('ResolveIncidentDialog.show'));
    expect(incidents, contains('ResolveIncidentDialog.show'));
    expect(dialog.readAsStringSync(), contains('Expanded'));
    expect(dialog.readAsStringSync(), contains('Cancel'));
    expect(dialog.readAsStringSync(), contains('Yes, Resolved'));
  });
}
