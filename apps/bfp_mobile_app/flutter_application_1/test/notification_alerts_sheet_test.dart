import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_application_1/screens/notification_alerts_sheet.dart';
import 'package:flutter_application_1/screens/response_history_screen.dart' show formatHistoryDateTime;
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter_application_1/services/mobile_dispatch_store.dart';
import 'package:flutter_application_1/widgets/app_header.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('AppHeader displays dynamic notification count badge', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AppHeader(
            notificationCount: 5,
          ),
        ),
      ),
    );

    expect(find.text('5'), findsOneWidget);
    expect(find.byIcon(Icons.notifications_rounded), findsOneWidget);
  });

  testWidgets('notifications list the real dispatch queue with its dispatch time and no sample alerts', (tester) async {
    final session = const MobileBfpSession(
      token: 'test-token',
      identity: MobileBfpIdentity(
        userId: 'usr-1',
        displayName: 'FO1 Juan Dela Cruz',
        municipalityId: 'san-jose',
        municipalityName: 'San Jose de Buenavista',
        assignmentRole: 'FIREFIGHTER',
      ),
      mustChangePassword: false,
    );
    final assignedAt = DateTime.utc(2026, 10, 6, 7, 42);
    final api = MobileBfpApi(
      client: MockClient((request) async => http.Response(
        jsonEncode({
          'assignments': [
            {
              'dispatchId': 'dispatch-1',
              'recipientStatus': 'ASSIGNED',
              'referenceNumber': 'ALAB-REAL-1',
              'fireType': 'HOUSE_BUILDING',
              'reportStatus': 'FIRETRUCK_DISPATCHED',
              'latitude': 10.8,
              'longitude': 121.9,
              'stationName': 'San Jose Fire Station',
              'barangay': 'Mapatag',
              'municipality': 'Hamtic',
              'assignedAt': assignedAt.toIso8601String(),
            },
          ],
          'resolvedCount': 0,
        }),
        200,
      )),
    );
    final store = MobileDispatchStore(api: api, session: session);
    await store.refresh();

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: NotificationAlertsSheet(
            dispatchStore: store,
          ),
        ),
      ),
    );

    expect(find.text('Notifications & Alerts'), findsOneWidget);
    expect(find.text('ALAB-REAL-1'), findsOneWidget);
    expect(find.text('FIRETRUCK DISPATCHED'), findsOneWidget, reason: 'status reads as words, not a code');
    expect(find.text('Dispatched ${formatHistoryDateTime(assignedAt)}'), findsOneWidget);
    expect(find.text('BFP San Jose de Buenavista'), findsOneWidget);
    for (final sample in [
      'System',
      'Live Dispatch Telemetry Active',
      'Antique BFP Provincial Network · Live Telemetry',
      'STATION TELEMETRY & ADVISORIES',
      'BFP Station Bravo on High Readiness',
      'Municipal Hydrants Telemetry Synced',
      'PAGASA Fire Danger Advisory',
    ]) {
      expect(find.text(sample), findsNothing, reason: '$sample is sample data');
    }
  });

  test('dispatch alert cards constrain long references and status labels on narrow phones', () {
    final root = Directory.current.path;
    final sheet = File('$root/lib/screens/notification_alerts_sheet.dart').readAsStringSync();

    expect(sheet, contains('maxWidth: 170'));
    expect(sheet, contains('overflow: TextOverflow.ellipsis'));
    expect(sheet, contains('maxLines: 1'));
  });
}
