import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/mobile_bfp_api.dart';
import '../services/mobile_bfp_session_store.dart';
import '../theme/app_colors.dart';
import '../main.dart' show MainNavigationShell;

typedef PasswordChangeRequest =
    Future<MobileBfpSession> Function({
      required String currentPassword,
      required String nextPassword,
    });

typedef SessionCompletion = Future<void> Function(MobileBfpSession session);
typedef PasswordSessionTokenSaver = Future<void> Function(String token);

class ChangeTemporaryPasswordScreen extends StatefulWidget {
  const ChangeTemporaryPasswordScreen({
    super.key,
    required this.session,
    this.changePassword,
    this.onCompleted,
    this.requireTemporaryPassword = true,
    this.popOnCompleted = false,
    this.saveToken,
  });

  final MobileBfpSession session;
  final PasswordChangeRequest? changePassword;
  final SessionCompletion? onCompleted;
  final bool requireTemporaryPassword;
  final bool popOnCompleted;
  final PasswordSessionTokenSaver? saveToken;

  @override
  State<ChangeTemporaryPasswordScreen> createState() =>
      _ChangeTemporaryPasswordScreenState();
}

class _ChangeTemporaryPasswordScreenState
    extends State<ChangeTemporaryPasswordScreen> {
  final _temporaryPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _showTemporaryPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  bool _isSaving = false;
  String? _error;

  bool get _canSubmit =>
      _temporaryPasswordController.text.isNotEmpty &&
      _newPasswordController.text.length >= 12 &&
      _newPasswordController.text == _confirmPasswordController.text &&
      !_isSaving;

  @override
  void dispose() {
    _temporaryPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final session = await (widget.changePassword ?? _changeOnServer)(
        currentPassword: _temporaryPasswordController.text,
        nextPassword: _newPasswordController.text,
      );
      if (!mounted) return;

      if (widget.onCompleted != null) {
        await widget.onCompleted!(session);
        if (widget.popOnCompleted && mounted) {
          Navigator.of(context).pop(session);
        }
        return;
      }

      if (widget.saveToken != null) {
        await widget.saveToken!(session.token);
      } else {
        await MobileBfpSessionStore().saveSession(session);
      }
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => MainNavigationShell(session: session),
        ),
        (_) => false,
      );
    } on MobileBfpApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Unable to update your password. Please try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<MobileBfpSession> _changeOnServer({
    required String currentPassword,
    required String nextPassword,
  }) {
    return MobileBfpApi().changePassword(
      token: widget.session.token,
      currentPassword: currentPassword,
      nextPassword: nextPassword,
    );
  }

  @override
  Widget build(BuildContext context) {
    final newPasswordMismatch =
        _confirmPasswordController.text.isNotEmpty &&
        _newPasswordController.text != _confirmPasswordController.text;

    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFC),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(26, 24, 26, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (Navigator.of(context).canPop())
                Align(
                  alignment: Alignment.centerLeft,
                  child: InkWell(
                    onTap: () => Navigator.of(context).pop(),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            size: 14,
                            color: Color(0xFF1E293B),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Back',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF1E293B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 14),
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFECEB),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryRed.withValues(alpha: 0.16),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.key_rounded,
                    color: AppColors.primaryRed,
                    size: 34,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                widget.requireTemporaryPassword
                    ? 'Set New Password'
                    : 'Change Password',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 27,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF141923),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                widget.requireTemporaryPassword
                    ? 'Welcome, ${widget.session.identity.displayName}. For security, replace the temporary password issued by your BFP administrator.'
                    : 'Use your current password to protect your BFP account with a new one.',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF64748B),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 30),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F2),
                    border: Border.all(color: const Color(0xFFFECACA)),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline_rounded,
                        color: AppColors.primaryRed,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _error!,
                          style: GoogleFonts.plusJakartaSans(
                            color: const Color(0xFF991B1B),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
              ],
              _passwordField(
                key: const Key('temporary-password'),
                controller: _temporaryPasswordController,
                label: widget.requireTemporaryPassword
                    ? 'Temporary Password'
                    : 'Current Password',
                hint: widget.requireTemporaryPassword
                    ? 'Enter the password issued to you'
                    : 'Enter your current password',
                visible: _showTemporaryPassword,
                onToggleVisible: () => setState(
                  () => _showTemporaryPassword = !_showTemporaryPassword,
                ),
              ),
              const SizedBox(height: 18),
              _passwordField(
                key: const Key('new-password'),
                controller: _newPasswordController,
                label: 'New Password',
                hint: 'At least 12 characters',
                visible: _showNewPassword,
                onToggleVisible: () =>
                    setState(() => _showNewPassword = !_showNewPassword),
              ),
              const SizedBox(height: 18),
              _passwordField(
                key: const Key('confirm-new-password'),
                controller: _confirmPasswordController,
                label: 'Confirm New Password',
                hint: 'Repeat your new password',
                visible: _showConfirmPassword,
                hasError: newPasswordMismatch,
                onToggleVisible: () => setState(
                  () => _showConfirmPassword = !_showConfirmPassword,
                ),
              ),
              if (newPasswordMismatch) ...[
                const SizedBox(height: 7),
                Text(
                  'Passwords do not match.',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppColors.primaryRed,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Text(
                'Use a unique password you do not use on another account.',
                style: GoogleFonts.plusJakartaSans(
                  color: const Color(0xFF94A3B8),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                height: 56,
                child: ElevatedButton(
                  key: const Key('save-new-password'),
                  onPressed: _canSubmit ? _submit : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryRed,
                    disabledBackgroundColor: const Color(0xFFE2E8F0),
                    foregroundColor: Colors.white,
                    disabledForegroundColor: const Color(0xFF94A3B8),
                    elevation: _canSubmit ? 6 : 0,
                    shadowColor: AppColors.primaryRed.withValues(alpha: 0.35),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : Text(
                          'SAVE NEW PASSWORD',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.9,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _passwordField({
    required Key key,
    required TextEditingController controller,
    required String label,
    required String hint,
    required bool visible,
    required VoidCallback onToggleVisible,
    bool hasError = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: hasError ? AppColors.primaryRed : const Color(0xFFE5E9F0),
              width: hasError ? 1.5 : 1.2,
            ),
          ),
          child: TextField(
            key: key,
            controller: controller,
            obscureText: !visible,
            enabled: !_isSaving,
            onChanged: (_) => setState(() {}),
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14.5,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF141923),
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.plusJakartaSans(
                fontSize: 13.5,
                color: const Color(0xFFA0AEC0),
              ),
              prefixIcon: const Icon(
                Icons.lock_outline_rounded,
                color: Color(0xFF64748B),
                size: 21,
              ),
              suffixIcon: IconButton(
                onPressed: onToggleVisible,
                icon: Icon(
                  visible
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  color: const Color(0xFF94A3B8),
                  size: 20,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 18,
              ),
              border: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }
}
