import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

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

  test('resolved assignments keep the response timeline and Level of Danger', () {
    final assignment = MobileDispatchAssignment.fromJson(<String, dynamic>{
      'dispatchId': 'dispatch-id',
      'recipientStatus': 'COMPLETED',
      'referenceNumber': 'ALAB-20261001-0001',
      'fireType': 'HOUSE_BUILDING',
      'reportStatus': 'RESOLVED',
      'latitude': 10.65,
      'longitude': 121.98,
      'stationName': 'Hamtic Fire Station',
      'assignedAt': '2026-10-01T08:00:00.000Z',
      'enRouteAt': '2026-10-01T08:02:00.000Z',
      'onSceneAt': '2026-10-01T08:10:30.000Z',
      'completedAt': '2026-10-01T09:15:00.000Z',
      'arrivalMethod': 'MANUAL',
      'levelOfDanger': 'CRITICAL',
      'dangerScore': 91,
      'responseSeconds': 630,
    });

    expect(assignment.assignedAt, DateTime.utc(2026, 10, 1, 8));
    expect(assignment.enRouteAt, DateTime.utc(2026, 10, 1, 8, 2));
    expect(assignment.onSceneAt, DateTime.utc(2026, 10, 1, 8, 10, 30));
    expect(assignment.completedAt, DateTime.utc(2026, 10, 1, 9, 15));
    expect(assignment.arrivalMethod, 'MANUAL');
    expect(assignment.levelOfDanger, 'CRITICAL');
    expect(assignment.levelOfDangerLabel, 'Critical');
    expect(assignment.dangerScore, 91);
    expect(assignment.responseTimeLabel, '10 min 30 s');
  });

  test('response time label never guesses a missing arrival', () {
    MobileDispatchAssignment withSeconds(int? seconds) => MobileDispatchAssignment.fromJson(<String, dynamic>{
      'dispatchId': 'dispatch-id',
      'referenceNumber': 'ALAB-1',
      'responseSeconds': seconds,
    });

    expect(withSeconds(null).responseTimeLabel, 'Not recorded');
    expect(withSeconds(45).responseTimeLabel, '45 s');
    expect(withSeconds(600).responseTimeLabel, '10 min');
    expect(withSeconds(3900).responseTimeLabel, '1 h 5 min');
    expect(withSeconds(null).levelOfDangerLabel, 'Not rated');
  });

  test('mobile API downloads all Antique water sources with the bearer token', () async {
    final api = MobileBfpApi(
      baseUrl: 'https://example.test',
      client: MockClient((request) async {
        expect(request.url.path, '/api/mobile-bfp/water-sources');
        expect(request.headers['Authorization'], 'Bearer signed-token');
        return http.Response('{"sources":[{"id":"hydrant-1","municipalityName":"Hamtic","exactLocation":"Poblacion","sourceKind":"FIRE_HYDRANT","latitude":10.7,"longitude":121.98}]}', 200);
      }),
    );
    final sources = await api.listWaterSources('signed-token');
    expect(sources.single.municipalityName, 'Hamtic');
  });

  test('malformed water source snapshots are rejected before replacing the offline copy', () async {
    final api = MobileBfpApi(
      baseUrl: 'https://example.test',
      client: MockClient((_) async => http.Response('{"sources":[null]}', 200)),
    );
    await expectLater(api.listWaterSources('signed-token'), throwsA(isA<MobileBfpApiException>()));
  });
}
