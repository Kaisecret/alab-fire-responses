import 'package:flutter/material.dart';

class AppColors {
  // Brand Fire Crimson & Flame Accents
  static const Color primaryRed = Color(0xFFE5252A);
  static const Color fireRedLight = Color(0xFFFF4E3E);
  static const Color fireRedDark = Color(0xFFC0151A);
  static const Color fireOrange = Color(0xFFFF6A3D);
  static const Color fireAmber = Color(0xFFF59E0B);
  
  // Status Colors
  static const Color successGreen = Color(0xFF10B981);
  static const Color successLight = Color(0xFFECFDF5);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFFFBEB);
  static const Color alertRed = Color(0xFFEF4444);
  static const Color alertLight = Color(0xFFFEF2F2);
  static const Color infoBlue = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFEFF6FF);

  // Background & Surface
  static const Color bgLight = Color(0xFFF5F7FA);
  static const Color bgSurface = Color(0xFFF8FAFC);
  static const Color cardGlassBase = Color(0xFFFFFFFF);

  // Liquid Glass Shines & Borders
  static const Color glassBorderLight = Color(0xFFFFFFFF);
  static const Color glassBorderSubtle = Color(0x33E2E8F0);
  static const Color glassShine = Color(0x66FFFFFF);

  // Text Colors
  static const Color textDark = Color(0xFF141923);
  static const Color textMuted = Color(0xFF64748B);
  static const Color textSubtle = Color(0xFF94A3B8);
  static const Color textWhite = Color(0xFFFFFFFF);

  // Gradients
  static const LinearGradient fireGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFE5252A), Color(0xFFFF5245)],
  );

  static const LinearGradient fireGradientWarm = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFFE5252A), Color(0xFFFF7A45)],
  );

  static const LinearGradient glassBackgroundGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFAFFFFFF),
      Color(0xF0FFFFFF),
      Color(0xEAFFFFFF),
    ],
  );

  static const LinearGradient glassHighlightBorder = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFFFFFFF),
      Color(0x99FFFFFF),
      Color(0x33E2E8F0),
    ],
  );

  static const LinearGradient darkCardGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
  );
}
