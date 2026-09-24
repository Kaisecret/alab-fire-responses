import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

import 'locality_helper.dart';
import 'water_source_store.dart';

class MobileBfpIdentity {
  const MobileBfpIdentity({
    required this.userId,
    this.email = '',
    required this.displayName,
    this.rankOrPosition,
    required this.municipalityId,
    required this.municipalityName,
    this.stationName,
    this.profilePhotoUrl,
    required this.assignmentRole,
  });

  final String userId;
  final String email;
  final String displayName;
  final String? rankOrPosition;
  final String? municipalityId;
  final String? municipalityName;
  final String? stationName;
  final String? profilePhotoUrl;
  final String? assignmentRole;

  factory MobileBfpIdentity.fromJson(Map<String, dynamic> json) {
    String? nullableString(Object? value) =>
        value is String && value.isNotEmpty ? value : null;

    return MobileBfpIdentity(
      userId: json['userId'] is String ? json['userId'] as String : '',
      email: json['email'] is String ? json['email'] as String : '',
      displayName: json['displayName'] is String
          ? json['displayName'] as String
          : '',
      rankOrPosition: nullableString(json['rankOrPosition']),
      municipalityId: nullableString(json['municipalityId']),
      municipalityName: nullableString(json['municipalityName']),
      stationName: nullableString(json['stationName']),
      profilePhotoUrl: nullableString(json['profilePhotoUrl']),
      assignmentRole: nullableString(json['assignmentRole']),
    );
  }
}

class MobileBfpSession {
  const MobileBfpSession({
    required this.token,
    required this.identity,
    required this.mustChangePassword,
  });

  final String token;
  final MobileBfpIdentity identity;
  final bool mustChangePassword;

  MobileBfpSession copyWith({MobileBfpIdentity? identity}) {
    return MobileBfpSession(
      token: token,
      identity: identity ?? this.identity,
      mustChangePassword: mustChangePassword,
    );
  }

  factory MobileBfpSession.fromJson(
    Map<String, dynamic> json, {
    String? token,
  }) {
    final identityJson = json['identity'];
    if (identityJson is! Map<String, dynamic>) {
      throw const MobileBfpApiException(
        'The server returned an invalid account session.',
      );
    }
    final resolvedToken =
        token ?? (json['token'] is String ? json['token'] as String : '');
    if (resolvedToken.isEmpty) {
      throw const MobileBfpApiException(
        'The server did not return a session token.',
      );
    }
    return MobileBfpSession(
      token: resolvedToken,
      identity: MobileBfpIdentity.fromJson(identityJson),
      mustChangePassword: json['mustChangePassword'] == true,
    );
  }
}

