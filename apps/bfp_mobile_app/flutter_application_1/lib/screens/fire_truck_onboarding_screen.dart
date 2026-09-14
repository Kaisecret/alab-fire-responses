import 'dart:math';

import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../services/mobile_app_launch_store.dart';
import 'login_screen.dart';

/// Animated onboarding screen that plays every app launch.
/// Shows ALAB logo intro → fire truck dispatching to fire on a realistic map.
class FireTruckOnboardingScreen extends StatefulWidget {
  const FireTruckOnboardingScreen({super.key});

  @override
  State<FireTruckOnboardingScreen> createState() =>
      _FireTruckOnboardingScreenState();
}

class _FireTruckOnboardingScreenState extends State<FireTruckOnboardingScreen>
    with TickerProviderStateMixin {
  // ── Logo intro controllers ──
  late AnimationController _logoScaleController;
  late AnimationController _logoFadeInController;
  late AnimationController _logoGlowController;
  late AnimationController _logoFadeOutController;

  // ── Map phase controllers ──
  late AnimationController _mapFadeController;
  late AnimationController _pathDrawController;
  late AnimationController _firePulseController;
  late AnimationController _arrivalGlowController;

  // ── Logo animations ──
  late Animation<double> _logoScale;
  late Animation<double> _logoFadeIn;
  late Animation<double> _logoGlow;
  late Animation<double> _logoFadeOut;

  // ── Map animations ──
  late Animation<double> _mapOpacity;
  late Animation<double> _pathProgress;
  late Animation<double> _firePulse;
  late Animation<double> _arrivalGlow;

  bool _showTruck = false;
  bool _hasNavigated = false;
  bool _logoPhaseActive = true;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _startSequence();
  }

  void _initAnimations() {
    // ═══ LOGO INTRO PHASE ═══

    // Logo scale: 0.3 → 1.0 with bounce (easeOutBack)
    _logoScaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _logoScale = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _logoScaleController, curve: Curves.easeOutBack),
    );

    // Logo fade in: 0 → 1
    _logoFadeInController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _logoFadeIn = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoFadeInController, curve: Curves.easeIn),
    );

    // Logo glow pulse: subtle warm glow behind logo
    _logoGlowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _logoGlow = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoGlowController, curve: Curves.easeInOut),
    );

    // Logo fade out (before map appears)
    _logoFadeOutController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _logoFadeOut = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _logoFadeOutController, curve: Curves.easeOut),
    );

    // ═══ MAP PHASE ═══

    // Map fade-in
    _mapFadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _mapOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _mapFadeController, curve: Curves.easeIn),
    );

    // Fire pulse - continuous loop
    _firePulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _firePulse = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _firePulseController, curve: Curves.easeInOut),
    );

    // Path drawing + truck movement (2800ms)
    _pathDrawController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    );
    _pathProgress = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pathDrawController, curve: Curves.easeInOut),
    );

    // Arrival glow burst
    _arrivalGlowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _arrivalGlow = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _arrivalGlowController, curve: Curves.easeOut),
    );
  }

  Future<void> _startSequence() async {
    // ═══ LOGO INTRO ═══

    // Brief white pause, then logo scales up + fades in
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    _logoFadeInController.forward();
    _logoScaleController.forward();

    // After logo is visible, start warm glow pulse
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    _logoGlowController.forward();

    // Hold the logo on screen for a moment
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    // Fade out logo, fade in map simultaneously
    _logoFadeOutController.forward();
    await Future.delayed(const Duration(milliseconds: 200));
    if (!mounted) return;
    _mapFadeController.forward();

    // Once logo is gone, mark logo phase done
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() => _logoPhaseActive = false);

    // ═══ MAP + TRUCK DISPATCH ═══

    // Show fire marker pulse and truck
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() => _showTruck = true);
    _firePulseController.repeat(reverse: true);

    // Start path drawing + truck movement
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    _pathDrawController.forward();

    // Wait for path to finish, then arrival glow
    await Future.delayed(const Duration(milliseconds: 3000));
    if (!mounted) return;
    _arrivalGlowController.forward();

    // Navigate to login screen
    await Future.delayed(const Duration(milliseconds: 800));
    _navigateToLogin();
  }

  Future<void> _navigateToLogin() async {
    if (!mounted || _hasNavigated) return;
    _hasNavigated = true;
    await MobileAppLaunchStore().markOnboardingComplete();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 700),
        pageBuilder: (context, animation, secondaryAnimation) =>
            const LoginScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _logoScaleController.dispose();
    _logoFadeInController.dispose();
    _logoGlowController.dispose();
    _logoFadeOutController.dispose();
    _mapFadeController.dispose();
    _pathDrawController.dispose();
    _firePulseController.dispose();
    _arrivalGlowController.dispose();
    super.dispose();
  }

  // ── Position helpers ──

  /// Fire location (destination) — upper-right area
  Offset _getFirePosition(Size size) {
    return Offset(size.width * 0.68, size.height * 0.26);
  }

  /// Truck start position — lower-left area
  Offset _getTruckStart(Size size) {
    return Offset(size.width * 0.24, size.height * 0.70);
  }

  /// Compute truck position along route based on progress [0..1]
  Offset _getTruckPosition(Size size, double progress) {
    final path = _buildRoutePath(size);
    final metrics = path.computeMetrics().first;
    final distance = metrics.length * progress.clamp(0.0, 1.0);
    final tangent = metrics.getTangentForOffset(distance);
    return tangent?.position ?? _getTruckStart(size);
  }

  /// Multi-segment route path following roads (truck → fire)
  Path _buildRoutePath(Size size) {
    final start = _getTruckStart(size);
    final end = _getFirePosition(size);

    // Road-following waypoints with right-angle turns
    final wp1 = Offset(start.dx, size.height * 0.55);
    final wp2 = Offset(size.width * 0.38, size.height * 0.55);
    final wp3 = Offset(size.width * 0.38, size.height * 0.42);
    final wp4 = Offset(size.width * 0.54, size.height * 0.42);
    final wp5 = Offset(size.width * 0.54, size.height * 0.32);
    final wp6 = Offset(end.dx, size.height * 0.32);

    return Path()
      ..moveTo(start.dx, start.dy)
      ..lineTo(wp1.dx, wp1.dy)
      ..lineTo(wp2.dx, wp2.dy)
      ..lineTo(wp3.dx, wp3.dy)
      ..lineTo(wp4.dx, wp4.dy)
      ..lineTo(wp5.dx, wp5.dy)
      ..lineTo(wp6.dx, wp6.dy)
      ..lineTo(end.dx, end.dy);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // ── Layer 1: Realistic Map Background ──
          AnimatedBuilder(
            animation: Listenable.merge([
              _mapFadeController,
              _pathDrawController,
              _firePulseController,
            ]),
            builder: (context, _) {
              return FadeTransition(
                opacity: _mapOpacity,
                child: SizedBox.expand(
                  child: CustomPaint(
                    painter: _RealisticMapPainter(
                      pathProgress: _pathProgress.value,
                      routePath: _buildRoutePath(size),
                    ),
                  ),
                ),
              );
            },
          ),

          // ── Layer 2: Fire Location Pin (destination) ──
          if (!_logoPhaseActive)
            AnimatedBuilder(
              animation: Listenable.merge([
                _mapFadeController,
                _firePulseController,
              ]),
              builder: (context, _) {
                final pos = _getFirePosition(size);
                return FadeTransition(
                  opacity: _mapOpacity,
                  child: Stack(
                    children: [
                      // Outer pulsing ring
                      Positioned(
                        left: pos.dx - 30,
                        top: pos.dy - 30,
                        child: Transform.scale(
                          scale: 1.0 + (_firePulse.value * 0.4),
                          child: Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primaryRed.withValues(
                                alpha: 0.15 * (1 - _firePulse.value),
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Inner pulsing ring
                      Positioned(
                        left: pos.dx - 22,
                        top: pos.dy - 22,
                        child: Transform.scale(
                          scale: 1.0 + (_firePulse.value * 0.2),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primaryRed.withValues(
                                alpha: 0.10 * (1 - _firePulse.value),
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Pin marker (teardrop shape)
                      Positioned(
                        left: pos.dx - 22,
                        top: pos.dy - 52,
                        child: CustomPaint(
                          size: const Size(44, 56),
                          painter: _MapPinPainter(color: AppColors.primaryRed),
                        ),
                      ),
                      // Fire icon inside pin
                      Positioned(
                        left: pos.dx - 13,
                        top: pos.dy - 46,
                        child: const Icon(
                          Icons.local_fire_department_rounded,
                          color: Colors.white,
                          size: 26,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),

          // ── Layer 3: Fire Truck (animated along route) ──
          if (_showTruck)
            AnimatedBuilder(
              animation: _pathDrawController,
              builder: (context, _) {
                final pos = _getTruckPosition(size, _pathProgress.value);
                return Positioned(
                  left: pos.dx - 22,
                  top: pos.dy - 22,
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.primaryRed,
                        width: 2.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryRed.withValues(alpha: 0.3),
                          blurRadius: 10,
                          spreadRadius: 1,
                        ),
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.fire_truck_rounded,
                      color: AppColors.primaryRed,
                      size: 22,
                    ),
                  ),
                );
              },
            ),

          // ── Layer 4: Arrival glow ──
          AnimatedBuilder(
            animation: _arrivalGlowController,
            builder: (context, _) {
              if (_arrivalGlow.value == 0) return const SizedBox.shrink();
              final firePos = _getFirePosition(size);
              return Positioned(
                left: firePos.dx - 70,
                top: firePos.dy - 70,
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.primaryRed.withValues(
                          alpha: 0.35 * (1 - _arrivalGlow.value),
                        ),
                        AppColors.fireOrange.withValues(
                          alpha: 0.15 * (1 - _arrivalGlow.value),
                        ),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              );
            },
          ),

          // ── Layer 5: ALAB Logo Intro Overlay ──
          if (_logoPhaseActive)
            AnimatedBuilder(
              animation: Listenable.merge([
                _logoScaleController,
                _logoFadeInController,
                _logoGlowController,
                _logoFadeOutController,
              ]),
              builder: (context, _) {
                final fadeValue = _logoFadeIn.value * _logoFadeOut.value;
                return Container(
                  color: Colors.white,
                  child: Center(
                    child: Opacity(
                      opacity: fadeValue,
                      child: Transform.scale(
                        scale: _logoScale.value,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Warm glow behind logo
                            Stack(
                              alignment: Alignment.center,
                              children: [
                                // Outer warm glow aura
                                Container(
                                  width: 260,
                                  height: 160,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(80),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.primaryRed.withValues(
                                          alpha: 0.12 * _logoGlow.value,
                                        ),
                                        blurRadius: 60,
                                        spreadRadius: 20,
                                      ),
                                      BoxShadow(
                                        color: AppColors.fireOrange.withValues(
                                          alpha: 0.08 * _logoGlow.value,
                                        ),
                                        blurRadius: 40,
                                        spreadRadius: 10,
                                      ),
                                    ],
                                  ),
                                ),
                                // Logo image
                                Image.asset(
                                  'assets/images/logo_alab.png',
                                  width: 240,
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) =>
                                      const Icon(
                                        Icons.local_fire_department_rounded,
                                        color: AppColors.primaryRed,
                                        size: 80,
                                      ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            // Subtitle text
                            Text(
                              'FIRE RESPONSE SYSTEM',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textMuted.withValues(
                                  alpha: _logoGlow.value,
                                ),
                                letterSpacing: 2.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),

          // ── Bottom Text (map phase only) ──
          if (!_logoPhaseActive)
            Positioned(
              bottom: 52,
              left: 0,
              right: 0,
              child: FadeTransition(
                opacity: _mapOpacity,
                child: const Column(
                  children: [
                    Text(
                      'DISPATCHING RESPONSE UNIT',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textDark,
                        letterSpacing: 1.8,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'ALAB Fire Response System',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textMuted,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Realistic Google Maps-style map painter
// ═══════════════════════════════════════════════════════════════

class _RealisticMapPainter extends CustomPainter {
  final double pathProgress;
  final Path routePath;

  _RealisticMapPainter({required this.pathProgress, required this.routePath});

  @override
  void paint(Canvas canvas, Size size) {
    _drawLandBackground(canvas, size);
    _drawWaterFeatures(canvas, size);
    _drawCityBlocks(canvas, size);
    _drawMajorRoads(canvas, size);
    _drawMinorRoads(canvas, size);
    _drawParkAreas(canvas, size);
    _drawBuildingDetails(canvas, size);
    _drawRouteLine(canvas, size);
  }

  /// Base land color — Google Maps style warm light gray
  void _drawLandBackground(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFF1EDE8);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);
  }

  /// River / water body — soft blue, curving through the map
  void _drawWaterFeatures(Canvas canvas, Size size) {
    // Main river
    final riverFill = Paint()
      ..color = const Color(0xFFAAD3DF)
      ..style = PaintingStyle.fill;

    final riverPath = Path()
      ..moveTo(size.width * 0.02, 0)
      ..quadraticBezierTo(
        size.width * 0.10,
        size.height * 0.15,
        size.width * 0.06,
        size.height * 0.30,
      )
      ..quadraticBezierTo(
        size.width * 0.01,
        size.height * 0.48,
        size.width * 0.08,
        size.height * 0.65,
      )
      ..quadraticBezierTo(
        size.width * 0.13,
        size.height * 0.80,
        size.width * 0.05,
        size.height,
      )
      // Return wider for fill
      ..lineTo(size.width * 0.15, size.height)
      ..quadraticBezierTo(
        size.width * 0.20,
        size.height * 0.80,
        size.width * 0.15,
        size.height * 0.65,
      )
      ..quadraticBezierTo(
        size.width * 0.09,
        size.height * 0.48,
        size.width * 0.14,
        size.height * 0.30,
      )
      ..quadraticBezierTo(
        size.width * 0.18,
        size.height * 0.15,
        size.width * 0.12,
        0,
      )
      ..close();

    canvas.drawPath(riverPath, riverFill);

    // River edge highlight
    final riverEdge = Paint()
      ..color = const Color(0xFF94C5D4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawPath(riverPath, riverEdge);
  }

  /// City blocks — varied rectangular shapes between roads (Google Maps style)
  void _drawCityBlocks(Canvas canvas, Size size) {
    // Block color palette — warm grays like real maps
    final blockColors = [
      const Color(0xFFE9E5DE),
      const Color(0xFFEBE7E0),
      const Color(0xFFEDE9E2),
      const Color(0xFFE7E3DC),
      const Color(0xFFEFEBE5),
    ];

    // Grid of city blocks — varied sizes for realism
    final blockDefs = <Rect>[];
    // Row 1 (top)
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.02,
        size.width * 0.10,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.29,
        size.height * 0.02,
        size.width * 0.13,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.45,
        size.height * 0.02,
        size.width * 0.11,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.59,
        size.height * 0.02,
        size.width * 0.15,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.77,
        size.height * 0.02,
        size.width * 0.12,
        size.height * 0.07,
      ),
    ]);
    // Row 2
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.11,
        size.width * 0.10,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.29,
        size.height * 0.11,
        size.width * 0.13,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.45,
        size.height * 0.11,
        size.width * 0.11,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.59,
        size.height * 0.11,
        size.width * 0.08,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.70,
        size.height * 0.11,
        size.width * 0.09,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.82,
        size.height * 0.11,
        size.width * 0.12,
        size.height * 0.09,
      ),
    ]);
    // Row 3
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.22,
        size.width * 0.12,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.31,
        size.height * 0.22,
        size.width * 0.11,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.45,
        size.height * 0.22,
        size.width * 0.14,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.62,
        size.height * 0.22,
        size.width * 0.10,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.75,
        size.height * 0.22,
        size.width * 0.14,
        size.height * 0.08,
      ),
    ]);
    // Row 4
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.33,
        size.width * 0.10,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.29,
        size.height * 0.33,
        size.width * 0.15,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.47,
        size.height * 0.33,
        size.width * 0.12,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.62,
        size.height * 0.33,
        size.width * 0.13,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.78,
        size.height * 0.33,
        size.width * 0.11,
        size.height * 0.07,
      ),
    ]);
    // Row 5
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.43,
        size.width * 0.11,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.30,
        size.height * 0.43,
        size.width * 0.13,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.46,
        size.height * 0.43,
        size.width * 0.10,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.59,
        size.height * 0.43,
        size.width * 0.15,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.77,
        size.height * 0.43,
        size.width * 0.12,
        size.height * 0.09,
      ),
    ]);
    // Row 6
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.55,
        size.width * 0.14,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.33,
        size.height * 0.55,
        size.width * 0.10,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.46,
        size.height * 0.55,
        size.width * 0.12,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.61,
        size.height * 0.55,
        size.width * 0.10,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.74,
        size.height * 0.55,
        size.width * 0.15,
        size.height * 0.08,
      ),
    ]);
    // Row 7
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.66,
        size.width * 0.12,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.31,
        size.height * 0.66,
        size.width * 0.14,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.48,
        size.height * 0.66,
        size.width * 0.10,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.61,
        size.height * 0.66,
        size.width * 0.13,
        size.height * 0.07,
      ),
      Rect.fromLTWH(
        size.width * 0.77,
        size.height * 0.66,
        size.width * 0.12,
        size.height * 0.07,
      ),
    ]);
    // Row 8
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.76,
        size.width * 0.10,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.29,
        size.height * 0.76,
        size.width * 0.15,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.47,
        size.height * 0.76,
        size.width * 0.11,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.61,
        size.height * 0.76,
        size.width * 0.14,
        size.height * 0.09,
      ),
      Rect.fromLTWH(
        size.width * 0.78,
        size.height * 0.76,
        size.width * 0.11,
        size.height * 0.09,
      ),
    ]);
    // Row 9 (bottom)
    blockDefs.addAll([
      Rect.fromLTWH(
        size.width * 0.16,
        size.height * 0.88,
        size.width * 0.13,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.32,
        size.height * 0.88,
        size.width * 0.11,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.46,
        size.height * 0.88,
        size.width * 0.14,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.63,
        size.height * 0.88,
        size.width * 0.10,
        size.height * 0.08,
      ),
      Rect.fromLTWH(
        size.width * 0.76,
        size.height * 0.88,
        size.width * 0.13,
        size.height * 0.08,
      ),
    ]);

    for (int i = 0; i < blockDefs.length; i++) {
      final paint = Paint()..color = blockColors[i % blockColors.length];
      canvas.drawRRect(
        RRect.fromRectAndRadius(blockDefs[i], const Radius.circular(2)),
        paint,
      );
    }
  }

  /// Major roads — wider, white, like Google Maps primary streets
  void _drawMajorRoads(Canvas canvas, Size size) {
    final majorPaint = Paint()
      ..color = const Color(0xFFFFFFFF)
      ..strokeWidth = 8.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Outline for roads (subtle gray edge)
    final majorOutline = Paint()
      ..color = const Color(0xFFD6D2CB)
      ..strokeWidth = 9.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Horizontal major roads
    final hRoads = [0.10, 0.32, 0.54, 0.75, 0.87];
    for (final y in hRoads) {
      // Draw outline first, then white fill
      canvas.drawLine(
        Offset(0, size.height * y),
        Offset(size.width, size.height * y),
        majorOutline,
      );
      canvas.drawLine(
        Offset(0, size.height * y),
        Offset(size.width, size.height * y),
        majorPaint,
      );
    }

    // Vertical major roads
    final vRoads = [0.15, 0.44, 0.60, 0.76, 0.92];
    for (final x in vRoads) {
      canvas.drawLine(
        Offset(size.width * x, 0),
        Offset(size.width * x, size.height),
        majorOutline,
      );
      canvas.drawLine(
        Offset(size.width * x, 0),
        Offset(size.width * x, size.height),
        majorPaint,
      );
    }

    // One diagonal / curved main road
    final diagOutline = Paint()
      ..color = const Color(0xFFD6D2CB)
      ..strokeWidth = 9.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final diagPaint = Paint()
      ..color = const Color(0xFFFFFFFF)
      ..strokeWidth = 8.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final diagPath = Path()
      ..moveTo(size.width * 0.18, size.height * 0.10)
      ..quadraticBezierTo(
        size.width * 0.30,
        size.height * 0.20,
        size.width * 0.44,
        size.height * 0.32,
      );

    canvas.drawPath(diagPath, diagOutline);
    canvas.drawPath(diagPath, diagPaint);
  }

  /// Minor / secondary roads — thinner
  void _drawMinorRoads(Canvas canvas, Size size) {
    final minorPaint = Paint()
      ..color = const Color(0xFFFFFFFF)
      ..strokeWidth = 4.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Horizontal minor roads
    final hMinor = [0.21, 0.42, 0.64, 0.96];
    for (final y in hMinor) {
      canvas.drawLine(
        Offset(size.width * 0.15, size.height * y),
        Offset(size.width, size.height * y),
        minorPaint,
      );
    }

    // Vertical minor roads
    final vMinor = [0.28, 0.37, 0.52, 0.68, 0.84];
    for (final x in vMinor) {
      canvas.drawLine(
        Offset(size.width * x, 0),
        Offset(size.width * x, size.height),
        minorPaint,
      );
    }
  }

  /// Green park/garden areas
  void _drawParkAreas(Canvas canvas, Size size) {
    final parkFill = Paint()..color = const Color(0xFFC8DFA8);
    final parkDarker = Paint()..color = const Color(0xFFB8CF98);

    // Park definitions [Rect, isRound]
    final parks = [
      Rect.fromLTWH(
        size.width * 0.72,
        size.height * 0.12,
        size.width * 0.06,
        size.height * 0.05,
      ),
      Rect.fromLTWH(
        size.width * 0.82,
        size.height * 0.35,
        size.width * 0.08,
        size.height * 0.06,
      ),
      Rect.fromLTWH(
        size.width * 0.30,
        size.height * 0.76,
        size.width * 0.10,
        size.height * 0.04,
      ),
      Rect.fromLTWH(
        size.width * 0.50,
        size.height * 0.56,
        size.width * 0.05,
        size.height * 0.04,
      ),
      Rect.fromLTWH(
        size.width * 0.62,
        size.height * 0.44,
        size.width * 0.09,
        size.height * 0.06,
      ),
    ];

    for (int i = 0; i < parks.length; i++) {
      final p = parks[i];
      final rrect = RRect.fromRectAndRadius(p, const Radius.circular(4));
      canvas.drawRRect(rrect, parkFill);
      // Add a slightly darker inner detail for trees
      final inner = RRect.fromRectAndRadius(
        Rect.fromLTWH(p.left + 3, p.top + 3, p.width - 6, p.height - 6),
        const Radius.circular(3),
      );
      canvas.drawRRect(inner, parkDarker);
    }

    // Larger park with organic shape
    final largeParkPath = Path()
      ..moveTo(size.width * 0.34, size.height * 0.14)
      ..quadraticBezierTo(
        size.width * 0.38,
        size.height * 0.12,
        size.width * 0.42,
        size.height * 0.14,
      )
      ..quadraticBezierTo(
        size.width * 0.44,
        size.height * 0.17,
        size.width * 0.41,
        size.height * 0.19,
      )
      ..quadraticBezierTo(
        size.width * 0.37,
        size.height * 0.20,
        size.width * 0.34,
        size.height * 0.18,
      )
      ..quadraticBezierTo(
        size.width * 0.32,
        size.height * 0.16,
        size.width * 0.34,
        size.height * 0.14,
      )
      ..close();
    canvas.drawPath(largeParkPath, parkFill);
  }

  /// Tiny building footprint details inside blocks
  void _drawBuildingDetails(Canvas canvas, Size size) {
    final rng = Random(99);
    final bldgPaint = Paint()..color = const Color(0xFFDDD9D2);

    // Scatter small rectangles inside blocks to simulate building footprints
    for (int i = 0; i < 60; i++) {
      final x = size.width * (0.18 + rng.nextDouble() * 0.72);
      final y = size.height * (0.03 + rng.nextDouble() * 0.90);
      final w = 4.0 + rng.nextDouble() * 8;
      final h = 4.0 + rng.nextDouble() * 6;

      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, y, w, h),
          const Radius.circular(1),
        ),
        bldgPaint,
      );
    }
  }

  /// Animated red route line
  void _drawRouteLine(Canvas canvas, Size size) {
    if (pathProgress <= 0) return;

    final metrics = routePath.computeMetrics().first;
    final drawLength = metrics.length * pathProgress;
    final partialPath = metrics.extractPath(0, drawLength);

    // Outer glow
    final glowPaint = Paint()
      ..color = AppColors.primaryRed.withValues(alpha: 0.18)
      ..strokeWidth = 16
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(partialPath, glowPaint);

    // Main route line
    final routePaint = Paint()
      ..color = AppColors.primaryRed
      ..strokeWidth = 5.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(partialPath, routePaint);
  }

  @override
  bool shouldRepaint(covariant _RealisticMapPainter oldDelegate) {
    return oldDelegate.pathProgress != pathProgress;
  }
}

