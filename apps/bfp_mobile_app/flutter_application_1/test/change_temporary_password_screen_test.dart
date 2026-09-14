import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/main.dart';
import 'package:flutter_application_1/screens/change_temporary_password_screen.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';

void main() {
  const session = MobileBfpSession(
    token: 'temporary-session-token',
    mustChangePassword: true,
    identity: MobileBfpIdentity(
      userId: 'personnel-id',
      displayName: 'FO1 Juan Dela Cruz',
      municipalityId: 'municipality-id',
      municipalityName: 'San Jose de Buenavista',
      assignmentRole: 'MUNICIPAL_STAFF',
    ),
  );

  testWidgets(
    'temporary password replacement requires matching new passwords',
    (tester) async {
      var completed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeTemporaryPasswordScreen(
            session: session,
            changePassword:
                ({required currentPassword, required nextPassword}) async {
                  expect(currentPassword, 'ALAB-temporary-password');
                  expect(nextPassword, 'New-secure-password');
                  return MobileBfpSession(
                    token: 'refreshed-session-token',
                    mustChangePassword: false,
                    identity: session.identity,
                  );
                },
            onCompleted: (_) async => completed = true,
          ),
        ),
      );

      expect(find.text('Set New Password'), findsOneWidget);
      final saveButton = tester.widget<ElevatedButton>(
        find.byKey(const Key('save-new-password')),
      );
      expect(saveButton.onPressed, isNull);

      await tester.enterText(
        find.byKey(const Key('temporary-password')),
        'ALAB-temporary-password',
      );
      await tester.enterText(
        find.byKey(const Key('new-password')),
        'New-secure-password',
      );
      await tester.enterText(
        find.byKey(const Key('confirm-new-password')),
        'New-secure-password',
      );
      await tester.pump();

      expect(
        tester
            .widget<ElevatedButton>(find.byKey(const Key('save-new-password')))
            .onPressed,
        isNotNull,
      );
      await tester.ensureVisible(find.byKey(const Key('save-new-password')));
      await tester.tap(find.byKey(const Key('save-new-password')));
      await tester.pumpAndSettle();

      expect(completed, isTrue);
    },
  );

  testWidgets('password replacement goes directly to home', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ChangeTemporaryPasswordScreen(
          session: session,
          saveToken: (_) async {},
          changePassword:
              ({required currentPassword, required nextPassword}) async {
                return MobileBfpSession(
                  token: 'refreshed-session-token',
                  mustChangePassword: false,
                  identity: session.identity,
                );
              },
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const Key('temporary-password')),
      'ALAB-temporary-password',
    );
    await tester.enterText(
      find.byKey(const Key('new-password')),
      'New-secure-password',
    );
    await tester.enterText(
      find.byKey(const Key('confirm-new-password')),
      'New-secure-password',
    );
    await tester.pump();
    await tester.ensureVisible(find.byKey(const Key('save-new-password')));
    await tester.tap(find.byKey(const Key('save-new-password')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.byType(MainNavigationShell), findsOneWidget);
    expect(find.text('Terms & Conditions'), findsNothing);
  });
}