class MobileBfpApiException implements Exception {
  const MobileBfpApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class MobileDispatchAssignment {
  const MobileDispatchAssignment({
    required this.dispatchId,
    required this.recipientStatus,
    required this.referenceNumber,
    required this.fireType,
    required this.reportStatus,
    required this.latitude,
    required this.longitude,
    required this.stationName,
    this.barangay,
    this.municipality,
    this.stationLatitude,
    this.stationLongitude,
    this.landmark,
  });

  final String dispatchId;
  final String recipientStatus;
  final String referenceNumber;
  final String fireType;
  final String reportStatus;
  final double latitude;
  final double longitude;
  final String stationName;
  final String? barangay;
  final String? municipality;
  final double? stationLatitude;
  final double? stationLongitude;
  final String? landmark;

  String get locationSummary => LocalityHelper.resolveBarangay(
    rawBarangay: barangay,
    municipality: municipality,
    latitude: latitude,
    longitude: longitude,
  );

  factory MobileDispatchAssignment.fromJson(Map<String, dynamic> json) =>
      MobileDispatchAssignment(
        dispatchId: json['dispatchId'] as String? ?? '',
        recipientStatus: json['recipientStatus'] as String? ?? 'ASSIGNED',
        referenceNumber: json['referenceNumber'] as String? ?? 'Incident',
        fireType: json['fireType'] as String? ?? 'FIRE',
        reportStatus: json['reportStatus'] as String? ?? 'RESPONDING',
        latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
        longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
        stationName: json['stationName'] as String? ?? 'BFP Station',
        barangay: (json['barangay'] as String?) ??
            (json['address_label'] as String?) ??
            (json['addressLabel'] as String?),
        municipality: json['municipality'] as String?,
        stationLatitude: (json['stationLatitude'] as num?)?.toDouble(),
        stationLongitude: (json['stationLongitude'] as num?)?.toDouble(),
        landmark: json['landmark'] as String?,
      );
}

class MobileBfpApi {
  MobileBfpApi({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = baseUrl ?? productionBaseUrl;

  static const productionBaseUrl = String.fromEnvironment(
    'ALAB_API_BASE_URL',
    defaultValue: 'https://alab-fire-responses-bynr.vercel.app',
  );
  static const loginPath = '/api/mobile-bfp/login';
  static const _requestTimeout = Duration(seconds: 15);

  /// Uploads carry photographs from a fireground, so they are given longer
  /// than a plain JSON call before they are called lost.
  static const _uploadTimeout = Duration(seconds: 60);

  final http.Client _client;
  final String _baseUrl;

  Uri _uri(String path) => Uri.parse('$_baseUrl$path');

  Future<MobileBfpSession> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _send(() {
      return _client.post(
        _uri(loginPath),
        headers: const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'email': email, 'password': password}),
      );
    });
    return MobileBfpSession.fromJson(_successJson(response));
  }

  Future<MobileBfpSession> restoreSession(String token) async {
    final response = await _send(() {
      return _client.get(
        _uri('/api/mobile-bfp/me'),
        headers: _authorizationHeaders(token),
      );
    });
    return MobileBfpSession.fromJson(_successJson(response), token: token);
  }

  Future<MobileBfpSession> changePassword({
    required String token,
    required String currentPassword,
    required String nextPassword,
  }) async {
    final response = await _send(() {
      return _client.post(
        _uri('/api/mobile-bfp/change-password'),
        headers: _authorizationHeaders(token),
        body: jsonEncode({
          'currentPassword': currentPassword,
          'nextPassword': nextPassword,
        }),
      );
    });
    return MobileBfpSession.fromJson(_successJson(response));
  }

  Future<MobileBfpIdentity> updateProfile({
    required String token,
    required String displayName,
  }) async {
    final response = await _send(() {
      return _client.patch(
        _uri('/api/mobile-bfp/profile'),
        headers: _authorizationHeaders(token),
        body: jsonEncode({'displayName': displayName}),
      );
    });
    final identity = _successJson(response)['identity'];
    if (identity is! Map<String, dynamic>) {
      throw const MobileBfpApiException(
        'The server returned an invalid profile response.',
      );
    }
    return MobileBfpIdentity.fromJson(identity);
  }

  Future<MobileBfpIdentity> updateProfilePhoto({
    required String token,
    required Uint8List photoBytes,
    required String fileName,
    required String mimeType,
  }) async {
    try {
      final request =
          http.MultipartRequest('POST', _uri('/api/mobile-bfp/profile/photo'))
            ..headers.addAll(_authorizationHeaders(token))
            ..files.add(
              http.MultipartFile.fromBytes(
                'photo',
                photoBytes,
                filename: fileName,
                contentType: MediaType.parse(mimeType),
              ),
            );
      final response = await http.Response.fromStream(
        await request.send().timeout(_requestTimeout),
      );
      final identity = _successJson(response)['identity'];
      if (identity is! Map<String, dynamic>) {
        throw const MobileBfpApiException(
          'The server returned an invalid profile photo response.',
        );
      }
      return MobileBfpIdentity.fromJson(identity);
    } on TimeoutException {
      throw const MobileBfpApiException(
        'The ALAB server took too long to upload your photo. Please try again.',
      );
    } on http.ClientException {
      throw const MobileBfpApiException(
        'Unable to upload your profile photo. Check your internet connection.',
      );
    }
  }

