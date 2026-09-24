import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_application_1/services/mobile_bfp_api.dart';
import 'package:flutter_application_1/services/mobile_bfp_session_store.dart';

void main() {
  const session = MobileBfpSession(
    token: 'signed-token',
    mustChangePassword: false,
    identity: MobileBfpIdentity(
      userId: 'responder-1', displayName: 'FO1 Santos',
      municipalityId: 'hamtic-id', municipalityName: 'Hamtic',
      assignmentRole: 'MUNICIPAL_STAFF',
    ),
  );

  test('recent verified session can reopen the offline map', () {
    final savedAt = DateTime.utc(2026, 9, 25);
    final encoded = MobileBfpSessionStore.encodeCachedSession(session, savedAt);
    final restored = MobileBfpSessionStore.decodeCachedSession(encoded, 'signed-token', savedAt.add(const Duration(days: 1)));
    expect(restored?.identity.municipalityName, 'Hamtic');
    expect(restored?.token, 'signed-token');
  });

  test('temporary-password, different-token, and expired sessions cannot reopen offline', () {
    final savedAt = DateTime.utc(2026, 9, 25);
    final encoded = MobileBfpSessionStore.encodeCachedSession(session, savedAt);
    expect(MobileBfpSessionStore.decodeCachedSession(encoded, 'another-token', savedAt), isNull);
    expect(MobileBfpSessionStore.decodeCachedSession(encoded, 'signed-token', savedAt.add(const Duration(days: 8))), isNull);
    final temporary = MobileBfpSession(
      token: session.token, identity: session.identity, mustChangePassword: true,
    );
    expect(MobileBfpSessionStore.decodeCachedSession(
      MobileBfpSessionStore.encodeCachedSession(temporary, savedAt), 'signed-token', savedAt,
    ), isNull);
  });
}
