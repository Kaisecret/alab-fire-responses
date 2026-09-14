import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class MiniGisMap extends StatefulWidget {
  final VoidCallback onViewFullMap;
  final VoidCallback? onZoomIn;

  const MiniGisMap({
    super.key,
    required this.onViewFullMap,
    this.onZoomIn,
  });

  @override
  State<MiniGisMap> createState() => _MiniGisMapState();
}

class _MiniGisMapState extends State<MiniGisMap>
    with SingleTickerProviderStateMixin {
  late AnimationController _rippleController;

  @override
  void initState() {
    super.initState();
    _rippleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
  }

  @override
  void dispose() {
    _rippleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'LIVE INCIDENT MAP',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: AppColors.textDark,
                letterSpacing: 0.8,
              ),
            ),
            GestureDetector(
              onTap: widget.onViewFullMap,
              child: const Text(
                'View full map',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryRed,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Map Canvas Box
        LiquidGlassContainer(
          padding: EdgeInsets.zero,
          borderRadius: 20,
          height: 145,
          onTap: widget.onViewFullMap,
          child: Stack(
            children: [
              // Custom GIS Map Painter (Roads, grid, terrain, rivers)
              Positioned.fill(
                child: CustomPaint(
                  painter: _MapRoadsPainter(),
                ),
              ),

              // Animated Radar Pulse Ripples around Fire Epicenter
              Positioned(
                left: 70,
                top: 55,
                child: AnimatedBuilder(
                  animation: _rippleController,
                  builder: (context, child) {
                    return CustomPaint(
                      painter: _RadarPulsePainter(
                        progress: _rippleController.value,
                      ),
                      size: const Size(60, 60),
                    );
                  },
                ),
              ),

              // Main Fire Pin Marker at Center
              Positioned(
                left: 86,
                top: 40,
                child: _buildFirePin(),
              ),

              // Green Responder Marker (Top-Left)
              Positioned(
                left: 20,
                top: 25,
                child: _buildMapBadge(
                  icon: Icons.directions_run_rounded,
                  color: const Color(0xFF10B981),
                  bgColor: const Color(0xFFE6F9F0),
                ),
              ),

              // Water Hydrant Marker (Top-Center-Left)
              Positioned(
                left: 55,
                top: 22,
                child: _buildMapBadge(
                  icon: Icons.water_drop_rounded,
                  color: const Color(0xFF3B82F6),
                  bgColor: const Color(0xFFEFF6FF),
                ),
              ),

              // Firetruck Marker (Top-Right)
              Positioned(
                right: 22,
                top: 26,
                child: _buildMapBadge(
                  icon: Icons.fire_truck_rounded,
                  color: const Color(0xFFEF4444),
                  bgColor: const Color(0xFFFEF2F2),
                ),
              ),

              // Responder Pin (Bottom-Left)
              Positioned(
                left: 28,
                bottom: 22,
                child: _buildMapBadge(
                  icon: Icons.person_pin_circle_rounded,
                  color: const Color(0xFFF97316),
                  bgColor: const Color(0xFFFFF7ED),
                ),
              ),

              // Another Hydrant Marker (Bottom-Right)
              Positioned(
                right: 50,
                bottom: 24,
                child: _buildMapBadge(
                  icon: Icons.water_drop_rounded,
                  color: const Color(0xFF3B82F6),
                  bgColor: const Color(0xFFEFF6FF),
                ),
              ),

              // Zoom In Plus Button (Bottom Right)
              Positioned(
                right: 10,
                bottom: 10,
                child: GestureDetector(
                  onTap: widget.onZoomIn ?? widget.onViewFullMap,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white,
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryRed.withValues(alpha: 0.15),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.add_rounded,
                      size: 16,
                      color: AppColors.primaryRed,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFirePin() {
    return Container(
      width: 32,
      height: 38,
      decoration: const BoxDecoration(
        color: AppColors.primaryRed,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Color(0x66E5252A),
            blurRadius: 10,
            spreadRadius: 1,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: const Center(
        child: Icon(
          Icons.local_fire_department_rounded,
          color: Colors.white,
          size: 20,
        ),
      ),
    );
  }

  Widget _buildMapBadge({
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.3),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Center(
        child: Icon(
          icon,
          size: 12,
          color: Colors.white,
        ),
      ),
    );
  }
}

class _MapRoadsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFF3F7FA);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final roadPaint = Paint()
      ..color = const Color(0xFFE2EAF2)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke;

    final roadSubPaint = Paint()
      ..color = const Color(0xFFEDF2F7)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final highlightRoadPaint = Paint()
      ..color = const Color(0xFFFED7AA).withValues(alpha: 0.6)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    // Grid / Roads
    canvas.drawLine(
      Offset(0, size.height * 0.35),
      Offset(size.width, size.height * 0.42),
      roadPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.3, 0),
      Offset(size.width * 0.35, size.height),
      roadPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.7, 0),
      Offset(size.width * 0.65, size.height),
      roadSubPaint,
    );
    canvas.drawLine(
      Offset(0, size.height * 0.75),
      Offset(size.width, size.height * 0.68),
      roadSubPaint,
    );

    // Diagonal route line to incident
    final path = Path()
      ..moveTo(size.width * 0.15, size.height * 0.8)
      ..quadraticBezierTo(
        size.width * 0.45,
        size.height * 0.65,
        size.width * 0.5,
        size.height * 0.45,
      );
    canvas.drawPath(path, highlightRoadPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _RadarPulsePainter extends CustomPainter {
  final double progress;

  _RadarPulsePainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    for (int i = 0; i < 3; i++) {
      final ringProgress = (progress + (i * 0.33)) % 1.0;
      final radius = 10.0 + (ringProgress * 28.0);
      final opacity = math.max(0.0, 1.0 - ringProgress) * 0.4;

      final paint = Paint()
        ..color = const Color(0xFFEF4444).withValues(alpha: opacity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8;

      final fillPaint = Paint()
        ..color = const Color(0xFFFEF2F2).withValues(alpha: opacity * 0.3)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(center, radius, fillPaint);
      canvas.drawCircle(center, radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _RadarPulsePainter oldDelegate) =>
      oldDelegate.progress != progress;
}
