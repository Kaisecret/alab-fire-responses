import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('dispatch fallback refresh runs every five seconds', () {
    final root = Directory.current.path;
    final store = File('$root/lib/services/mobile_dispatch_store.dart').readAsStringSync();

    expect(store, contains('Timer.periodic(const Duration(seconds: 5)'));
  });
}
