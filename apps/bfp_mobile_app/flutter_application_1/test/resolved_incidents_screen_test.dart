import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/screens/resolved_incidents_screen.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter_application_1/services/mobile_dispatch_store.dart';

class _FakeMobileBfpApi extends MobileBfpApi {
  _FakeMobileBfpApi({this.resolvedAssignments = const []});

  final List<MobileDispatchAssignment> resolvedAssignments;

  @override
  Future<List<MobileDispatchAssignment>> listResolvedAssignments(String token) async {
    return resolvedAssignments;
  }

  @override
  Future<Map<String, dynamic>> fetchDispatchesPayload(String token) async {
    return {
      'assignments': <Map<String, dynamic>>[],
      'resolvedCount': resolvedAssignments.length,
    };
  }
}

void main() {
  const session = MobileBfpSession(
    token: 'test-token',
    mustChangePassword: false,
    identity: MobileBfpIdentity(
      userId: 'user-1',
      displayName: 'Capt. Juan',
      municipalityId: 'muni-1',
      municipalityName: 'San Jose',
      assignmentRole: 'MUNICIPAL_STAFF',
    ),
  );

  const sampleAssignment = MobileDispatchAssignment(
    dispatchId: 'disp-101',
    recipientStatus: 'COMPLETED',
    referenceNumber: 'INC-2026-0831-001',
    fireType: 'STRUCTURE_FIRE',
    reportStatus: 'RESOLVED',
    latitude: 10.7431,
    longitude: 121.9284,
    barangay: 'Brgy. San Angel',
    municipality: 'San Jose',
    landmark: 'Near Public Market',
    stationName: 'San Jose Central Fire Station',
    stationLatitude: 10.7420,
    stationLongitude: 121.9270,
  );

  testWidgets('displays empty state when there are no resolved incidents', (tester) async {
    final fakeApi = _FakeMobileBfpApi(resolvedAssignments: []);
    final store = MobileDispatchStore(api: fakeApi, session: session);

    await tester.pumpWidget(
      MaterialApp(
        home: ResolvedIncidentsScreen(
          session: session,
          dispatchStore: store,
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Resolved Incidents'), findsOneWidget);
    expect(find.text('No Resolved Incidents Yet'), findsOneWidget);
  });

  testWidgets('renders resolved incident cards with status, type, and location', (tester) async {
    final fakeApi = _FakeMobileBfpApi(resolvedAssignments: [sampleAssignment]);
    final store = MobileDispatchStore(api: fakeApi, session: session);

    await tester.pumpWidget(
      MaterialApp(
        home: ResolvedIncidentsScreen(
          session: session,
          dispatchStore: store,
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Resolved Incidents'), findsOneWidget);
    expect(find.text('RESOLVED'), findsOneWidget);
    expect(find.text('STRUCTURE FIRE'), findsOneWidget);
    expect(find.text('INC-2026-0831-001'), findsOneWidget);
    expect(find.text('Brgy. San Angel, San Jose'), findsOneWidget);
    expect(find.text('Tactical Map'), findsOneWidget);
    expect(find.text('View Report'), findsOneWidget);
  });
}
