import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

enum ResponderStatus {
  available,
  enRoute,
  onScene,
}

class ResponderStatusSelector extends StatelessWidget {
  final ResponderStatus currentStatus;
  final ValueChanged<ResponderStatus> onStatusChanged;

  const ResponderStatusSelector({
    super.key,
    required this.currentStatus,
    required this.onStatusChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Title
        const Padding(
          padding: EdgeInsets.only(left: 4.0, bottom: 8.0),
          child: Text(
            'RESPONDER STATUS',
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: AppColors.textDark,
              letterSpacing: 0.8,
            ),
          ),
        ),

        // 3 Status options across row
        Row(
          children: [
            _buildStatusItem(
              status: ResponderStatus.available,
              title: 'Available',
              subtitle: 'Ready',
              icon: Icons.person_rounded,
              accentColor: AppColors.successGreen,
              bgColor: const Color(0xFFECFDF5),
            ),
            const SizedBox(width: 8),
            _buildStatusItem(
              status: ResponderStatus.enRoute,
              title: 'En Route',
              subtitle: 'On the way',
              icon: Icons.fire_truck_rounded,
              accentColor: AppColors.warningAmber,
              bgColor: const Color(0xFFFFFBEB),
            ),
            const SizedBox(width: 8),
            _buildStatusItem(
              status: ResponderStatus.onScene,
              title: 'On Scene',
              subtitle: 'Active',
              icon: Icons.local_fire_department_rounded,
              accentColor: AppColors.primaryRed,
              bgColor: const Color(0xFFFEF2F2),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatusItem({
    required ResponderStatus status,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required Color bgColor,
  }) {
    final isSelected = currentStatus == status;

    return Expanded(
      child: LiquidGlassContainer(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
        borderRadius: 18,
        showGlow: isSelected,
        glowColor: accentColor.withValues(alpha: 0.25),
        customBorder: isSelected
            ? Border.all(
                color: accentColor.withValues(alpha: 0.8),
                width: 1.6,
              )
            : Border.all(
                color: Colors.white.withValues(alpha: 0.9),
                width: 1.2,
              ),
        onTap: () => onStatusChanged(status),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(9),
                border: Border.all(
                  color: accentColor.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Icon(
                icon,
                color: accentColor,
                size: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                color: isSelected ? accentColor : AppColors.textDark,
                height: 1.1,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w500,
                color: isSelected ? accentColor : AppColors.textSubtle,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