  Future<Map<String, dynamic>> fetchDispatchesPayload(String token) async {
    final response = await _send(() => _client.get(
      _uri('/api/mobile-bfp/dispatches'),
      headers: _authorizationHeaders(token),
    ));
    final json = _successJson(response);
    final rawList = json['assignments'];
    final assignments = rawList is List
        ? rawList.whereType<Map<String, dynamic>>().map(MobileDispatchAssignment.fromJson).toList()
        : <MobileDispatchAssignment>[];
    final resolvedCount = (json['resolvedCount'] as num?)?.toInt() ?? 0;
    return {
      'assignments': assignments,
      'resolvedCount': resolvedCount,
    };
  }

  Future<List<MobileDispatchAssignment>> listDispatchAssignments(String token) async {
    final payload = await fetchDispatchesPayload(token);
    return payload['assignments'] as List<MobileDispatchAssignment>;
  }

  Future<List<MobileWaterSource>> listWaterSources(String token) async {
    final response = await _send(() => _client.get(
      _uri('/api/mobile-bfp/water-sources'),
      headers: _authorizationHeaders(token),
    ));
    final raw = _successJson(response)['sources'];
    if (raw is! List) {
      throw const MobileBfpApiException('The server returned an invalid water source list.');
    }
    try {
      return raw.map((item) {
        if (item is! Map<String, dynamic>) throw const FormatException();
        return MobileWaterSource.fromJson(item);
      }).toList();
    } catch (_) {
      throw const MobileBfpApiException('The server returned an invalid water source list.');
    }
  }

  Future<List<MobileDispatchAssignment>> listResolvedAssignments(String token) async {
    final response = await _send(() => _client.get(
      _uri('/api/mobile-bfp/dispatches/resolved'),
      headers: _authorizationHeaders(token),
    ));
    final json = _successJson(response);
    final rawList = json['resolvedAssignments'];
    return rawList is List
        ? rawList.whereType<Map<String, dynamic>>().map(MobileDispatchAssignment.fromJson).toList()
        : <MobileDispatchAssignment>[];
  }

  Future<void> registerDevice({
    required String token,
    required String installationId,
    required String fcmToken,
  }) async {
    final response = await _send(() => _client.post(
      _uri('/api/mobile-bfp/devices'),
      headers: _authorizationHeaders(token),
      body: jsonEncode({'installationId': installationId, 'fcmToken': fcmToken}),
    ));
    _successJson(response);
  }

  Future<void> startDispatchRoute({required String token, required String dispatchId}) async {
    final response = await _send(() => _client.post(
      _uri('/api/mobile-bfp/dispatches/$dispatchId'),
      headers: _authorizationHeaders(token),
      body: jsonEncode({'action': 'START_ROUTE'}),
    ));
    _successJson(response);
  }

  /// Whether backup is already open for this dispatch.
  ///
  /// Asked on load so the control reflects the server rather than whatever the
  /// app happened to remember before it was closed.
  Future<bool> hasOpenBackupRequest({
    required String token,
    required String dispatchId,
  }) async {
    final response = await _send(() => _client.get(
      _uri('/api/mobile-bfp/backup-requests?dispatchId=$dispatchId'),
      headers: _authorizationHeaders(token),
    ));
    final payload = _successJson(response);
    return payload['alreadyRequested'] == true;
  }

