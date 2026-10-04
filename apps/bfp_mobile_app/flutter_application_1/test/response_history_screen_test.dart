import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/screens/response_history_screen.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter_application_1/services/mobile_dispatch_store.dart';
import 'package:flutter_application_1/widgets/liquid_bottom_nav.dart';

class _FakeMobileBfpApi extends MobileBfpApi {
  _FakeMobileBfpApi(this.resolvedAssignments);

  final List<MobileDispatchAssignment> resolvedAssignments;

  @override
  Future<List<MobileDispatchAssignment>> listResolvedAssignments(String token) async =>
      resolvedAssignments;
}

void main() {
  const session = MobileBfpSession(
    token: 'test-token',
    mustChangePassword: false,
    identity: MobileBfpIdentity(
      userId: 'user-1',
      displayName: 'FO1 Juan',
      municipalityId: 'muni-1',
      municipalityName: 'San Jose',
      assignmentRole: 'MUNICIPAL_STAFF',
    ),
  );

  final houseFire = MobileDispatchAssignment.fromJson(<String, dynamic>{
    'dispatchId': 'dispatch-1',
    'recipientStatus': 'COMPLETED',
    'referenceNumber': 'FIRE-001',
    'fireType': 'HOUSE_BUILDING',
    'reportStatus': 'RESOLVED',
    'latitude': 10.74,
    'longitude': 121.94,
    'stationName': 'San Jose Station',
    'barangay': 'Funda-Dalipe',
    'municipality': 'San Jose',
    'landmark': 'Near the plaza',
    'assignedAt': '2026-10-01T08:00:00.000Z',
    'enRouteAt': '2026-10-01T08:02:00.000Z',
    'onSceneAt': '2026-10-01T08:10:30.000Z',
    'completedAt': '2026-10-01T09:15:00.000Z',
    'arrivalMethod': 'AUTO_GEOFENCE',
    'levelOfDanger': 'HIGH',
    'dangerScore': 72,
    'responseSeconds': 630,
  });

  final grassFire = MobileDispatchAssignment.fromJson(<String, dynamic>{
    'dispatchId': 'dispatch-2',
    'recipientStatus': 'COMPLETED',
    'referenceNumber': 'FIRE-002',
    'fireType': 'GRASS_FOREST',
    'reportStatus': 'RESOLVED',
    'latitude': 10.75,
    'longitude': 121.95,
    'stationName': 'San Jose Station',
    'barangay': 'Atabay',
    'municipality': 'San Jose',
    'assignedAt': '2026-09-20T08:00:00.000Z',
    'completedAt': '2026-09-20T10:00:00.000Z',
  });

  Future<void> pumpHistory(WidgetTester tester, List<MobileDispatchAssignment> rows) async {
    final store = MobileDispatchStore(api: _FakeMobileBfpApi(rows), session: session);
    await tester.pumpWidget(MaterialApp(
      home: ResponseHistoryScreen(session: session, dispatchStore: store),
    ));
    await tester.pumpAndSettle();
  }

  testWidgets('shows an empty state when the responder has no finished incidents', (tester) async {
    await pumpHistory(tester, const []);

    expect(find.text('Response History'), findsOneWidget);
    expect(find.text('No response history yet'), findsOneWidget);
  });

  testWidgets('cards show Level of Danger and response time from the server', (tester) async {
    await pumpHistory(tester, [houseFire, grassFire]);

    expect(find.text('FIRE-001'), findsOneWidget);
    expect(find.text('HIGH'), findsOneWidget);
    expect(find.text('Response 10 min 30 s'), findsOneWidget);
    // An old record without an arrival time never shows a made-up number.
    expect(find.text('FIRE-002'), findsOneWidget);
    expect(find.text('NOT RATED'), findsOneWidget);
    expect(find.text('Response not recorded'), findsOneWidget);
  });

  testWidgets('search by reference number narrows the list', (tester) async {
    await pumpHistory(tester, [houseFire, grassFire]);

    await tester.enterText(find.byType(TextField), 'fire-002');
    await tester.pumpAndSettle();

    expect(find.text('FIRE-001'), findsNothing);
    expect(find.text('FIRE-002'), findsOneWidget);
  });

  testWidgets('fire type filter narrows the list', (tester) async {
    await pumpHistory(tester, [houseFire, grassFire]);

    await tester.tap(find.widgetWithText(ChoiceChip, 'GRASS FOREST'));
    await tester.pumpAndSettle();

    expect(find.text('FIRE-001'), findsNothing);
    expect(find.text('FIRE-002'), findsOneWidget);
  });

  testWidgets('details show the response timeline and the danger score', (tester) async {
    await pumpHistory(tester, [houseFire, grassFire]);

    await tester.tap(find.text('FIRE-001'));
    await tester.pumpAndSettle();

    expect(find.text('Response Timeline'), findsOneWidget);
    expect(find.text('Dispatched'), findsOneWidget);
    expect(find.text('En Route'), findsOneWidget);
    expect(find.text('Arrived · GPS'), findsOneWidget);
    expect(find.text('Resolved'), findsOneWidget);
    expect(find.text('High · 72/100'), findsOneWidget);
    expect(find.text('Near the plaza'), findsOneWidget);
  });

  testWidgets('details mark missing steps as not recorded', (tester) async {
    await pumpHistory(tester, [grassFire]);

    await tester.tap(find.text('FIRE-002'));
    await tester.pumpAndSettle();

    expect(find.text('Arrived'), findsOneWidget);
    expect(find.text('Not recorded'), findsNWidgets(2));
    expect(find.text('Not rated'), findsOneWidget);
  });

  testWidgets('bottom navigation names the tab History', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: LiquidBottomNavBar(currentIndex: 3, onTap: (_) {})),
    ));

    expect(find.text('History'), findsOneWidget);
    expect(find.text('Reports'), findsNothing);
  });
}
