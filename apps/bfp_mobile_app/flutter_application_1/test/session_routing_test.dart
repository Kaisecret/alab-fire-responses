import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_application_1/main.dart';
import 'package:flutter_application_1/screens/login_screen.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

const _session = MobileBfpSession(
  token: 'session-token',
  mustChangePassword: false,
  identity: MobileBfpIdentity(
    userId: 'user-1',
    displayName: 'Maria Santos',
    municipalityId: 'municipality-1',
    municipalityName: 'San Jose de Buenavista',
    assignmentRole: 'MUNICIPAL_STAFF',
  ),
);

void main() {
  test(
    'mobile session reads the signed profile photo URL from the backend',
    () {
      final session = MobileBfpSession.fromJson({
        'token': 'session-token',
        'mustChangePassword': false,
        'identity': {
          'userId': 'user-1',
          'displayName': 'Maria Santos',
          'municipalityId': 'municipality-1',
          'municipalityName': 'San Jose de Buenavista',
          'assignmentRole': 'MUNICIPAL_STAFF',
          'profilePhotoUrl': 'https://storage.example.test/avatar.webp',
        },
      });

      expect(
        session.identity.profilePhotoUrl,
        'https://storage.example.test/avatar.webp',
      );
    },
  );

  testWidgets('saved-account startup uses the horizontal ALAB logo', (
    tester,
  ) async {
    final restorer = Completer<MobileBfpSession?>();

    await tester.pumpWidget(
      MaterialApp(
        home: AppStartupScreen(sessionRestorer: () => restorer.future),
      ),
    );

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Image &&
            widget.image is AssetImage &&
            (widget.image as AssetImage).assetName ==
                'assets/images/logo_alab.png',
      ),
      findsOneWidget,
    );

    restorer.complete(_session);
    await tester.pump();
  });

  testWidgets('saved account opens home without the plain ALAB loader', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AppStartupScreen(sessionRestorer: () async => _session),
      ),
    );
    await tester.pump();

    expect(find.byType(MainNavigationShell), findsOneWidget);
    expect(find.text('ALAB'), findsNothing);
  });

  testWidgets('returning personnel login goes directly to home', (
    tester,
  ) async {
    final api = MobileBfpApi(
      client: MockClient(
        (_) async => http.Response(
          '{"token":"session-token","mustChangePassword":false,"identity":{"userId":"user-1","displayName":"Maria Santos","municipalityId":"municipality-1","municipalityName":"San Jose de Buenavista","assignmentRole":"MUNICIPAL_STAFF"}}',
          200,
        ),
      ),
      baseUrl: 'https://example.test',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(api: api, saveToken: (_) async {}),
      ),
    );
    await tester.enterText(find.byType(TextField).at(0), 'maria@bfp.gov.ph');
    await tester.enterText(find.byType(TextField).at(1), 'secure-password');
    final loginButton = find.text('BFP LOGIN');
    await tester.ensureVisible(loginButton);
    await tester.tap(loginButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.byType(MainNavigationShell), findsOneWidget);
    expect(find.text('Terms & Conditions'), findsNothing);
  });

  testWidgets(
    'a logged-out returning user goes to login instead of onboarding',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: AppStartupScreen(
            sessionRestorer: () async => null,
            hasCompletedOnboarding: () async => true,
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(LoginScreen), findsOneWidget);
    },
  );
}
