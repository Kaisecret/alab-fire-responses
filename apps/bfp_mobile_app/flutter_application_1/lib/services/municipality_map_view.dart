import 'package:latlong2/latlong.dart';

import 'water_source_store.dart';

// Municipal seats from the municipality-coordinates migration, plus San
// Remigio's station location from the fire-truck inventory migration. Keeping
// these on the phone lets both map tabs open at the assigned town offline.
const _centers = <String, LatLng>{
  'anini-y': LatLng(10.4331, 121.9128),
  'barbaza': LatLng(11.1914, 122.0444),
  'belison': LatLng(10.8306, 121.9631),
  'bugasong': LatLng(11.0453, 122.0658),
  'caluya': LatLng(11.9431, 121.4722),
  'culasi': LatLng(11.4261, 122.0556),
  'dao': LatLng(10.8461, 121.9986),
  'hamtic': LatLng(10.6969, 121.9803),
  'laua-an': LatLng(10.9861, 122.0250),
  'libertad': LatLng(11.7778, 121.9111),
  'pandan': LatLng(11.7167, 122.0969),
  'patnongon': LatLng(10.9106, 121.9781),
  'san jose de buenavista': LatLng(10.7431, 121.9394),
  'san remigio': LatLng(10.8303, 122.08875),
  'sebaste': LatLng(11.5678, 122.0719),
  'sibalom': LatLng(10.7922, 122.0103),
  'tibiao': LatLng(11.1167, 122.0833),
  'tobias fornier': LatLng(10.5178, 121.9331),
  'valderrama': LatLng(11.3167, 122.0833),
};

String _key(String? name) =>
    name?.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ') ?? '';

LatLng? municipalityCenter(String? name) {
  final key = _key(name);
  if (key.startsWith('anini')) return _centers['anini-y'];
  if (key.startsWith('laua')) return _centers['laua-an'];
  if (key.startsWith('san jose')) return _centers['san jose de buenavista'];
  if (key.startsWith('tobias')) return _centers['tobias fornier'];
  return _centers[key];
}

/// Points used for the opening camera only; every source remains on the map.
List<LatLng> municipalityMapPoints(
  String? municipalityName,
  List<MobileWaterSource> sources,
) {
  final center = municipalityCenter(municipalityName);
  if (center == null) return const [];
  final points = <LatLng>[center];
  const distance = Distance();
  for (final source in sources) {
    if (_key(source.municipalityName) != _key(municipalityName)) continue;
    final point = LatLng(source.latitude, source.longitude);
    if (distance.as(LengthUnit.Kilometer, center, point) <= 40) {
      points.add(point);
    }
  }
  return points;
}
