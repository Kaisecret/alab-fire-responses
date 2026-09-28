import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_application_1/services/municipality_map_view.dart';
import 'package:flutter_application_1/services/water_source_store.dart';

MobileWaterSource source(
  String id,
  String municipality,
  double lat,
  double lon,
) => MobileWaterSource(
  id: id,
  municipalityName: municipality,
  exactLocation: id,
  sourceKind: 'FIRE_HYDRANT',
  latitude: lat,
  longitude: lon,
);

void main() {
  test('opens each signed-in municipality at its own seat', () {
    expect(municipalityCenter('Belison'), const LatLng(10.8306, 121.9631));
    expect(municipalityCenter('Culasi'), const LatLng(11.4261, 122.0556));
    expect(
      municipalityCenter(' san jose de buenavista '),
      const LatLng(10.7431, 121.9394),
    );
  });

  test(
    'frames local sources without including other towns or misplaced pins',
    () {
      final points = municipalityMapPoints('Belison', [
        source('belison', 'Belison', 10.831, 121.964),
        source('other', 'Barbaza', 11.1914, 122.0444),
        source('misplaced', 'Belison', 11.7, 122.1),
      ]);

      expect(points, [
        const LatLng(10.8306, 121.9631),
        const LatLng(10.831, 121.964),
      ]);
    },
  );

  test('keeps the municipal seat when there are no saved sources', () {
    expect(municipalityMapPoints('Caluya', const []), [
      const LatLng(11.9431, 121.4722),
    ]);
  });
}
