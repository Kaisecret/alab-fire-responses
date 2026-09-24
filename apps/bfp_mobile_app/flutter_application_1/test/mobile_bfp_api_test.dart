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
