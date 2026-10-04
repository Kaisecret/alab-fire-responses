import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/screens/incident_detail_sheet.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';

void main() {
  const sampleAssignment = MobileDispatchAssignment(
    dispatchId: 'disp-202',
    recipientStatus: 'COMPLETED',
    referenceNumber: 'INC-2026-0831-777',
    fireType: 'COMMERCIAL_FIRE',
    reportStatus: 'RESOLVED',
    latitude: 10.7450,
    longitude: 121.9300,
    barangay: 'Brgy. Funda-Dalipe',
    municipality: 'San Jose',
    landmark: 'Near Gaisano Grand',
    stationName: 'San Jose Fire Station',
    stationLatitude: 10.7420,
    stationLongitude: 121.9270,
  );

  testWidgets('IncidentDetailSheet links to Response History and has no personal report form', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => IncidentDetailSheet.show(
                context,
                assignment: sampleAssignment,
              ),
              child: const Text('Open Details'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Details'));
    await tester.pumpAndSettle();

    // 1. Verify header & dossier details
    expect(find.text('INC-2026-0831-777'), findsWidgets);
    expect(find.text('COMMERCIAL FIRE'), findsWidgets);
    expect(find.text('RESOLVED'), findsWidgets);

    // 2. Verify unauthorized buttons are removed
    expect(find.text('Update Status'), findsNothing);
    expect(find.text('Comms / Dispatch'), findsNothing);

    // 3. Responders do not write incident reports in the mobile app; the
    //    paper keeps report generation with authorized personnel on the web.
    expect(find.text('Create Incident Report'), findsNothing);
    expect(find.text('BFP INCIDENT REPORTING'), findsNothing);

    // 4. The sheet still links to the read-only Response History tab.
    final historyBtn = find.text('View Response History');
    await tester.ensureVisible(historyBtn);
    await tester.pumpAndSettle();
    expect(historyBtn, findsOneWidget);
  });

  testWidgets('View Response History closes the sheet and opens the History tab', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    int? openedTab;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => IncidentDetailSheet.show(
                context,
                assignment: sampleAssignment,
                onNavigateTab: (index) => openedTab = index,
              ),
              child: const Text('Open Details'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Details'));
    await tester.pumpAndSettle();
    final historyBtn = find.text('View Response History');
    await tester.ensureVisible(historyBtn);
    await tester.pumpAndSettle();
    await tester.tap(historyBtn);
    await tester.pumpAndSettle();

    expect(openedTab, 3);
    expect(find.text('View Response History'), findsNothing);
  });
}
