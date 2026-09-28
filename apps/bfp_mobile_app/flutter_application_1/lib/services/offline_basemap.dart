import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:flutter_map_vector_tiles/flutter_map_vector_tiles.dart' as vt;
import 'package:path/path.dart' as path;
import 'package:pmtiles/pmtiles.dart' as pm;

/// Copies the bundled archive to durable app storage before any map reads it.
Future<File> installBundledMap({
  required Directory directory,
  required String fileName,
  required int expectedLength,
  required Future<ByteData> Function() loadAsset,
}) async {
  await directory.create(recursive: true);
  final destination = File(path.join(directory.path, fileName));
  if (await destination.exists() &&
      await destination.length() == expectedLength) {
    return destination;
  }

  final data = await loadAsset();
  if (data.lengthInBytes != expectedLength) {
    throw StateError('Bundled map is incomplete');
  }
  final temporary = File('${destination.path}.part');
  try {
    await temporary.writeAsBytes(
      data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
      flush: true,
    );
    if (await destination.exists()) await destination.delete();
    await temporary.rename(destination.path);
    return destination;
  } finally {
    if (await temporary.exists()) await temporary.delete();
  }
}

/// Reads vector tiles directly from the phone's installed PMTiles file.
class OfflinePmTilesProvider extends vt.VectorTileProvider {
  OfflinePmTilesProvider._(this._archive, this.cacheKey);

  final pm.PmTilesArchive _archive;

  static Future<OfflinePmTilesProvider> open(File archiveFile) async {
    final archive = await pm.PmTilesArchive.fromFile(archiveFile);
    return OfflinePmTilesProvider._(archive, archiveFile.path);
  }

  @override
  final String cacheKey;

  @override
  int get minimumZoom => _archive.minZoom;

  @override
  int get maximumZoom => _archive.maxZoom;

  @override
  bool get cacheBytesToDisk => false;

  @override
  Future<vt.TileResponse> load(
    vt.TileKey tile, {
    vt.CancellationToken? cancellation,
  }) async {
    if (cancellation?.isCancelled ?? false) {
      return const vt.TileResponseCancelled();
    }
    try {
      final bytes = (await _archive.tile(
        pm.ZXY(tile.z, tile.x, tile.y).toTileId(),
      )).bytes();
      if (cancellation?.isCancelled ?? false) {
        return const vt.TileResponseCancelled();
      }
      return vt.TileResponseData(Uint8List.fromList(bytes));
    } on pm.TileNotFoundException {
      return const vt.TileResponseNotFound();
    } catch (error) {
      return vt.TileResponseError(error);
    }
  }
}
