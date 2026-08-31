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

  testWidgets('IncidentDetailSheet renders Create Incident Report and omits Update Status', (tester) async {
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

    // 3. Verify 'Create Incident Report' button is present
    final createReportBtn = find.text('Create Incident Report');
    await tester.ensureVisible(createReportBtn);
    await tester.pumpAndSettle();
    expect(createReportBtn, findsOneWidget);

    // 4. Verify tapping 'Create Incident Report' opens reporting modal
    await tester.tap(createReportBtn);
    await tester.pumpAndSettle();

    expect(find.text('Submit Incident Report'), findsOneWidget);
    expect(find.text('FIELD RESPONSE NARRATIVE & ACTIONS TAKEN'), findsOneWidget);
  });
}
