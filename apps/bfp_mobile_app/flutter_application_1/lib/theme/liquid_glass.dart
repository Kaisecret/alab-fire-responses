import 'dart:ui';
import 'package:flutter/material.dart';
import 'app_colors.dart';

class LiquidGlassContainer extends StatelessWidget {
  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final double borderRadius;
  final double blur;
  final Color? baseColor;
  final double opacity;
  final Border? customBorder;
  final bool showGlow;
  final Color glowColor;
  final VoidCallback? onTap;

  const LiquidGlassContainer({
    super.key,
    required this.child,
    this.width,
    this.height,
    this.padding = const EdgeInsets.all(16),
    this.margin = EdgeInsets.zero,
    this.borderRadius = 22,
    this.blur = 16,
    this.baseColor,
    this.opacity = 0.88,
    this.customBorder,
    this.showGlow = false,
    this.glowColor = const Color(0x1AE5252A),
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          // Soft ambient drop shadow
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.05),
            blurRadius: 18,
            spreadRadius: 0,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: const Color(0xFF000000).withValues(alpha: 0.03),
            blurRadius: 4,
            spreadRadius: 0,
            offset: const Offset(0, 2),
          ),
          if (showGlow)
            BoxShadow(
              color: glowColor,
              blurRadius: 24,
              spreadRadius: 2,
              offset: const Offset(0, 6),
            ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(borderRadius),
              color: (baseColor ?? AppColors.cardGlassBase).withValues(alpha: opacity),
              border: customBorder ??
                  Border.all(
                    color: Colors.white.withValues(alpha: 0.95),
                    width: 1.4,
                  ),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  (baseColor ?? Colors.white).withValues(alpha: opacity),
                  (baseColor ?? Colors.white).withValues(alpha: opacity * 0.92),
                  const Color(0xFFF8FAFC).withValues(alpha: opacity * 0.85),
                ],
                stops: const [0.0, 0.6, 1.0],
              ),
            ),
            child: child,
          ),
        ),
      ),
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(borderRadius),
          onTap: onTap,
          splashColor: AppColors.primaryRed.withValues(alpha: 0.08),
          highlightColor: AppColors.primaryRed.withValues(alpha: 0.04),
          child: content,
        ),
      );
    }

    return content;
  }
}

class LiquidPillButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback onPressed;
  final Gradient? gradient;
  final Color? textColor;
  final double fontSize;
  final EdgeInsetsGeometry padding;
  final bool hasGlow;

  const LiquidPillButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.gradient,
    this.textColor,
    this.fontSize = 13,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    this.hasGlow = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: gradient ?? AppColors.fireGradient,
        boxShadow: hasGlow
            ? [
                BoxShadow(
                  color: const Color(0xFFE5252A).withValues(alpha: 0.35),
                  blurRadius: 12,
                  spreadRadius: 0,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(30),
          onTap: onPressed,
          child: Padding(
            padding: padding,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: textColor ?? Colors.white,
                    fontSize: fontSize,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                  ),
                ),
                if (icon != null) ...[
                  const SizedBox(width: 6),
                  Icon(
                    icon,
                    color: textColor ?? Colors.white,
                    size: fontSize + 2,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
