import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum MapLayerMode { incidents, waterSources }

class MapLayerTabs extends StatelessWidget {
  const MapLayerTabs({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  final MapLayerMode selected;
  final ValueChanged<MapLayerMode> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(15),
      boxShadow: const [
        BoxShadow(
          color: Color(0x220F172A),
          blurRadius: 14,
          offset: Offset(0, 4),
        ),
      ],
    ),
    child: Row(
      children: [
        _tab(
          MapLayerMode.incidents,
          'Incidents',
          Icons.local_fire_department_rounded,
        ),
        _tab(
          MapLayerMode.waterSources,
          'Water Sources',
          Icons.water_drop_rounded,
        ),
      ],
    ),
  );

  Widget _tab(MapLayerMode mode, String label, IconData icon) {
    final active = selected == mode;
    return Expanded(
      child: Semantics(
        selected: active,
        child: TextButton.icon(
          onPressed: () => onChanged(mode),
          icon: Icon(icon, size: 17),
          label: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
          style: TextButton.styleFrom(
            minimumSize: const Size(0, 44),
            foregroundColor: active ? Colors.white : AppColors.textDark,
            backgroundColor: active ? AppColors.primaryRed : Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(11),
            ),
            textStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}
