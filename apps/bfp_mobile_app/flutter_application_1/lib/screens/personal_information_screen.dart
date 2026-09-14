import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../services/mobile_bfp_api.dart';
import '../services/mobile_bfp_session_store.dart';
import '../theme/app_colors.dart';

typedef MobileBfpProfileUpdater =
    Future<MobileBfpIdentity> Function({
      required String token,
      required String displayName,
    });

typedef MobileBfpTokenSaver = Future<void> Function(String token);
typedef MobileBfpProfilePhotoUpdater =
    Future<MobileBfpIdentity> Function({
      required String token,
      required Uint8List photoBytes,
      required String fileName,
      required String mimeType,
    });

class PersonalInformationScreen extends StatefulWidget {
  const PersonalInformationScreen({
    super.key,
    required this.session,
    this.profileUpdater,
    this.saveToken,
    this.profilePhotoUpdater,
  });

  final MobileBfpSession session;
  final MobileBfpProfileUpdater? profileUpdater;
  final MobileBfpTokenSaver? saveToken;
  final MobileBfpProfilePhotoUpdater? profilePhotoUpdater;

  @override
  State<PersonalInformationScreen> createState() =>
      _PersonalInformationScreenState();
}

class _PersonalInformationScreenState extends State<PersonalInformationScreen> {
  late TextEditingController _nameController;
  late MobileBfpSession _session;

  XFile? _selectedPhoto;
  Uint8List? _selectedPhotoBytes;
  bool _isSaving = false;
  String? _error;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _session = widget.session;
    _nameController = TextEditingController(text: _identity.displayName);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  MobileBfpIdentity get _identity => _session.identity;

  String get _roleLabel {
    switch (_identity.assignmentRole) {
      case 'MUNICIPAL_ADMIN':
        return 'Municipal Administrator';
      case 'MUNICIPAL_STAFF':
        return 'Municipal Staff';
      default:
        return 'BFP Personnel';
    }
  }

  String get _rank => _identity.rankOrPosition ?? 'Fire Officer II';

  String get _station =>
      _identity.stationName ??
      _identity.municipalityName ??
      'BFP San Jose Station';

  String get _initials {
    final names = _nameController.text
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (names.isEmpty) return 'BF';
    if (names.length == 1) return names.first.substring(0, 1).toUpperCase();
    return '${names.first[0]}${names.last[0]}'.toUpperCase();
  }

