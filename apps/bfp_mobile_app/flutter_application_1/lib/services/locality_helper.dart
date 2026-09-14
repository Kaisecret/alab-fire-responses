class LocalityHelper {
  /// Resolves and formats the real Barangay name directly from the database.
  /// Never hardcodes a fixed barangay name when one is not provided.
  static String resolveBarangay({
    String? rawBarangay,
    String? municipality,
    required double latitude,
    required double longitude,
  }) {
    if (rawBarangay != null && rawBarangay.trim().isNotEmpty) {
      var clean = rawBarangay.trim();

      // If address label contains commas (e.g. "Badiang, San Jose de Buenavista, Antique"), extract barangay part
      if (clean.contains(',')) {
        clean = clean.split(',').first.trim();
      }

      final lower = clean.toLowerCase();
      if (lower.startsWith('brgy.') || lower.startsWith('brgy ') || lower.startsWith('barangay ')) {
        return _withMunicipality(clean, municipality);
      }
      return _withMunicipality('Brgy. $clean', municipality);
    }

    // If database record does not have a barangay specified, return coordinates or unassigned
    if (latitude != 0 && longitude != 0) {
      return '${latitude.toStringAsFixed(4)}, ${longitude.toStringAsFixed(4)}';
    }
    return 'Brgy. Unassigned';
  }

  static String _withMunicipality(String barangay, String? municipality) {
    final cleanMunicipality = municipality?.trim();
    return cleanMunicipality == null || cleanMunicipality.isEmpty
        ? barangay
        : '$barangay, $cleanMunicipality';
  }
}
