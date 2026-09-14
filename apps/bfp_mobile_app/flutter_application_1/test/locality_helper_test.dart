import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/services/locality_helper.dart';

void main() {
  group('LocalityHelper', () {
    test('strictly preserves the real Barangay name from the database', () {
      expect(
        LocalityHelper.resolveBarangay(rawBarangay: 'Badiang', latitude: 10.74, longitude: 121.95),
        equals('Brgy. Badiang'),
      );
      expect(
        LocalityHelper.resolveBarangay(rawBarangay: 'San Angel', latitude: 10.73, longitude: 121.96),
        equals('Brgy. San Angel'),
      );
      expect(
        LocalityHelper.resolveBarangay(rawBarangay: 'Barangay 4', latitude: 10.75, longitude: 121.94),
        equals('Barangay 4'),
      );
      expect(
        LocalityHelper.resolveBarangay(rawBarangay: 'Brgy. Mojon', latitude: 10.72, longitude: 121.96),
        equals('Brgy. Mojon'),
      );
    });

    test('extracts real barangay from database address label if compound string', () {
      expect(
        LocalityHelper.resolveBarangay(
          rawBarangay: 'Funda-Dalipe, San Jose de Buenavista, Antique',
          latitude: 10.74,
          longitude: 121.94,
        ),
        equals('Brgy. Funda-Dalipe'),
      );
    });

    test('shows the municipality beside the assigned barangay', () {
      expect(
        LocalityHelper.resolveBarangay(
          rawBarangay: 'Mapatag',
          municipality: 'Hamtic',
          latitude: 10.65,
          longitude: 121.98,
        ),
        equals('Brgy. Mapatag, Hamtic'),
      );
    });

    test('never defaults or hardcodes Maybato Norte when database barangay is null', () {
      final result = LocalityHelper.resolveBarangay(
        rawBarangay: null,
        latitude: 10.65,
        longitude: 121.98,
      );
      expect(result.contains('Maybato'), isFalse);
      expect(result, equals('10.6500, 121.9800'));
    });
  });
}
