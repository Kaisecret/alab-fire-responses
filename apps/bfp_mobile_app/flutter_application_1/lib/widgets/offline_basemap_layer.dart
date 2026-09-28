import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map_vector_tiles/flutter_map_vector_tiles.dart' as vt;
import 'package:path_provider/path_provider.dart';

import '../services/offline_basemap.dart';

const _asset = 'assets/data/antique-basemap-z15.pmtiles';
const _fileName = 'antique-basemap-20260928-z15.pmtiles';
const _archiveLength = 13256705;

Future<OfflinePmTilesProvider>? _sharedProvider;

Future<OfflinePmTilesProvider> _openBundledMap() {
  return _sharedProvider ??= _installAndOpen().catchError((Object error) {
    _sharedProvider = null;
    throw error;
  });
}

Future<OfflinePmTilesProvider> _installAndOpen() async {
  final directory = await getApplicationSupportDirectory();
  final File file = await installBundledMap(
    directory: directory,
    fileName: _fileName,
    expectedLength: _archiveLength,
    loadAsset: () => rootBundle.load(_asset),
  );
  return OfflinePmTilesProvider.open(file);
}

final vt.Theme _theme = vt.ThemeReader().read({
  'version': 8,
  'name': 'Antique offline map',
  'layers': [
    {
      'id': 'background',
      'type': 'background',
      'paint': {'background-color': '#E6F0F3'},
    },
    {
      'id': 'land',
      'type': 'fill',
      'source': 'antique',
      'source-layer': 'earth',
      'paint': {'fill-color': '#F5F4EB'},
    },
    {
      'id': 'landuse',
      'type': 'fill',
      'source': 'antique',
      'source-layer': 'landuse',
      'paint': {'fill-color': '#E7EFDE'},
    },
    {
      'id': 'water',
      'type': 'fill',
      'source': 'antique',
      'source-layer': 'water',
      'paint': {'fill-color': '#B8DCE9'},
    },
    {
      'id': 'waterways',
      'type': 'line',
      'source': 'antique',
      'source-layer': 'water',
      'paint': {'line-color': '#A4D0E3', 'line-width': 1.5},
    },
    {
      'id': 'buildings',
      'type': 'fill',
      'source': 'antique',
      'source-layer': 'buildings',
      'minzoom': 13,
      'paint': {'fill-color': '#DDDCD4'},
    },
    {
      'id': 'road-casing',
      'type': 'line',
      'source': 'antique',
      'source-layer': 'roads',
      'paint': {
        'line-color': '#D2CEC5',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          1,
          14,
          5,
        ],
      },
    },
    {
      'id': 'roads',
      'type': 'line',
      'source': 'antique',
      'source-layer': 'roads',
      'paint': {
        'line-color': '#FFFFFF',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          0.8,
          14,
          3.5,
        ],
      },
    },
    {
      'id': 'place-labels',
      'type': 'symbol',
      'source': 'antique',
      'source-layer': 'places',
      'layout': {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 13,
      },
      'paint': {
        'text-color': '#34465A',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.5,
      },
    },
    {
      'id': 'road-labels',
      'type': 'symbol',
      'source': 'antique',
      'source-layer': 'roads',
      'minzoom': 13,
      'layout': {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
      },
      'paint': {
        'text-color': '#53616B',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.5,
      },
    },
  ],
});

/// The same local basemap is used by both mobile map tabs.
class OfflineBasemapLayer extends StatefulWidget {
  const OfflineBasemapLayer({super.key});

  @override
  State<OfflineBasemapLayer> createState() => _OfflineBasemapLayerState();
}

class _OfflineBasemapLayerState extends State<OfflineBasemapLayer> {
  late Future<OfflinePmTilesProvider> _provider;

  @override
  void initState() {
    super.initState();
    _provider = _openBundledMap();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<OfflinePmTilesProvider>(
    future: _provider,
    builder: (context, snapshot) {
      if (snapshot.hasData) {
        return vt.VectorTileLayer(
          theme: _theme,
          tileProviders: vt.TileProviders({'antique': snapshot.requireData}),
        );
      }
      if (snapshot.hasError) {
        return Center(
          child: TextButton.icon(
            onPressed: () => setState(() => _provider = _openBundledMap()),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Map unavailable. Tap to retry.'),
          ),
        );
      }
      return const Center(child: CircularProgressIndicator());
    },
  );
}
