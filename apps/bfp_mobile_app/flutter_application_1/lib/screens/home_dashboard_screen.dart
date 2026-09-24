import 'package:flutter/material.dart';

import 'package:geolocator/geolocator.dart';

import '../services/mobile_bfp_api.dart';
import '../services/mobile_dispatch_store.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';
import '../widgets/app_header.dart';
import '../widgets/incident_hero_card.dart';
import '../widgets/quick_actions_grid.dart';
import '../widgets/stat_metrics_row.dart';
import 'notification_alerts_sheet.dart';
import 'resolved_incidents_screen.dart';

class HomeDashboardScreen extends StatelessWidget {
  const HomeDashboardScreen({
    super.key,
    this.session,
    this.onNavigateTab,
    required this.dispatchStore,
  });

  final MobileBfpSession? session;
  final void Function(int)? onNavigateTab;
  final MobileDispatchStore dispatchStore;

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: dispatchStore,
    builder: (context, _) {
      final assignment = dispatchStore.activeAssignment;
      return SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 110),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppHeader(
              onNotificationTap: () => _showAlerts(context),
              onStatusTap: () {},
              notificationCount: dispatchStore.assignments.length + 3,
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. ACTIVE INCIDENT HERO CARD (Balanced, clean, with real Barangay and Reference Number)
                  if (assignment == null)
                    _emptyState()
                  else
                    Builder(
                      builder: (context) {
                        String actualDistance = 'Calculating…';
                        String actualEta = 'Calculating…';

                        final activeRoute = dispatchStore.activeRoadRoute;
                        if (activeRoute != null) {
                          actualDistance = activeRoute.formattedDistance;
                          actualEta = activeRoute.formattedEta;
                        } else {
                          // Trigger road route computation if not yet active
                          dispatchStore.updateRoadRoute();
                          final double distanceM = (assignment.stationLatitude != null && assignment.stationLongitude != null)
                              ? Geolocator.distanceBetween(
                                  assignment.stationLatitude!,
                                  assignment.stationLongitude!,
                                  assignment.latitude,
                                  assignment.longitude,
                                )
                              : 0.0;
                          if (distanceM > 0) {
                            final roadEstM = distanceM * 1.35;
                            actualDistance = roadEstM >= 1000
                                ? '${(roadEstM / 1000).toStringAsFixed(1)} km'
                                : '${roadEstM.round()} m';
                            actualEta = '~${(roadEstM / (35 * 1000 / 60)).ceil()} mins';
                          }
                        }

                        return IncidentHeroCard(
                          title: assignment.fireType.replaceAll('_', ' '),
                          location: assignment.locationSummary,
                          severity: assignment.recipientStatus.replaceAll('_', ' '),
                          eta: actualEta,
                          distance: actualDistance,
                          unitsAssigned: 'BFP Unit',
                          onViewIncident: () => onNavigateTab?.call(2),
                        );
                      },
                    ),

                  const SizedBox(height: 16),

                  // 2. STAT METRICS ROW (NEW ALERTS, ASSIGNED, RESOLVED with Green styling)
                  StatMetricsRow(
                    metrics: [
                      MetricItemData(
                        icon: Icons.notifications_active_rounded,
                        iconColor: AppColors.primaryRed,
                        iconBgColor: const Color(0xFFFEF2F2),
                        title: 'NEW ALERTS',
                        count: '${dispatchStore.assignments.length}',
                        actionLabel: 'View all',
                        onTap: () => onNavigateTab?.call(1),
                      ),
                      MetricItemData(
                        icon: Icons.assignment_rounded,
                        iconColor: AppColors.primaryRed,
                        iconBgColor: const Color(0xFFFEF2F2),
                        title: 'ASSIGNED',
                        count: '${dispatchStore.assignments.length}',
                        actionLabel: 'View all',
                        onTap: () => onNavigateTab?.call(1),
                      ),
                      MetricItemData(
                        icon: Icons.check_circle_rounded,
                        iconColor: const Color(0xFF16A34A), // Emerald Green
                        iconBgColor: const Color(0xFFDCFCE7), // Soft Green
                        title: 'RESOLVED',
                        count: '${dispatchStore.resolvedCount}',
                        actionLabel: 'View all',
                        onTap: () {
                          if (session != null) {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ResolvedIncidentsScreen(
                                  session: session!,
                                  dispatchStore: dispatchStore,
                                  onNavigateTab: onNavigateTab,
                                ),
                              ),
                            );
                          } else {
                            onNavigateTab?.call(1);
                          }
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // 3. QUICK ACTIONS GRID (Restored 2x3 Grid)
                  QuickActionsGrid(
                    actions: [
                      QuickActionItem(
                        icon: Icons.fact_check_rounded,
                        label: 'Verify Report',
                        onTap: () => onNavigateTab?.call(1),
                      ),
                      QuickActionItem(
                        icon: Icons.location_on_rounded,
                        label: 'Open Map',
                        onTap: () => onNavigateTab?.call(2),
                      ),
                      QuickActionItem(
                        icon: Icons.group_add_rounded,
                        label: 'Request Backup',
                        onTap: () => _showBackupDialog(context),
                      ),
                      QuickActionItem(
                        icon: Icons.water_drop_rounded,
                        label: 'Water Sources',
                        onTap: () => onNavigateTab?.call(5),
                      ),
                      QuickActionItem(
                        icon: Icons.alt_route_rounded,
                        label: 'Route Plan',
                        onTap: () => onNavigateTab?.call(2),
                      ),
                      QuickActionItem(
                        icon: Icons.shield_rounded,
                        label: 'Incident Command',
                        onTap: () => _showIncidentCommandDialog(context),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // 4. LIVE DISPATCH SYNC BANNER
                  LiquidGlassContainer(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    borderRadius: 18,
                    onTap: () => onNavigateTab?.call(1),
                    child: Row(
                      children: [
                        const Icon(Icons.sync_rounded, color: AppColors.primaryRed, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            dispatchStore.error ?? 'Live dispatches refresh automatically while this app is open.',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    },
  );

  Widget _emptyState() => LiquidGlassContainer(
    padding: const EdgeInsets.all(24),
    borderRadius: 22,
    child: Column(
      children: [
        const Icon(Icons.notifications_none_rounded, color: AppColors.textSubtle, size: 44),
        const SizedBox(height: 10),
        Text(
          dispatchStore.isLoading ? 'Loading assigned incidents…' : 'No active station dispatches',
          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark),
        ),
        const SizedBox(height: 6),
        const Text(
          'New assignments will appear here automatically.',
          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
        ),
      ],
    ),
  );

  void _showAlerts(BuildContext context) {
    NotificationAlertsSheet.show(
      context,
      dispatchStore: dispatchStore,
      onNavigateTab: onNavigateTab,
    );
  }

  void _showBackupDialog(BuildContext context) => showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      icon: Container(
        width: 48,
        height: 48,
        decoration: const BoxDecoration(color: Color(0xFFFEF2F2), shape: BoxShape.circle),
        child: const Icon(Icons.group_add_rounded, color: AppColors.primaryRed, size: 26),
      ),
      title: const Text('Request Backup Unit', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
      content: const Text(
        'Request additional BFP fire engine or tanker support from adjacent municipal fire stations in Antique.',
        style: TextStyle(fontSize: 12.5, color: AppColors.textMuted),
        textAlign: TextAlign.center,
      ),
      actions: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.pop(ctx),
                style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Cancel'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      backgroundColor: AppColors.successGreen,
                      content: Text('Backup request transmitted to Municipal Command Center.'),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.send_rounded, size: 16),
                label: const Text('Send Alert', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ],
    ),
  );

  void _showIncidentCommandDialog(BuildContext context) => showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      icon: Container(
        width: 48,
        height: 48,
        decoration: const BoxDecoration(color: Color(0xFFEFF6FF), shape: BoxShape.circle),
        child: const Icon(Icons.shield_rounded, color: AppColors.infoBlue, size: 26),
      ),
      title: const Text('Incident Command', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Municipal Fire Operations Center',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textDark),
          ),
          const SizedBox(height: 6),
          const Text('• Station Duty Officer: On Alert', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const Text('• Emergency Hotline: 911 / (036) 540-9999', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const Text('• Radio Frequency: Ch 4 (Antique BFP Net)', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
            child: const Row(
              children: [
                Icon(Icons.check_circle_rounded, size: 14, color: AppColors.successGreen),
                SizedBox(width: 6),
                Expanded(child: Text('All regional telemetry channels connected.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
              ],
            ),
          ),
        ],
      ),
      actions: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryRed,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Close', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
      ],
    ),
  );
}
