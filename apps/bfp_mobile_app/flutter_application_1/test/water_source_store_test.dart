import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/services/water_source_store.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  sqfliteFfiInit();

  test(
    'saved Antique sources remain available when refresh fails offline',
    () async {
      var online = true;
      final store = WaterSourceStore(
        databaseFactory: databaseFactoryFfi,
        databasePath: inMemoryDatabasePath,
        fetchSources: () async {
          if (!online) throw Exception('offline');
          return [
            MobileWaterSource(
              id: 'hydrant-1',
              municipalityName: 'Hamtic',
              exactLocation: 'Poblacion',
              sourceKind: 'FIRE_HYDRANT',
              latitude: 10.7,
              longitude: 121.98,
            ),
          ];
        },
      );
      expect((await store.refresh()).single.id, 'hydrant-1');
      online = false;
      await expectLater(store.refresh(), throwsException);
      expect((await store.loadCached()).single.exactLocation, 'Poblacion');
      await store.dispose();
    },
  );

  test('a successful refresh replaces removed and updated sources', () async {
    var current = [
      const MobileWaterSource(
        id: 'old',
        municipalityName: 'Hamtic',
        exactLocation: 'Old',
        sourceKind: 'FIRE_HYDRANT',
        latitude: 10.7,
        longitude: 121.98,
      ),
    ];
    final store = WaterSourceStore(
      databaseFactory: databaseFactoryFfi,
      databasePath: inMemoryDatabasePath,
      fetchSources: () async => current,
    );
    await store.refresh();
    current = [
      const MobileWaterSource(
        id: 'new',
        municipalityName: 'Belison',
        exactLocation: 'Updated',
        sourceKind: 'WATER_SOURCE',
        latitude: 10.83,
        longitude: 121.97,
      ),
    ];
    await store.refresh();
    expect((await store.loadCached()).map((source) => source.id).toList(), [
      'new',
    ]);
    await store.dispose();
  });
}
