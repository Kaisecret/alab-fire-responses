import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class QuickActionItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  QuickActionItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });
}

class QuickActionsGrid extends StatelessWidget {
  final List<QuickActionItem> actions;

  /// When true the rows grow to share the parent's height (up to
  /// [maxRowHeight] each). The parent must then give the grid a bounded height.
  final bool fillHeight;

  static const double maxRowHeight = 96;

  const QuickActionsGrid({
    super.key,
    required this.actions,
    this.fillHeight = false,
  });

  @override
  Widget build(BuildContext context) {
    final rows = [
      for (int i = 0; i < actions.length; i += 2)
        Row(
          crossAxisAlignment: fillHeight
              ? CrossAxisAlignment.stretch
              : CrossAxisAlignment.center,
          children: [
            Expanded(child: _buildActionCapsule(actions[i])),
            const SizedBox(width: 10),
            if (i + 1 < actions.length)
              Expanded(child: _buildActionCapsule(actions[i + 1]))
            else
              const Expanded(child: SizedBox.shrink()),
          ],
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Title
        const Padding(
          padding: EdgeInsets.only(left: 4.0, bottom: 10.0),
          child: Text(
            'QUICK ACTIONS',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: AppColors.textDark,
              letterSpacing: 0.8,
            ),
          ),
        ),

        // 3 Rows x 2 Columns Grid
        if (fillHeight)
          Expanded(
            child: Column(
              children: [
                for (final row in rows)
                  Flexible(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(
                        maxHeight: maxRowHeight,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 10.0),
                        child: row,
                      ),
                    ),
                  ),
              ],
            ),
          )
        else
          Column(
            children: [
              for (final row in rows)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10.0),
                  child: row,
                ),
            ],
          ),
      ],
    );
  }

  Widget _buildActionCapsule(QuickActionItem action) {
    return LiquidGlassContainer(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      borderRadius: 18,
      onTap: action.onTap,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(action.icon, size: 22, color: AppColors.primaryRed),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              action.label,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                color: AppColors.textDark,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
