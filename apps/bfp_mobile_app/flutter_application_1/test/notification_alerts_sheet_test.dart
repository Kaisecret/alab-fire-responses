import 'package:flutter/material.dart';
import 'dart:io';
import 'package:flutter_application_1/screens/notification_alerts_sheet.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter_application_1/services/mobile_dispatch_store.dart';
import 'package:flutter_application_1/widgets/app_header.dart';
import 'package:flutter_test/flutter_test.dart';

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

  testWidgets('NotificationAlertsSheet displays header, filter pills and system telemetry', (tester) async {
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

    final store = MobileDispatchStore(api: MobileBfpApi(), session: session);

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
    expect(find.text('Live Dispatch Telemetry Active'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Dispatches'), findsOneWidget);
    expect(find.text('System'), findsOneWidget);
    expect(find.text('BFP Station Bravo on High Readiness'), findsOneWidget);
  });

  test('dispatch alert cards constrain long references and status labels on narrow phones', () {
    final root = Directory.current.path;
    final sheet = File('$root/lib/screens/notification_alerts_sheet.dart').readAsStringSync();

    expect(sheet, contains('maxWidth: 112'));
    expect(sheet, contains('overflow: TextOverflow.ellipsis'));
    expect(sheet, contains('maxLines: 1'));
  });
}
