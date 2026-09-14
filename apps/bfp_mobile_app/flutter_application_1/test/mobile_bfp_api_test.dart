import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';

void main() {
  test('mobile API defaults to the ALAB production endpoint', () {
    expect(
      MobileBfpApi.productionBaseUrl,
      'https://alab-fire-responses-bynr.vercel.app',
    );
    expect(MobileBfpApi.loginPath, '/api/mobile-bfp/login');
  });

  test('mobile login response preserves a required password replacement', () {
    final session = MobileBfpSession.fromJson(<String, dynamic>{
      'token': 'signed-session-token',
      'mustChangePassword': true,
      'identity': <String, dynamic>{
        'userId': 'personnel-id',
        'displayName': 'FO1 Juan Dela Cruz',
        'municipalityId': 'municipality-id',
        'municipalityName': 'San Jose de Buenavista',
        'assignmentRole': 'MUNICIPAL_STAFF',
      },
    });

    expect(session.token, 'signed-session-token');
    expect(session.mustChangePassword, isTrue);
    expect(session.identity.displayName, 'FO1 Juan Dela Cruz');
  });

  test('dispatch assignments preserve the barangay and municipality from the server', () {
    final assignment = MobileDispatchAssignment.fromJson(<String, dynamic>{
      'dispatchId': 'dispatch-id',
      'recipientStatus': 'ASSIGNED',
      'referenceNumber': 'ALAB-20260831-0001',
      'fireType': 'HOUSE BUILDING',
      'reportStatus': 'RESPONDING',
      'latitude': 10.65,
      'longitude': 121.98,
      'stationName': 'Hamtic Fire Station',
      'barangay': 'Mapatag',
      'municipality': 'Hamtic',
    });

    expect(assignment.locationSummary, 'Brgy. Mapatag, Hamtic');
  });
}
