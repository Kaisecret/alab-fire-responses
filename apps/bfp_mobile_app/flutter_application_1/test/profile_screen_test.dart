import 'package:flutter_application_1/screens/profile_screen.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const session = MobileBfpSession(
    token: 'session-token',
    mustChangePassword: false,
    identity: MobileBfpIdentity(
      userId: 'personnel-1',
      displayName: 'Maria Santos',
      email: 'maria.santos@bfp.gov.ph',
      rankOrPosition: 'Fire Officer II',
      municipalityId: 'municipality-1',
      municipalityName: 'San Jose de Buenavista',
      stationName: 'BFP San Jose Fire Station',
      assignmentRole: 'MUNICIPAL_STAFF',
    ),
  );

  testWidgets('shows the signed-in personnel profile instead of demo data', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(session: session, onSessionChanged: (_) {}),
      ),
    );

    expect(find.text('Maria Santos'), findsOneWidget);
    expect(find.text('Fire Officer II'), findsOneWidget);
    expect(find.text('BFP San Jose Fire Station'), findsOneWidget);
    expect(find.text('Municipal Staff'), findsOneWidget);
    expect(find.text('Juan Dela Cruz'), findsNothing);
  });

  testWidgets(
    'cancelling personal information edit returns to settings safely',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ProfileScreen(session: session, onSessionChanged: (_) {}),
        ),
      );

      await tester.tap(find.text('Personal Information'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();

      expect(find.text('Personal Information'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('uses the backend profile photo instead of static initials', (
    tester,
  ) async {
    const photoUrl = 'https://storage.example.test/personnel-photo.webp';
    final sessionWithPhoto = MobileBfpSession(
      token: session.token,
      mustChangePassword: false,
      identity: MobileBfpIdentity(
        userId: session.identity.userId,
        displayName: session.identity.displayName,
        email: session.identity.email,
        rankOrPosition: session.identity.rankOrPosition,
        municipalityId: session.identity.municipalityId,
        municipalityName: session.identity.municipalityName,
        stationName: session.identity.stationName,
        profilePhotoUrl: photoUrl,
        assignmentRole: session.identity.assignmentRole,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(
          session: sessionWithPhoto,
          onSessionChanged: (_) {},
        ),
      ),
    );

    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Image &&
            widget.image is NetworkImage &&
            (widget.image as NetworkImage).url == photoUrl,
      ),
      findsOneWidget,
    );
  });

  testWidgets('explains the supported profile-photo formats and size clearly', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(session: session, onSessionChanged: (_) {}),
      ),
    );

    await tester.tap(find.text('Personal Information'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Change Profile Picture'));
    await tester.pumpAndSettle();

    expect(
      find.text('Please choose a JPG, PNG, or WebP image that is smaller than 5 MB.'),
      findsOneWidget,
    );
    expect(find.textContaining('clear photo'), findsNothing);
  });

  testWidgets(
    'saving personal information closes the screen without an error',
    (tester) async {
      var savedSession = session;
      var didUpdate = false;
      var submittedName = '';
      await tester.pumpWidget(
        MaterialApp(
          home: ProfileScreen(
            session: session,
            onSessionChanged: (updated) => savedSession = updated,
            saveToken: (_) async {},
            profileUpdater: ({required token, required displayName}) async {
              didUpdate = true;
              submittedName = displayName;
              return MobileBfpIdentity(
                userId: session.identity.userId,
                displayName: displayName,
                email: session.identity.email,
                rankOrPosition: session.identity.rankOrPosition,
                municipalityId: session.identity.municipalityId,
                municipalityName: session.identity.municipalityName,
                stationName: session.identity.stationName,
                assignmentRole: session.identity.assignmentRole,
              );
            },
          ),
        ),
      );

      await tester.tap(find.text('Personal Information'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, 'Ana Reyes');
      await tester.pump();
      final saveButton = find.text('Save Changes');
      await tester.ensureVisible(saveButton);
      await tester.tap(saveButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pump();

      expect(didUpdate, isTrue);
      expect(submittedName, 'Ana Reyes');
      expect(tester.takeException(), isNull);
      expect(find.text('Save Changes'), findsNothing);
      await tester.pump();
      expect(savedSession.identity.displayName, 'Ana Reyes');
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('profile-display-name')))
            .data,
        'Ana Reyes',
      );
    },
  );

  testWidgets('shows the server reason when a profile update is rejected', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(
          session: session,
          onSessionChanged: (_) {},
          saveToken: (_) async {},
          profileUpdater: ({required token, required displayName}) async {
            throw const MobileBfpApiException(
              'Profile updates are temporarily unavailable.',
              statusCode: 503,
            );
          },
        ),
      ),
    );

    await tester.tap(find.text('Personal Information'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Save Changes'));
    await tester.tap(find.text('Save Changes'));
    await tester.pump();

    expect(
      find.text('Profile updates are temporarily unavailable.'),
      findsOneWidget,
    );
  });
}