  /// Calls for backup on an incident this responder was dispatched to.
  ///
  /// Photographs ride along as multipart so the station deciding whether to
  /// forward can see the scene rather than only read about it.
  Future<void> requestBackup({
    required String token,
    required String dispatchId,
    String? reason,
    int requestedFiretrucks = 0,
    int requestedPersonnel = 0,
    List<XFile> photos = const [],
  }) async {
    if (photos.isEmpty) {
      final response = await _send(() => _client.post(
        _uri('/api/mobile-bfp/backup-requests'),
        headers: _authorizationHeaders(token),
        body: jsonEncode({
          'dispatchId': dispatchId,
          if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
          'requestedFiretrucks': requestedFiretrucks,
          'requestedPersonnel': requestedPersonnel,
        }),
      ));
      _successJson(response);
      return;
    }

    final request = http.MultipartRequest('POST', _uri('/api/mobile-bfp/backup-requests'))
      ..headers['Authorization'] = 'Bearer $token'
      ..fields['dispatchId'] = dispatchId
      ..fields['requestedFiretrucks'] = '$requestedFiretrucks'
      ..fields['requestedPersonnel'] = '$requestedPersonnel';

    if (reason != null && reason.trim().isNotEmpty) {
      request.fields['reason'] = reason.trim();
    }

    for (final photo in photos) {
      request.files.add(await http.MultipartFile.fromPath(
        'photos',
        photo.path,
        contentType: MediaType('image', _imageSubtype(photo.path)),
      ));
    }

    // Photographs go up over whatever signal the scene has, which is rarely
    // the signal the office has. The plain request timeout is too short for
    // three of them, and an upload that overran it surfaced as a raw
    // TimeoutException: the responder was told "error sending backup" with
    // nothing to act on. It now fails the way every other call does.
    final http.Response response;
    try {
      final streamed = await request.send().timeout(_uploadTimeout);
      response = await http.Response.fromStream(streamed).timeout(_uploadTimeout);
    } on TimeoutException {
      throw const MobileBfpApiException(
        'The photos are taking too long to upload. Send the request without them, '
        'or try again where the signal is better.',
      );
    } on http.ClientException {
      throw const MobileBfpApiException(
        'Unable to reach the ALAB server. Check your internet connection.',
      );
    }
    _successJson(response);
  }

  static String _imageSubtype(String path) {
    final extension = path.split('.').last.toLowerCase();
    if (extension == 'png') return 'png';
    if (extension == 'webp') return 'webp';
    return 'jpeg';
  }

  Future<Map<String, dynamic>> sendDispatchLocation({
    required String token,
    required String dispatchId,
    required double latitude,
    required double longitude,
  }) async {
    final response = await _send(() => _client.post(
      _uri('/api/mobile-bfp/dispatches/$dispatchId'),
      headers: _authorizationHeaders(token),
      body: jsonEncode({'action': 'LOCATION_PING', 'latitude': latitude, 'longitude': longitude}),
    ));
    final arrival = _successJson(response)['arrival'];
    return arrival is Map<String, dynamic> ? arrival : const {};
  }

  Map<String, String> _authorizationHeaders(String token) => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer $token',
  };

  Future<http.Response> _send(Future<http.Response> Function() send) async {
    try {
      return await send().timeout(_requestTimeout);
    } on TimeoutException {
      throw const MobileBfpApiException(
        'The ALAB server took too long to respond. Please try again.',
      );
    } on http.ClientException {
      throw const MobileBfpApiException(
        'Unable to reach the ALAB server. Check your internet connection.',
      );
    }
  }

  Map<String, dynamic> _successJson(http.Response response) {
    final json = _json(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = json?['error'];
      throw MobileBfpApiException(
        message is String && message.isNotEmpty
            ? message
            : 'Unable to complete your request right now.',
        statusCode: response.statusCode,
      );
    }
    if (json == null) {
      throw const MobileBfpApiException(
        'The ALAB server returned an invalid response.',
      );
    }
    return json;
  }

  Map<String, dynamic>? _json(String value) {
    try {
      final decoded = jsonDecode(value);
      return decoded is Map<String, dynamic> ? decoded : null;
    } on FormatException {
      return null;
    }
  }
}
