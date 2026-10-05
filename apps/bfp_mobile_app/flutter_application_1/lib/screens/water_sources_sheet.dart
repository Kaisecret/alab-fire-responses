import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import '../services/water_source_store.dart';
import '../theme/app_colors.dart';

class WaterSourcesSheet extends StatelessWidget {
  const WaterSourcesSheet({
    super.key,
    this.sources = const [],
    this.origin,
    this.onRoute,
  });

  final List<MobileWaterSource> sources;
  final LatLng? origin;
  final ValueChanged<MobileWaterSource>? onRoute;

  static void show(
    BuildContext context, {
    List<MobileWaterSource> sources = const [],
    LatLng? origin,
    ValueChanged<MobileWaterSource>? onRoute,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) =>
        WaterSourcesSheet(sources: sources, origin: origin, onRoute: onRoute),
  );

  @override
  Widget build(BuildContext context) {
    final sorted = [...sources];
    final point = origin;
    double meters(MobileWaterSource source) =>
        const Distance()(point!, LatLng(source.latitude, source.longitude));
    if (point != null) sorted.sort((a, b) => meters(a).compareTo(meters(b)));
    return Container(
      height: MediaQuery.sizeOf(context).height * .75,
      decoration: const BoxDecoration(
        color: AppColors.bgLight,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.water_drop_rounded,
                    color: AppColors.infoBlue,
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Registered water sources',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Close water sources',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: sorted.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'No registered water sources to display.',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: sorted.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final source = sorted[index];
                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                source.exactLocation,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${source.kindLabel} · ${source.municipalityName}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMuted,
                                ),
                              ),
                              if (point != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  '${(meters(source) / 1000).toStringAsFixed(2)} km · straight-line distance',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.infoBlue,
                                  ),
                                ),
                              ],
                              if (onRoute != null) ...[
                                const SizedBox(height: 10),
                                OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.pop(context);
                                    onRoute!(source);
                                  },
                                  icon: const Icon(Icons.alt_route_rounded),
                                  label: const Text('Route from my location'),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