  Future<void> _pickProfilePhoto(ImageSource source) async {
    try {
      final photo = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1400,
        maxHeight: 1400,
        imageQuality: 90,
      );
      if (photo == null || !mounted) return;
      final bytes = await photo.readAsBytes();
      if (bytes.lengthInBytes > 5 * 1024 * 1024) {
        setState(
          () =>
              _error =
                  'Please choose a JPG, PNG, or WebP image that is smaller than 5 MB.',
        );
        return;
      }
      setState(() {
        _selectedPhoto = photo;
        _selectedPhotoBytes = bytes;
        _error = null;
      });
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Unable to open your photo library. Please try again.',
        );
      }
    }
  }

  void _showAvatarPicker() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Container(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 30),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Update profile photo',
                style: _font(18, FontWeight.w800, AppColors.textDark),
              ),
              const SizedBox(height: 5),
              Text(
                'Please choose a JPG, PNG, or WebP image that is smaller than 5 MB.',
                textAlign: TextAlign.center,
                style: _font(12, FontWeight.w500, AppColors.textMuted),
              ),
              const SizedBox(height: 16),
              _photoSourceOption(
                icon: Icons.photo_library_outlined,
                title: 'Photo library',
                subtitle: 'Choose an existing photo',
                onTap: () async {
                  Navigator.pop(sheetContext);
                  await _pickProfilePhoto(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 10),
              _photoSourceOption(
                icon: Icons.camera_alt_outlined,
                title: 'Take a photo',
                subtitle: 'Use your device camera',
                onTap: () async {
                  Navigator.pop(sheetContext);
                  await _pickProfilePhoto(ImageSource.camera);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _saveProfile() async {
    final newName = _nameController.text.trim();
    if (newName.isEmpty) {
      setState(() => _error = 'Please enter your display name.');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
      _successMessage = null;
    });

    try {
      var updatedIdentity = await (widget.profileUpdater ?? _defaultUpdater)(
        token: _session.token,
        displayName: newName,
      );

      final photoBytes = _selectedPhotoBytes;
      final selectedPhoto = _selectedPhoto;
      if (photoBytes != null && selectedPhoto != null) {
        updatedIdentity =
            await (widget.profilePhotoUpdater ?? _defaultPhotoUpdater)(
              token: _session.token,
              photoBytes: photoBytes,
              fileName: selectedPhoto.name,
              mimeType: _photoMimeType(selectedPhoto),
            );
      }

      final updatedSession = _session.copyWith(identity: updatedIdentity);

      await (widget.saveToken ?? MobileBfpSessionStore().saveToken)(
        updatedSession.token,
      );

      if (!mounted) return;
      Navigator.of(context).pop(updatedSession);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
          _error = _profileUpdateError(e);
        });
      }
    }
  }

  String _profileUpdateError(Object error) {
    if (error is MobileBfpApiException) {
      if (error.statusCode == 404 && _selectedPhotoBytes != null) {
        return 'Profile photo upload is not available on the server yet. Please contact the administrator.';
      }
      return error.message;
    }
    return 'Unable to update profile right now. Please try again.';
  }

  Widget _photoSourceOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: const BoxDecoration(
              color: Color(0xFFFFECEB),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primaryRed, size: 21),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: _font(14, FontWeight.w800, AppColors.textDark),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: _font(11.5, FontWeight.w500, AppColors.textMuted),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
        ],
      ),
    ),
  );

  Future<MobileBfpIdentity> _defaultUpdater({
    required String token,
    required String displayName,
  }) => MobileBfpApi().updateProfile(token: token, displayName: displayName);

  Future<MobileBfpIdentity> _defaultPhotoUpdater({
    required String token,
    required Uint8List photoBytes,
    required String fileName,
    required String mimeType,
  }) => MobileBfpApi().updateProfilePhoto(
    token: token,
    photoBytes: photoBytes,
    fileName: fileName,
    mimeType: mimeType,
  );

  String _photoMimeType(XFile photo) {
    final declared = photo.mimeType;
    if (declared == 'image/jpeg' ||
        declared == 'image/png' ||
        declared == 'image/webp') {
      return declared!;
    }
    final name = photo.name.toLowerCase();
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 15,
              color: Color(0xFF1E293B),
            ),
          ),
          onPressed: () => Navigator.of(context).pop(_session),
          tooltip: 'Back',
        ),
        title: Text(
          'Personal Information',
          style: _font(18, FontWeight.w900, AppColors.textDark),
        ),
        centerTitle: true,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFF1F5F9), height: 1),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // PROFILE PICTURE UPLOADER HERO
            _avatarUploaderCard(),
            const SizedBox(height: 18),

            // ERROR / SUCCESS BANNERS
            if (_error != null) ...[
              _alertBox(_error!, isError: true),
              const SizedBox(height: 14),
            ],
            if (_successMessage != null) ...[
              _alertBox(_successMessage!, isError: false),
              const SizedBox(height: 14),
            ],

            // EDITABLE DETAILS CARD
            _sectionHeader('PERSONAL DETAILS'),
            const SizedBox(height: 8),
            _containerCard([
              _inputField(
                label: 'Display Name',
                controller: _nameController,
                icon: Icons.person_rounded,
                hint: 'Enter official display name',
                onChanged: (_) => setState(() {}),
              ),
              _readOnlyField(
                label: 'Official Email',
                value: _identity.email.isNotEmpty
                    ? _identity.email
                    : 'Not available',
                icon: Icons.alternate_email_rounded,
              ),
            ]),
            const SizedBox(height: 22),

            // OFFICIAL BFP SERVICE ASSIGNMENTS (READ-ONLY)
            _sectionHeader('OFFICIAL SERVICE RECORD'),
            const SizedBox(height: 8),
            _containerCard([
              _serviceRow(
                icon: Icons.shield_rounded,
                iconColor: const Color(0xFF7C3AED),
                iconBg: const Color(0xFFF3E8FF),
                title: 'Rank & Designation',
                value: _rank,
              ),
              const Divider(height: 18, color: Color(0xFFF1F5F9)),
              _serviceRow(
                icon: Icons.location_city_rounded,
                iconColor: AppColors.primaryRed,
                iconBg: const Color(0xFFFFECEB),
                title: 'Station Assignment',
                value: _station,
              ),
              const Divider(height: 18, color: Color(0xFFF1F5F9)),
              _serviceRow(
                icon: Icons.map_rounded,
                iconColor: const Color(0xFF2563EB),
                iconBg: const Color(0xFFEFF6FF),
                title: 'Municipality',
                value: _identity.municipalityName ?? 'Not assigned',
              ),
              const Divider(height: 18, color: Color(0xFFF1F5F9)),
              _serviceRow(
                icon: Icons.verified_user_rounded,
                iconColor: const Color(0xFF059669),
                iconBg: const Color(0xFFECFDF5),
                title: 'Access Level',
                value: _roleLabel,
              ),
            ]),
            const SizedBox(height: 28),

            // SAVE CHANGES BUTTON
            _saveButton(),
          ],
        ),
      ),
    );
  }

  Widget _avatarUploaderCard() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                width: 104,
                height: 104,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFFFECEB), width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryRed.withValues(alpha: 0.18),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: ClipOval(child: _avatarPreview(size: 104)),
              ),
              InkWell(
                onTap: _showAvatarPicker,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: AppColors.primaryRed,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.camera_alt_rounded,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            _nameController.text.isNotEmpty
                ? _nameController.text
                : _identity.displayName,
            style: _font(19, FontWeight.w900, AppColors.textDark),
          ),
          const SizedBox(height: 3),
          Text(_rank, style: _font(13, FontWeight.w800, AppColors.primaryRed)),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _showAvatarPicker,
            icon: const Icon(Icons.photo_library_rounded, size: 16),
            label: Text(
              'Change Profile Picture',
              style: _font(12.5, FontWeight.w800, AppColors.primaryRed),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primaryRed,
              side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _avatarPreview({required double size}) {
    Widget fallback() => Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(gradient: AppColors.fireGradient),
      child: Center(
        child: Text(
          _initials,
          style: _font(size * 0.31, FontWeight.w900, Colors.white),
        ),
      ),
    );
    final selectedPhoto = _selectedPhotoBytes;
    if (selectedPhoto != null) {
      return Image.memory(
        selectedPhoto,
        width: size,
        height: size,
        fit: BoxFit.cover,
      );
    }
    final photoUrl = _identity.profilePhotoUrl;
    if (photoUrl == null || photoUrl.isEmpty) return fallback();
    return Image.network(
      photoUrl,
      width: size,
      height: size,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => fallback(),
    );
  }

  Widget _sectionHeader(String title) {
    return Text(
      title,
      style: _font(
        11.5,
        FontWeight.w800,
        AppColors.textMuted,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _containerCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _inputField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    ValueChanged<String>? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: AppColors.primaryRed),
            const SizedBox(width: 8),
            Text(
              label,
              style: _font(12, FontWeight.w700, const Color(0xFF475569)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          onChanged: onChanged,
          style: _font(14, FontWeight.w700, AppColors.textDark),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: _font(13, FontWeight.w500, const Color(0xFF94A3B8)),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppColors.primaryRed,
                width: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _readOnlyField({
    required String label,
    required String value,
    required IconData icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: const Color(0xFF64748B)),
            const SizedBox(width: 8),
            Text(
              label,
              style: _font(12, FontWeight.w700, const Color(0xFF475569)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Text(
            value,
            style: _font(13.5, FontWeight.w700, const Color(0xFF334155)),
          ),
        ),
      ],
    );
  }

  Widget _serviceRow({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
          child: Icon(icon, size: 18, color: iconColor),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: _font(11, FontWeight.w600, AppColors.textMuted),
              ),
              const SizedBox(height: 1),
              Text(
                value,
                style: _font(13, FontWeight.w800, AppColors.textDark),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _alertBox(String message, {required bool isError}) {
    final bgColor = isError ? const Color(0xFFFFF1F2) : const Color(0xFFECFDF5);
    final borderColor = isError
        ? const Color(0xFFFECACA)
        : const Color(0xFFA7F3D0);
    final textColor = isError
        ? const Color(0xFF991B1B)
        : const Color(0xFF065F46);
    final icon = isError
        ? Icons.error_outline_rounded
        : Icons.check_circle_outline_rounded;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, color: textColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: _font(12.5, FontWeight.w600, textColor),
            ),
          ),
        ],
      ),
    );
  }

  Widget _saveButton() {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        onPressed: _isSaving ? null : _saveProfile,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryRed,
          foregroundColor: Colors.white,
          elevation: 4,
          shadowColor: AppColors.primaryRed.withValues(alpha: 0.35),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: _isSaving
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.check_rounded,
                    size: 20,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Save Changes',
                    style: _font(14.5, FontWeight.w800, Colors.white),
                  ),
                ],
              ),
      ),
    );
  }

  TextStyle _font(
    double size,
    FontWeight weight,
    Color color, {
    double? letterSpacing,
    double? height,
  }) => GoogleFonts.plusJakartaSans(
    fontSize: size,
    fontWeight: weight,
    color: color,
    letterSpacing: letterSpacing,
    height: height,
  );
}
