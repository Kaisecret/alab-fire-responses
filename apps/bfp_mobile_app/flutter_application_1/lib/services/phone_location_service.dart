import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

class PhoneLocationException implements Exception {
  const PhoneLocationException(this.message);
  final String message;
}

/// Acquires a fresh phone position. Never substitutes a station or old fix.
class PhoneLocationService {
  Future<LatLng> currentPosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const PhoneLocationException(
        'Turn on phone location, then retry the route.',
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      throw const PhoneLocationException(
        'Allow location access in your phone settings, then retry.',
      );
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.unableToDetermine) {
      throw const PhoneLocationException(
        'Allow location access to route from your current position.',
      );
    }
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      return LatLng(position.latitude, position.longitude);
    } catch (_) {
      throw const PhoneLocationException(
        'Unable to get your current location. Move to an open area and retry.',
      );
    }
  }
}
