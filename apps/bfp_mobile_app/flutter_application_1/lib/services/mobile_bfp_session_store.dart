import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'mobile_bfp_api.dart';

class MobileBfpSessionStore {
  MobileBfpSessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _tokenKey = 'alab_mobile_bfp_session';
  static const _cachedSessionKey = 'alab_mobile_bfp_cached_identity';
  static const _offlineSessionDuration = Duration(days: 7);

  final FlutterSecureStorage _storage;

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<void> saveSession(MobileBfpSession session) async {
    await saveToken(session.token);
    await _storage.write(
      key: _cachedSessionKey,
      value: encodeCachedSession(session, DateTime.now()),
    );
  }

  Future<MobileBfpSession?> readCachedSession(String token) async =>
      decodeCachedSession(
        await _storage.read(key: _cachedSessionKey),
        token,
        DateTime.now(),
      );

  static String encodeCachedSession(MobileBfpSession session, DateTime savedAt) =>
      jsonEncode({
        'savedAt': savedAt.millisecondsSinceEpoch,
        'token': session.token,
        'mustChangePassword': session.mustChangePassword,
        'identity': {
          'userId': session.identity.userId,
          'email': session.identity.email,
          'displayName': session.identity.displayName,
          'rankOrPosition': session.identity.rankOrPosition,
          'municipalityId': session.identity.municipalityId,
          'municipalityName': session.identity.municipalityName,
          'stationName': session.identity.stationName,
          'profilePhotoUrl': session.identity.profilePhotoUrl,
          'assignmentRole': session.identity.assignmentRole,
        },
      });

  static MobileBfpSession? decodeCachedSession(
    String? raw,
    String token,
    DateTime now,
  ) {
    if (raw == null) return null;
    try {
      final data = jsonDecode(raw);
      if (data is! Map<String, dynamic> ||
          data['token'] != token ||
          data['mustChangePassword'] == true ||
          data['savedAt'] is! int) {
        return null;
      }
      final age = now.difference(DateTime.fromMillisecondsSinceEpoch(data['savedAt'] as int));
      if (age.isNegative || age > _offlineSessionDuration) return null;
      return MobileBfpSession.fromJson(data, token: token);
    } catch (_) {
      return null;
    }
  }

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _cachedSessionKey);
  }
}
