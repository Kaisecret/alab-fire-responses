import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mobile operational screens use live dispatch assignments instead of demo incidents', () {
    final root = Directory.current.path;
    final main = File('$root/lib/main.dart').readAsStringSync();
    final home = File('$root/lib/screens/home_dashboard_screen.dart').readAsStringSync();
    final map = File('$root/lib/screens/map_screen.dart').readAsStringSync();
    final api = File('$root/lib/services/mobile_bfp_api.dart').readAsStringSync();

    expect(File('$root/lib/services/mobile_dispatch_store.dart').existsSync(), isTrue);
    expect(main, contains('registerDevice'));
    expect(home, contains('MobileDispatchStore'));
    expect(map, contains('FlutterMap'));
    expect(map, contains('assignment.latitude'));
    expect(api, contains('/api/mobile-bfp/devices'));
    expect(home, isNot(contains("Structure Fire'")));
  });
}
