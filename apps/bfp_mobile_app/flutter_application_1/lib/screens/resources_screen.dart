import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class ResourcesScreen extends StatelessWidget {
  const ResourcesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final trucks = [
      {
        'callsign': 'Engine E-01 (Isuzu FTR)',
        'station': 'San Jose Central Station',
        'status': 'ON SCENE',
        'water': '3,800L / 4,000L',
        'waterPercent': 0.95,
        'crew': '5 Firefighters',
        'statusColor': AppColors.primaryRed,
      },
      {
        'callsign': 'Tanker T-02 (Hino 500)',
        'station': 'San Jose Central Station',
        'status': 'EN ROUTE',
        'water': '10,000L / 10,000L',
        'waterPercent': 1.0,
        'crew': '3 Responders',
        'statusColor': AppColors.warningAmber,
      },
      {
        'callsign': 'Rescue Unit R-01',
        'station': 'Magsaysay Municipal Station',
        'status': 'STANDBY READY',
        'water': 'Equipment Only',
        'waterPercent': 1.0,
        'crew': '4 EMT Responders',
        'statusColor': AppColors.successGreen,
      },
      {
        'callsign': 'Engine E-02 (Rosenbauer)',
        'station': 'Rizal Municipal Station',
        'status': 'STANDBY READY',
        'water': '4,000L / 4,000L',
        'waterPercent': 1.0,
        'crew': '5 Firefighters',
        'statusColor': AppColors.successGreen,
      },
    ];

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text(
          'Station Resources & Fleet',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.textDark,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          // Station summary banner
          LiquidGlassContainer(
            padding: const EdgeInsets.all(16),
            borderRadius: 20,
            showGlow: true,
            glowColor: AppColors.primaryRed.withValues(alpha: 0.08),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.apartment_rounded,
                    color: AppColors.primaryRed,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'San Jose Fire Station (Central)',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textDark,
                        ),
                      ),
                      Text(
                        'Provincial Command Center • Occidental Mindoro',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          const Text(
            'DEPLOYED & STANDBY FIRETRUCKS',
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: AppColors.textDark,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),

          // Trucks list
          ...trucks.map((truck) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: LiquidGlassContainer(
                padding: const EdgeInsets.all(14),
                borderRadius: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          truck['callsign'] as String,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: (truck['statusColor'] as Color).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            truck['status'] as String,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: truck['statusColor'] as Color,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${truck['station']} • Crew: ${truck['crew']}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Water Capacity:',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSubtle,
                          ),
                        ),
                        Text(
                          truck['water'] as String,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.infoBlue,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: truck['waterPercent'] as double,
                        minHeight: 6,
                        backgroundColor: const Color(0xFFE2E8F0),
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.infoBlue),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
