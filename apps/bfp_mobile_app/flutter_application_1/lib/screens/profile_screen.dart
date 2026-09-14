import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/mobile_bfp_api.dart';
import '../services/mobile_bfp_session_store.dart';
import '../theme/app_colors.dart';
import 'change_temporary_password_screen.dart';
import 'login_screen.dart';
import 'personal_information_screen.dart';

typedef MobileBfpSessionChanged = void Function(MobileBfpSession session);
typedef MobileBfpTokenSaver = Future<void> Function(String token);
typedef MobileBfpProfilePhotoUpdater =
    Future<MobileBfpIdentity> Function({
      required String token,
      required Uint8List photoBytes,
      required String fileName,
      required String mimeType,
    });
typedef MobileBfpProfileUpdater =
    Future<MobileBfpIdentity> Function({
      required String token,
      required String displayName,
    });

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.session,
    required this.onSessionChanged,
    this.saveToken,
    this.profileUpdater,
    this.profilePhotoUpdater,
  });

  final MobileBfpSession session;
  final MobileBfpSessionChanged onSessionChanged;
  final MobileBfpTokenSaver? saveToken;
  final MobileBfpProfileUpdater? profileUpdater;
  final MobileBfpProfilePhotoUpdater? profilePhotoUpdater;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late MobileBfpSession _session;

  @override
  void initState() {
    super.initState();
    _session = widget.session;
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

  String get _rank => _identity.rankOrPosition ?? 'BFP Personnel';

  String get _station =>
      _identity.stationName ??
      _identity.municipalityName ??
      'Station assignment pending';

  String get _rankShort {
    final r = _rank.toUpperCase().trim();
    if (r.contains('FIRE OFFICER III') ||
        r.contains('FO3') ||
        r.contains('FO III')) {
      return 'FO III';
    }
    if (r.contains('FIRE OFFICER II') ||
        r.contains('FO2') ||
        r.contains('FO II')) {
      return 'FO II';
    }
    if (r.contains('FIRE OFFICER I') ||
        r.contains('FO1') ||
        r.contains('FO I')) {
      return 'FO I';
    }
    if (r.contains('SENIOR') || r.contains('SFO')) {
      return 'SFO';
    }
    if (r.contains('INSPECTOR') || r.contains('INSP')) {
      return 'INSP';
    }
    if (r.length <= 6 && r.isNotEmpty) {
      return _rank;
    }
    return 'FO II';
  }

  String get _stationShort {
    final s = _station;
    final clean = s.split('·')[0].split('•')[0].split('-')[0].trim();
    final stripped = clean
        .replaceAll(RegExp(r'\bBFP\b', caseSensitive: false), '')
        .replaceAll(RegExp(r'\bFire Station\b', caseSensitive: false), '')
        .replaceAll(RegExp(r'\bStation\b', caseSensitive: false), '')
        .trim();
    if (stripped.isNotEmpty) {
      final words = stripped.split(RegExp(r'\s+'));
      if (words.length >= 2) return '${words[0]} ${words[1]}';
      return stripped;
    }
    return 'San Jose';
  }

  String get _badgeCode {
    if (_identity.userId.isNotEmpty) {
      final clean = _identity.userId
          .replaceAll(RegExp(r'[^a-zA-Z0-9]'), '')
          .toUpperCase();
      if (clean.length >= 4) {
        return 'BFP-2024-${clean.substring(clean.length - 4)}';
      }
    }
    return 'BFP-2024-0715';
  }

  String get _initials {
    final names = _identity.displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (names.isEmpty) return 'BF';
    if (names.length == 1) return names.first.substring(0, 1).toUpperCase();
    return '${names.first[0]}${names.last[0]}'.toUpperCase();
  }

  Future<void> _replaceSession(MobileBfpSession session) async {
    await (widget.saveToken ?? MobileBfpSessionStore().saveToken)(
      session.token,
    );
    if (!mounted) return;
    setState(() => _session = session);
    widget.onSessionChanged(session);
  }

  Future<void> _editPersonalInformation() async {
    final updatedSession = await Navigator.of(context).push<MobileBfpSession>(
      MaterialPageRoute(
        builder: (_) => PersonalInformationScreen(
          session: _session,
          profileUpdater: widget.profileUpdater,
          saveToken: widget.saveToken,
          profilePhotoUpdater: widget.profilePhotoUpdater,
        ),
      ),
    );
    if (updatedSession != null && mounted) {
      await _replaceSession(updatedSession);
    }
  }

  Future<void> _changePassword() async {
    final changed = await Navigator.of(context).push<MobileBfpSession>(
      MaterialPageRoute(
        builder: (_) => ChangeTemporaryPasswordScreen(
          session: _session,
          requireTemporaryPassword: false,
          popOnCompleted: true,
          onCompleted: (session) async {
            await MobileBfpSessionStore().saveToken(session.token);
          },
        ),
      ),
    );
    if (changed != null) await _replaceSession(changed);
  }

  Future<void> _showAssignment() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetContext) => _InfoSheet(
        icon: Icons.local_fire_department_outlined,
        title: 'My Assignment',
        child: Column(
          children: [
            _assignmentRow('Station', _station, Icons.account_balance_outlined),
            _assignmentRow(
              'Municipality',
              _identity.municipalityName ?? 'Not assigned',
              Icons.location_city_outlined,
            ),
            _assignmentRow('Access', _roleLabel, Icons.verified_user_outlined),
            const SizedBox(height: 16),
            Text(
              'Station and access assignments are managed by Municipal BFP on the ALAB website.',
              style: _font(
                12,
                FontWeight.w500,
                AppColors.textMuted,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showAbout() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _InfoSheet(
        icon: Icons.shield_outlined,
        title: 'About ALAB',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ALAB BFP Responder',
              style: _font(17, FontWeight.w800, AppColors.textDark),
            ),
            const SizedBox(height: 5),
            Text(
              'Municipal fire-response coordination for authorized BFP personnel.',
              style: _font(
                12.5,
                FontWeight.w500,
                AppColors.textMuted,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 18),
            _assignmentRow('Version', '2.0', Icons.info_outline_rounded),
          ],
        ),
      ),
    );
  }

  Future<void> _showAppSettings() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _InfoSheet(
        icon: Icons.settings_outlined,
        title: 'App Settings',
        child: Column(
          children: [
            _assignmentRow('Version', '2.0.0', Icons.info_outline_rounded),
            _assignmentRow('Theme', 'Light (ALAB BFP)', Icons.palette_outlined),
            _assignmentRow('Alert Sound', 'Enabled', Icons.volume_up_outlined),
            _assignmentRow(
              'Haptic Feedback',
              'Active',
              Icons.vibration_rounded,
            ),
            const SizedBox(height: 14),
            Text(
              'Emergency alarm and push notification preferences are linked to your mobile system permissions.',
              style: _font(
                12,
                FontWeight.w500,
                AppColors.textMuted,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showHelp() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _InfoSheet(
        icon: Icons.support_agent_outlined,
        title: 'Help & Support',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Municipal BFP Support Center',
              style: _font(16, FontWeight.w800, AppColors.textDark),
            ),
            const SizedBox(height: 6),
            Text(
              'For account issues, credential recovery, or station reassignment, contact your Municipal Fire Marshal or Municipal BFP Administrator.',
              style: _font(
                12.5,
                FontWeight.w500,
                AppColors.textMuted,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),
            _assignmentRow(
              'Emergency Hotline',
              '(036) 540-9911',
              Icons.phone_in_talk_outlined,
            ),
            _assignmentRow(
              'Office Access',
              '24/7 Command Center',
              Icons.schedule_outlined,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _signOut({bool switchAccount = false}) async {
    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Card Icon
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFECEB),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFFECACA), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryRed.withValues(alpha: 0.18),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(
                    Icons.logout_rounded,
                    color: AppColors.primaryRed,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              // Title
              Text(
                switchAccount
                    ? 'Switch BFP Account?'
                    : 'Are you sure you want to logout?',
                textAlign: TextAlign.center,
                style: _font(
                  18.5,
                  FontWeight.w900,
                  AppColors.textDark,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 8),
              // Content / Subtitle
              Text(
                switchAccount
                    ? 'The current personnel account will be removed from this device. You can then sign in with another BFP account.'
                    : 'You will be signed out of your active BFP responder session. You will need your credentials to log back in.',
                textAlign: TextAlign.center,
                style: _font(
                  13,
                  FontWeight.w500,
                  AppColors.textMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 24),
              // Actions Row
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(dialogContext, false),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xFFF8FAFC),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          'Cancel',
                          style: _font(
                            13.5,
                            FontWeight.w700,
                            const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(dialogContext, true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryRed,
                          foregroundColor: Colors.white,
                          elevation: 3,
                          shadowColor: AppColors.primaryRed.withValues(alpha: 0.35),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          switchAccount ? 'Switch' : 'Log Out',
                          style: _font(13.5, FontWeight.w800, Colors.white),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    if (confirmed != true || !mounted) return;
    await MobileBfpSessionStore().clear();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          Positioned(
            top: -80,
            right: -80,
            child: _ambient(const Color(0xFFFFECEB), 245),
          ),
          Positioned(
            top: 260,
            left: -115,
            child: _ambient(const Color(0xFFEFF6FF), 265),
          ),
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 116),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _profileHero(),
                  const SizedBox(height: 14),
                  _statsRow(),
                  const SizedBox(height: 14),
                  _menuCard(),
                  const SizedBox(height: 20),
                  _signOutButton(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _profileHero() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            Positioned(
              right: 6,
              top: 0,
              bottom: 0,
              child: Opacity(
                opacity: 0.12,
                child: Image.asset(
                  'assets/images/logo_alab.png',
                  width: 135,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) =>
                      const SizedBox.shrink(),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0xFFFFECEB),
                            width: 2,
                          ),
                        ),
                        child: ClipOval(child: _profilePhoto(size: 72)),
                      ),
                      Positioned(
                        right: 2,
                        bottom: 2,
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.5),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _identity.displayName.isNotEmpty
                              ? _identity.displayName
                              : 'Juan Dela Cruz',
                          key: const Key('profile-display-name'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: _font(
                            18,
                            FontWeight.w900,
                            AppColors.textDark,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _rank.isNotEmpty ? _rank : 'Fire Officer II',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: _font(
                            13,
                            FontWeight.w800,
                            AppColors.primaryRed,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _station.isNotEmpty
                              ? _station
                              : 'BFP San Jose Station',
                          key: const Key('profile-station'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: _font(
                            12,
                            FontWeight.w600,
                            const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 7),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3.5,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: const Color(0xFFDBEAFE),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.badge_outlined,
                                    size: 13,
                                    color: AppColors.primaryRed,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    _badgeCode,
                                    style: _font(
                                      11,
                                      FontWeight.w800,
                                      const Color(0xFF1E293B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 3.5,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: const Color(0xFFE2E8F0),
                                ),
                              ),
                              child: Text(
                                _roleLabel,
                                style: _font(
                                  10,
                                  FontWeight.w700,
                                  const Color(0xFF64748B),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _profilePhoto({required double size}) {
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

  Widget _statsRow() {
    return Row(
      children: [
        Expanded(
          child: _statCard(
            icon: Icons.local_fire_department_rounded,
            iconColor: AppColors.primaryRed,
            iconBg: const Color(0xFFFFECEB),
            label: 'Total Incidents',
            value: '32',
            valueColor: AppColors.primaryRed,
            subLabel: 'This Month',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _statCard(
            icon: Icons.access_time_rounded,
            iconColor: const Color(0xFFF97316),
            iconBg: const Color(0xFFFFF4ED),
            label: 'Total Hours',
            value: '128',
            valueColor: const Color(0xFFF97316),
            subLabel: 'This Month',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _statCard(
            icon: Icons.shield_outlined,
            iconColor: const Color(0xFF7C3AED),
            iconBg: const Color(0xFFF3E8FF),
            label: 'Rank',
            value: _rankShort,
            valueColor: const Color(0xFF7C3AED),
            subLabel: 'Position',
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _statCard(
            icon: Icons.location_on_rounded,
            iconColor: const Color(0xFF2563EB),
            iconBg: const Color(0xFFEFF6FF),
            label: 'Station',
            value: _stationShort,
            valueColor: const Color(0xFF2563EB),
            subLabel: 'Assigned',
          ),
        ),
      ],
    );
  }

  Widget _statCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String label,
    required String value,
    required Color valueColor,
    required String subLabel,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, size: 16, color: iconColor),
          ),
          const SizedBox(height: 7),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: _font(9.5, FontWeight.w600, AppColors.textMuted),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: _font(14.5, FontWeight.w900, valueColor),
          ),
          const SizedBox(height: 2),
          Text(
            subLabel,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: _font(9, FontWeight.w500, const Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  Widget _menuCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      child: Column(
        children: [
          _settingRow(
            icon: Icons.person_rounded,
            iconColor: AppColors.primaryRed,
            iconBackground: const Color(0xFFFFECEB),
            title: 'Personal Information',
            subtitle: 'View and update your personal details',
            onTap: _editPersonalInformation,
          ),
          _divider(),
          _settingRow(
            icon: Icons.lock_rounded,
            iconColor: const Color(0xFFF97316),
            iconBackground: const Color(0xFFFFF4ED),
            title: 'Account & Security',
            subtitle: 'Manage password and security settings',
            onTap: _changePassword,
          ),
          _divider(),
          _settingRow(
            icon: Icons.assignment_rounded,
            iconColor: const Color(0xFF7C3AED),
            iconBackground: const Color(0xFFF3E8FF),
            title: 'My Assignments',
            subtitle: 'View your current assignments and tasks',
            onTap: _showAssignment,
          ),
          _divider(),
          _settingRow(
            icon: Icons.settings_rounded,
            iconColor: const Color(0xFF2563EB),
            iconBackground: const Color(0xFFEFF6FF),
            title: 'App Settings',
            subtitle: 'Customize app preferences',
            onTap: _showAppSettings,
          ),
          _divider(),
          _settingRow(
            icon: Icons.support_agent_rounded,
            iconColor: const Color(0xFF10B981),
            iconBackground: const Color(0xFFECFDF5),
            title: 'Help & Support',
            subtitle: 'Get help and contact support',
            onTap: _showHelp,
          ),
          _divider(),
          _settingRow(
            icon: Icons.info_rounded,
            iconColor: const Color(0xFF64748B),
            iconBackground: const Color(0xFFF1F5F9),
            title: 'About ALAB',
            subtitle: 'App version and information',
            onTap: _showAbout,
          ),
        ],
      ),
    );
  }

  Widget _settingRow({
    required IconData icon,
    required Color iconColor,
    required Color iconBackground,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(14),
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 2),
      child: Row(
        children: [
          _roundIcon(icon, iconBackground, iconColor),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: _font(13.5, FontWeight.w800, AppColors.textDark),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: _font(11.5, FontWeight.w500, AppColors.textMuted),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right_rounded,
            color: Color(0xFFCBD5E1),
            size: 20,
          ),
        ],
      ),
    ),
  );

  Widget _signOutButton() => SizedBox(
    width: double.infinity,
    height: 52,
    child: ElevatedButton(
      onPressed: _signOut,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primaryRed,
        foregroundColor: Colors.white,
        elevation: 4,
        shadowColor: AppColors.primaryRed.withValues(alpha: 0.35),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: Text('Log Out', style: _font(15, FontWeight.w800, Colors.white)),
    ),
  );

  Widget _assignmentRow(String label, String value, IconData icon) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 11),
    child: Row(
      children: [
        Icon(icon, color: AppColors.primaryRed, size: 19),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: _font(12, FontWeight.w600, AppColors.textMuted),
          ),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: _font(12.5, FontWeight.w800, AppColors.textDark),
          ),
        ),
      ],
    ),
  );

  Widget _divider() =>
      const Divider(height: 1, thickness: 1, color: Color(0xFFF0F3F7));

  Widget _roundIcon(IconData icon, Color background, Color color) => Container(
    width: 38,
    height: 38,
    alignment: Alignment.center,
    decoration: BoxDecoration(color: background, shape: BoxShape.circle),
    child: Icon(icon, size: 19, color: color),
  );

  Widget _ambient(Color color, double size) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.65),
      shape: BoxShape.circle,
    ),
  );

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

class _InfoSheet extends StatelessWidget {
  const _InfoSheet({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(22, 12, 22, 32),
    decoration: const BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    child: SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(9),
              ),
            ),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFECEB),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppColors.primaryRed),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    ),
  );
}