// ═══════════════════════════════════════════════════════════════
// Map Pin Painter — teardrop / inverted-drop shape like Google Maps
// ═══════════════════════════════════════════════════════════════

class _MapPinPainter extends CustomPainter {
  final Color color;

  _MapPinPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final shadow = Paint()
      ..color = Colors.black.withValues(alpha: 0.2)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final cx = size.width / 2;

    // Teardrop pin shape
    final path = Path()
      ..moveTo(cx, size.height) // bottom point
      ..quadraticBezierTo(0, size.height * 0.55, 0, size.height * 0.38)
      ..arcToPoint(
        Offset(size.width, size.height * 0.38),
        radius: Radius.circular(size.width / 2),
        clockwise: true,
      )
      ..quadraticBezierTo(size.width, size.height * 0.55, cx, size.height)
      ..close();

    // Shadow
    canvas.save();
    canvas.translate(1, 2);
    canvas.drawPath(path, shadow);
    canvas.restore();

    // Pin fill
    canvas.drawPath(path, paint);

    // Inner white circle
    final innerPaint = Paint()..color = Colors.white.withValues(alpha: 0.25);
    canvas.drawCircle(
      Offset(cx, size.height * 0.38),
      size.width * 0.28,
      innerPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _MapPinPainter oldDelegate) =>
      oldDelegate.color != color;
}
