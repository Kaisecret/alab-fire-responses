import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class UpdateItemData {
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final String title;
  final String description;
  final String timeAgo;
  final VoidCallback onTap;

  UpdateItemData({
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.title,
    required this.description,
    required this.timeAgo,
    required this.onTap,
  });
}

class LatestUpdatesList extends StatelessWidget {
  final List<UpdateItemData> updates;
  final VoidCallback onViewAll;

  const LatestUpdatesList({
    super.key,
    required this.updates,
    required this.onViewAll,
  });

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
              'LATEST UPDATES',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: AppColors.textDark,
                letterSpacing: 0.8,
              ),
            ),
            GestureDetector(
              onTap: onViewAll,
              child: const Text(
                'View all',
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

        // Update list items
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: updates.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final update = updates[index];
            return LiquidGlassContainer(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              borderRadius: 18,
              onTap: update.onTap,
              child: Row(
                children: [
                  // Icon Tile
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: update.iconBgColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      update.icon,
                      color: update.iconColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Text info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          update.title,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          update.description,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Time and chevron
                  Row(
                    children: [
                      Text(
                        update.timeAgo,
                        style: const TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSubtle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.chevron_right_rounded,
                        size: 16,
                        color: AppColors.textSubtle,
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
