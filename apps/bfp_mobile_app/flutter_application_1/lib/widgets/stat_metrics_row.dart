import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class MetricItemData {
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final String title;
  final String count;
  final String actionLabel;
  final VoidCallback onTap;

  MetricItemData({
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.title,
    required this.count,
    required this.actionLabel,
    required this.onTap,
  });
}

class StatMetricsRow extends StatelessWidget {
  final List<MetricItemData> metrics;

  const StatMetricsRow({
    super.key,
    required this.metrics,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const double gap = 10;
        final double itemWidth =
            (constraints.maxWidth - ((metrics.length - 1) * gap)) / metrics.length;

        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: metrics.map((metric) {
            return SizedBox(
              width: itemWidth,
              child: LiquidGlassContainer(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                borderRadius: 20,
                showGlow: true,
                glowColor: metric.iconColor.withValues(alpha: 0.08),
                onTap: metric.onTap,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Top Icon + Large Count
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: metric.iconBgColor,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: metric.iconColor.withValues(alpha: 0.15),
                              width: 1,
                            ),
                          ),
                          child: Icon(
                            metric.icon,
                            size: 18,
                            color: metric.iconColor,
                          ),
                        ),
                        Text(
                          metric.count,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: metric.iconColor,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Title
                    Text(
                      metric.title,
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textDark,
                        letterSpacing: 0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),

                    // Action link with arrow
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            metric.actionLabel,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textMuted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 11,
                          color: AppColors.textMuted,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
