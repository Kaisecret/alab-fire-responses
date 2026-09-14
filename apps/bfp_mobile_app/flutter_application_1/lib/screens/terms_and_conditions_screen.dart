import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/mobile_bfp_api.dart';
import '../theme/app_colors.dart';
import 'splash_screen.dart';

class TermsAndConditionsScreen extends StatefulWidget {
  const TermsAndConditionsScreen({super.key, required this.session});

  final MobileBfpSession session;

  @override
  State<TermsAndConditionsScreen> createState() =>
      _TermsAndConditionsScreenState();
}

class _TermsAndConditionsScreenState extends State<TermsAndConditionsScreen>
    with TickerProviderStateMixin {
  bool _isAgreed = false;
  bool _isLoading = false;

  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  // Shake animation controller for when user taps disabled button
  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  // Checkbox micro-bounce animation
  late AnimationController _checkBounceController;
  late Animation<double> _checkScaleAnimation;

  @override
  void initState() {
    super.initState();

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 750),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOutCubic,
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero).animate(
          CurvedAnimation(parent: _fadeController, curve: Curves.easeOutCubic),
        );

    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _shakeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.easeInOut),
    );

    _checkBounceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );

    _checkScaleAnimation =
        TweenSequence<double>([
          TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.25), weight: 50),
          TweenSequenceItem(tween: Tween(begin: 1.25, end: 1.0), weight: 50),
        ]).animate(
          CurvedAnimation(
            parent: _checkBounceController,
            curve: Curves.easeInOut,
          ),
        );

    _fadeController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _shakeController.dispose();
    _checkBounceController.dispose();
    super.dispose();
  }

  void _toggleAgreement() {
    _checkBounceController.forward(from: 0.0);
    setState(() {
      _isAgreed = !_isAgreed;
    });
  }

  void _handleAgree() async {
    if (!_isAgreed) {
      _shakeController.forward(from: 0.0);
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(
                Icons.info_outline_rounded,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Please check the box to agree to the Terms and Conditions.',
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.textDark,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }

    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    // Navigate to loading screen (tactical dispatch link initialize)
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (context, animation, secondaryAnimation) =>
            SplashScreen(session: widget.session),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // ── Ambient Soft Background Glows ──
          Positioned(
            top: -50,
            right: -50,
            width: 220,
            height: 220,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFECEB).withValues(alpha: 0.65),
              ),
            ),
          ),
          Positioned(
            top: 280,
            left: -60,
            width: 200,
            height: 200,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF1F5F9).withValues(alpha: 0.6),
              ),
            ),
          ),

          // ── Main Scrollable Content with Sticky Bottom Action ──
          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Column(
                  children: [
                    // ── Scrollable Terms Area ──
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 22.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const SizedBox(height: 10),

                            // ── Top Bar with Back Button ──
                            Row(
                              children: [
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.05,
                                        ),
                                        blurRadius: 12,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                    border: Border.all(
                                      color: const Color(0xFFEDF2F7),
                                      width: 1.2,
                                    ),
                                  ),
                                  child: Material(
                                    color: Colors.transparent,
                                    shape: const CircleBorder(),
                                    child: InkWell(
                                      customBorder: const CircleBorder(),
                                      onTap: () {
                                        if (Navigator.of(context).canPop()) {
                                          Navigator.of(context).pop();
                                        }
                                      },
                                      child: const Padding(
                                        padding: EdgeInsets.all(10.0),
                                        child: Icon(
                                          Icons.arrow_back_rounded,
                                          size: 20,
                                          color: AppColors.textDark,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 14),

                            // ── Centered Enlarge ALAB Logo Top Branding ──
                            Center(
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    width: 160,
                                    height: 70,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.primaryRed
                                              .withValues(alpha: 0.14),
                                          blurRadius: 30,
                                          spreadRadius: 4,
                                        ),
                                      ],
                                    ),
                                  ),
                                  Image.asset(
                                    'assets/images/logo_alab.png',
                                    width: 175,
                                    fit: BoxFit.contain,
                                    errorBuilder:
                                        (context, error, stackTrace) =>
                                            Image.asset(
                                              'assets/images/bfp_app_logo.png',
                                              width: 110,
                                              fit: BoxFit.contain,
                                            ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 20),

                            // ── Header Title ──
                            Text(
                              'Terms and Conditions',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF141923),
                                letterSpacing: -0.4,
                              ),
                            ),
                            const SizedBox(height: 8),

                            // ── Subtitle ──
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16.0,
                              ),
                              child: Text(
                                'Please read the following terms and conditions carefully before using ALAB.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF64748B),
                                  height: 1.4,
                                ),
                              ),
                            ),

                            const SizedBox(height: 22),

                            // ── Terms & Conditions Card ──
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(
                                    0xFFE2E8F0,
                                  ).withValues(alpha: 0.8),
                                  width: 1.2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.03),
                                    blurRadius: 16,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              padding: const EdgeInsets.symmetric(
                                vertical: 14,
                                horizontal: 16,
                              ),
                              child: Column(
                                children: [
                                  _buildTermItem(
                                    icon: Icons.verified_user_rounded,
                                    iconBgColor: const Color(0xFFFFECEB),
                                    iconColor: const Color(0xFFE5252A),
                                    title: '1. Acceptance of Terms',
                                    description:
                                        'By accessing or using ALAB, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.',
                                  ),
                                  _buildDivider(),
                                  _buildTermItem(
                                    icon: Icons.lock_rounded,
                                    iconBgColor: const Color(0xFFFFECEB),
                                    iconColor: const Color(0xFFE5252A),
                                    title: '2. Use of the App',
                                    description:
                                        'ALAB is intended for official fire response and emergency management use only. You agree to use the app responsibly and not misuse any of its features.',
                                  ),
                                  _buildDivider(),
                                  _buildTermItem(
                                    icon: Icons.person_rounded,
                                    iconBgColor: const Color(0xFFFFECEB),
                                    iconColor: const Color(0xFFE5252A),
                                    title: '3. User Responsibilities',
                                    description:
                                        'You are responsible for the accuracy of the information you provide. False reports may lead to legal action and disciplinary measures.',
                                  ),
                                  _buildDivider(),
                                  _buildTermItem(
                                    icon: Icons.shield_rounded,
                                    iconBgColor: const Color(0xFFFFECEB),
                                    iconColor: const Color(0xFFE5252A),
                                    title: '4. Data and Privacy',
                                    description:
                                        'Your data will be collected and used solely for fire response and emergency management purposes in accordance with our Privacy Policy.',
                                  ),
                                  _buildDivider(),
                                  _buildTermItem(
                                    icon: Icons.error_rounded,
                                    iconBgColor: const Color(0xFFFFECEB),
                                    iconColor: const Color(0xFFE5252A),
                                    title: '5. Limitation of Liability',
                                    description:
                                        'ALAB is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of this app.',
                                  ),
                                  _buildDivider(),
                                  _buildTermItem(
                                    icon: Icons.description_rounded,
                                    iconBgColor: const Color(0xFFFFECEB),
                                    iconColor: const Color(0xFFE5252A),
                                    title: '6. Changes to Terms',
                                    description:
                                        'We may update these Terms and Conditions from time to time. Continued use of ALAB after updates means you accept the revised terms.',
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 20),
                          ],
                        ),
                      ),
                    ),

                    // ── Bottom Fixed Agreement & I AGREE Card ──
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(24),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 20,
                            offset: const Offset(0, -6),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.fromLTRB(22, 18, 22, 22),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // ── Checkbox Row with Interactive Animation ──
                          GestureDetector(
                            onTap: _toggleAgreement,
                            behavior: HitTestBehavior.opaque,
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                ScaleTransition(
                                  scale: _checkScaleAnimation,
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 240),
                                    curve: Curves.easeOutCubic,
                                    width: 26,
                                    height: 26,
                                    decoration: BoxDecoration(
                                      color: _isAgreed
                                          ? AppColors.primaryRed
                                          : Colors.white,
                                      borderRadius: BorderRadius.circular(7),
                                      border: Border.all(
                                        color: _isAgreed
                                            ? AppColors.primaryRed
                                            : const Color(0xFFCBD5E1),
                                        width: 2.0,
                                      ),
                                      boxShadow: _isAgreed
                                          ? [
                                              BoxShadow(
                                                color: AppColors.primaryRed
                                                    .withValues(alpha: 0.35),
                                                blurRadius: 8,
                                                offset: const Offset(0, 2),
                                              ),
                                            ]
                                          : [],
                                    ),
                                    child: _isAgreed
                                        ? const Center(
                                            child: Icon(
                                              Icons.check_rounded,
                                              color: Colors.white,
                                              size: 18,
                                            ),
                                          )
                                        : null,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: RichText(
                                    text: TextSpan(
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: const Color(0xFF334155),
                                        height: 1.35,
                                      ),
                                      children: [
                                        const TextSpan(
                                          text:
                                              'I have read, understood, and agree to the ',
                                        ),
                                        TextSpan(
                                          text: 'Terms and Conditions',
                                          style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.primaryRed,
                                          ),
                                        ),
                                        const TextSpan(text: ' of using ALAB.'),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // ── Animated "I AGREE" Button ──
                          AnimatedBuilder(
                            animation: _shakeAnimation,
                            builder: (context, child) {
                              // Horizontal shake offset calculation
                              final shakeOffset = _shakeAnimation.value == 0
                                  ? 0.0
                                  : (1 - _shakeAnimation.value) *
                                        14 *
                                        (0.5 -
                                            ((_shakeAnimation.value * 6) % 1));
                              return Transform.translate(
                                offset: Offset(shakeOffset, 0),
                                child: child,
                              );
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeOutCubic,
                              width: double.infinity,
                              height: 54,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                gradient: _isAgreed
                                    ? const LinearGradient(
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                        colors: [
                                          Color(0xFFE5252A),
                                          Color(0xFFB81419),
                                        ],
                                      )
                                    : const LinearGradient(
                                        colors: [
                                          Color(0xFFE2E8F0),
                                          Color(0xFFCBD5E1),
                                        ],
                                      ),
                                boxShadow: _isAgreed
                                    ? [
                                        BoxShadow(
                                          color: AppColors.primaryRed
                                              .withValues(alpha: 0.38),
                                          blurRadius: 18,
                                          offset: const Offset(0, 6),
                                        ),
                                      ]
                                    : [],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(16),
                                  onTap: _handleAgree,
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      // Flame watermark icon on the right
                                      Positioned(
                                        right: 14,
                                        child: Opacity(
                                          opacity: _isAgreed ? 0.22 : 0.08,
                                          child: const Icon(
                                            Icons.local_fire_department_rounded,
                                            size: 32,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),

                                      _isLoading
                                          ? const SizedBox(
                                              width: 22,
                                              height: 22,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2.4,
                                                valueColor:
                                                    AlwaysStoppedAnimation<
                                                      Color
                                                    >(Colors.white),
                                              ),
                                            )
                                          : Text(
                                              'I AGREE',
                                              style:
                                                  GoogleFonts.plusJakartaSans(
                                                    fontSize: 15.5,
                                                    fontWeight: FontWeight.w900,
                                                    color: _isAgreed
                                                        ? Colors.white
                                                        : const Color(
                                                            0xFF64748B,
                                                          ),
                                                    letterSpacing: 1.4,
                                                  ),
                                            ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTermItem({
    required IconData icon,
    required Color iconBgColor,
    required Color iconColor,
    required String title,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Circular Icon Badge
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 14),

          // Title & Description
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF1E293B),
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF64748B),
                    height: 1.42,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Divider(height: 1, thickness: 1, color: const Color(0xFFF1F5F9));
  }
}
