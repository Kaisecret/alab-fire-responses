import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class AssignedIncidentCard extends StatelessWidget {
  final String title;
  final String location;
  final String municipality;
  final String assignTime;
  final VoidCallback onViewAssignment;
  final VoidCallback? onMoreOptions;

  const AssignedIncidentCard({
    super.key,
    this.title = 'Vegetation Fire',
    this.location = 'Brgy. Sto. Nino, San Jose',
    this.municipality = 'San Jose, Occidental Mindoro',
    this.assignTime = '09:21 AM',
    required this.onViewAssignment,
    this.onMoreOptions,
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
              'ASSIGNED INCIDENT',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: AppColors.textDark,
                letterSpacing: 0.8,
              ),
            ),
            GestureDetector(
              onTap: onMoreOptions,
              child: const Icon(
                Icons.more_horiz_rounded,
                size: 18,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Card Container
        LiquidGlassContainer(
          padding: const EdgeInsets.all(12),
          borderRadius: 20,
          height: 145,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Top Row with Flame Icon & Title
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(0xFFFCA5A5).withValues(alpha: 0.5),
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.local_fire_department_rounded,
                      size: 20,
                      color: AppColors.primaryRed,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark,
                            height: 1.1,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(
                              Icons.location_on_rounded,
                              size: 11,
                              color: AppColors.primaryRed,
                            ),
                            const SizedBox(width: 2),
                            Expanded(
                              child: Text(
                                location,
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textMuted,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Location details & Time row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.apartment_rounded,
                          size: 11,
                          color: AppColors.textSubtle,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            municipality,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSubtle,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          Icons.access_time_rounded,
                          size: 11,
                          color: AppColors.textSubtle,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Assign: Time: $assignTime',
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // View Assignment Button
              SizedBox(
                width: double.infinity,
                child: LiquidPillButton(
                  label: 'View Assignment',
                  icon: Icons.arrow_forward_rounded,
                  fontSize: 10.5,
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  onPressed: onViewAssignment,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
