import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum MapLayerMode { incidents, waterSources }

/// Round map control that flips between the incident and water source layers.
/// The icon shows the layer a tap switches to.
class MapLayerToggleButton extends StatelessWidget {
  const MapLayerToggleButton({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  static const Color _waterColor = Color(0xFF0F766E);

  final MapLayerMode selected;
  final ValueChanged<MapLayerMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final showingIncidents = selected == MapLayerMode.incidents;
    final target = showingIncidents
        ? MapLayerMode.waterSources
        : MapLayerMode.incidents;
    final color = showingIncidents ? _waterColor : AppColors.primaryRed;
    final label = showingIncidents ? 'Show water sources' : 'Show incidents';
    return Semantics(
      button: true,
      label: label,
      child: Tooltip(
        message: label,
        child: GestureDetector(
          onTap: () => onChanged(target),
          child: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.95),
              shape: BoxShape.circle,
              border: Border.all(
                color: color.withValues(alpha: 0.35),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.18),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Icon(
              showingIncidents
                  ? Icons.water_drop_rounded
                  : Icons.local_fire_department_rounded,
              size: 20,
              color: color,
            ),
          ),
        ),
      ),
    );
  }
}
