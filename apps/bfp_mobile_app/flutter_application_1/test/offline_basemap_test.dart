import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_map_vector_tiles/flutter_map_vector_tiles.dart' as vt;
import 'package:flutter_application_1/services/offline_basemap.dart';

void main() {
  test(
    'installs bundled map once and keeps it across offline reopen',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'offline-map-test',
      );
      addTearDown(() => directory.delete(recursive: true));
      var loads = 0;
      Future<ByteData> load() async {
        loads++;
        return ByteData.sublistView(Uint8List.fromList([1, 2, 3, 4]));
      }

      final first = await installBundledMap(
        directory: directory,
        fileName: 'map.pmtiles',
        expectedLength: 4,
        loadAsset: load,
      );
      expect(await first.readAsBytes(), [1, 2, 3, 4]);

      final reopened = await installBundledMap(
        directory: directory,
        fileName: 'map.pmtiles',
        expectedLength: 4,
        loadAsset: load,
      );
      expect(reopened.path, first.path);
      expect(loads, 1);
    },
  );

  test('replaces an interrupted copy before reporting map ready', () async {
    final directory = await Directory.systemTemp.createTemp('offline-map-test');
    addTearDown(() => directory.delete(recursive: true));
    final incomplete = File(
      '${directory.path}${Platform.pathSeparator}map.pmtiles',
    );
    await incomplete.writeAsBytes([1]);

    final installed = await installBundledMap(
      directory: directory,
      fileName: 'map.pmtiles',
      expectedLength: 4,
      loadAsset: () async =>
          ByteData.sublistView(Uint8List.fromList([5, 6, 7, 8])),
    );
    expect(await installed.readAsBytes(), [5, 6, 7, 8]);
  });

  test('reads an Antique road map tile from the local archive', () async {
    final archive = File('assets/data/antique-basemap-z15.pmtiles');
    final provider = await OfflinePmTilesProvider.open(archive);

    final tile = await provider.load(const vt.TileKey(10, 858, 481));
    expect(tile, isA<vt.TileResponseData>());
    expect((tile as vt.TileResponseData).bytes, isNotEmpty);
    expect(provider.cacheBytesToDisk, isFalse);
  });
}
