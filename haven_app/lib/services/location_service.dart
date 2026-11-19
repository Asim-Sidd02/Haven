import 'package:geolocator/geolocator.dart';

import 'bouncer_service.dart';

enum LocationProblem { serviceOff, denied, deniedForever }

/// Raised when we can't get a position; the UI explains and offers settings.
class LocationException implements Exception {
  final LocationProblem problem;
  const LocationException(this.problem);

  String get message => switch (problem) {
    LocationProblem.serviceOff =>
      'Location is turned off on this phone. Turn it on to check in or out.',
    LocationProblem.denied =>
      'Haven needs your location to check you in or out. Please allow it and try again.',
    LocationProblem.deniedForever =>
      'Location access is blocked for Haven. Open settings and allow location to check in or out.',
  };
}

/// Thin wrapper over geolocator used for attendance check-in / check-out.
class LocationService {
  /// Asks for permission if needed and returns the current position.
  static Future<GeoFix> currentFix() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const LocationException(LocationProblem.serviceOff);
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever) {
      throw const LocationException(LocationProblem.deniedForever);
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.unableToDetermine) {
      throw const LocationException(LocationProblem.denied);
    }
    final p = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
    return GeoFix(p.latitude, p.longitude, p.accuracy);
  }

  static Future<void> openSettings(LocationProblem problem) async {
    if (problem == LocationProblem.serviceOff) {
      await Geolocator.openLocationSettings();
    } else {
      await Geolocator.openAppSettings();
    }
  }
}
