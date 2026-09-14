import 'package:flutter/material.dart';
import '../services/mobile_bfp_api.dart';
import '../services/mobile_dispatch_store.dart';
import '../theme/app_colors.dart';
import 'incident_detail_sheet.dart';

enum AlertFilter { all, dispatches, system }

class NotificationAlertsSheet extends StatefulWidget {
  final MobileDispatchStore dispatchStore;
  final ValueChanged<int>? onNavigateTab;

  const NotificationAlertsSheet({
    super.key,
    required this.dispatchStore,
    this.onNavigateTab,
  });

  static void show(
    BuildContext context, {
    required MobileDispatchStore dispatchStore,
    ValueChanged<int>? onNavigateTab,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (ctx) => NotificationAlertsSheet(
        dispatchStore: dispatchStore,
        onNavigateTab: onNavigateTab,
      ),
    );
  }

  @override
  State<NotificationAlertsSheet> createState() => _NotificationAlertsSheetState();
}

class _NotificationAlertsSheetState extends State<NotificationAlertsSheet> {
  AlertFilter _activeFilter = AlertFilter.all;
  bool _isRefreshing = false;
  final Set<String> _readAlertIds = {};

  final List<Map<String, dynamic>> _systemAlerts = [
    {
      'id': 'sys-01',
      'type': 'readiness',
      'title': 'BFP Station Bravo on High Readiness',
      'desc': 'Station engine lines E-01 & T-02 are fully staffed and on 24/7 standby.',
      'time': 'Just now',
      'icon': Icons.shield_rounded,
      'color': AppColors.successGreen,
      'bgColor': Color(0xFFECFDF5),
    },
    {
      'id': 'sys-02',
      'type': 'water_sync',
      'title': 'Municipal Hydrants Telemetry Synced',
      'desc': '18 verified drafting points and high-pressure hydrants cached for offline routing.',
      'time': '12m ago',
      'icon': Icons.water_drop_rounded,
      'color': AppColors.infoBlue,
      'bgColor': Color(0xFFEFF6FF),
    },
    {
      'id': 'sys-03',
      'type': 'advisory',
      'title': 'PAGASA Fire Danger Advisory',
      'desc': 'Elevated grassland and brush fire risk recorded in coastal barangays.',
      'time': '1h ago',
      'icon': Icons.warning_amber_rounded,
      'color': AppColors.warningAmber,
      'bgColor': Color(0xFFFFFBEB),
    },
  ];

  Future<void> _handleRefresh() async {
    setState(() => _isRefreshing = true);
    try {
      await widget.dispatchStore.refresh();
    } finally {
      if (mounted) {
        setState(() => _isRefreshing = false);
      }
    }
  }

  void _markAllRead() {
    setState(() {
      for (final a in widget.dispatchStore.assignments) {
        _readAlertIds.add(a.dispatchId);
      }
      for (final s in _systemAlerts) {
        _readAlertIds.add(s['id'] as String);
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: const Row(
          children: [
            Icon(Icons.done_all_rounded, color: AppColors.successGreen, size: 18),
            SizedBox(width: 10),
            Text('All notifications marked as read', style: TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _openMapFor(MobileDispatchAssignment item) {
    widget.dispatchStore.selectDispatch(item.dispatchId);
    Navigator.of(context).pop();
    widget.onNavigateTab?.call(2);
  }

  void _openDetailsFor(MobileDispatchAssignment item) {
    Navigator.of(context).pop();
    IncidentDetailSheet.show(
      context,
      assignment: item,
      onNavigateTab: widget.onNavigateTab,
    );
  }

  @override
  Widget build(BuildContext context) {
    final assignments = widget.dispatchStore.assignments;
    final totalCount = assignments.length + _systemAlerts.length;
    final unreadCount = totalCount - _readAlertIds.length;

    return AnimatedBuilder(
      animation: widget.dispatchStore,
      builder: (context, _) {
        final currentAssignments = widget.dispatchStore.assignments;

        return Container(
          height: MediaQuery.of(context).size.height * 0.82,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 30,
                offset: const Offset(0, -10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: Column(
              children: [
                // ── Tactile Top Drag Pill ──
                const SizedBox(height: 10),
                Center(
                  child: Container(
                    width: 46,
                    height: 5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // ── Sheet Header ──
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Row(
                    children: [
                      // Glowing Red Bell Badge
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppColors.fireGradient,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryRed.withValues(alpha: 0.35),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.notifications_active_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Title & Live Status
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  'Notifications & Alerts',
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.textDark,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                                if (unreadCount > 0) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryRed,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      '$unreadCount',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 3),
                            Row(
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.successGreen,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                const Text(
                                  'Live Dispatch Telemetry Active',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF0F766E),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Close Button
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        behavior: HitTestBehavior.opaque,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.close_rounded,
                            size: 20,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ── Filter Segmented Tabs & Actions ──
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          child: Row(
                            children: [
                              _buildFilterPill(
                                label: 'All',
                                count: totalCount,
                                filter: AlertFilter.all,
                              ),
                              const SizedBox(width: 8),
                              _buildFilterPill(
                                label: 'Dispatches',
                                count: currentAssignments.length,
                                filter: AlertFilter.dispatches,
                                isUrgent: currentAssignments.isNotEmpty,
                              ),
                              const SizedBox(width: 8),
                              _buildFilterPill(
                                label: 'System',
                                count: _systemAlerts.length,
                                filter: AlertFilter.system,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Mark all read button
                      IconButton(
                        tooltip: 'Mark all as read',
                        icon: const Icon(Icons.done_all_rounded, size: 20, color: AppColors.textSubtle),
                        onPressed: _markAllRead,
                        visualDensity: VisualDensity.compact,
                      ),
                      // Refresh button
                      IconButton(
                        tooltip: 'Refresh dispatches',
                        icon: _isRefreshing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryRed),
                              )
                            : const Icon(Icons.refresh_rounded, size: 20, color: AppColors.textSubtle),
                        onPressed: _isRefreshing ? null : _handleRefresh,
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Color(0xFFE2E8F0)),

                // ── Notifications Content List ──
                Expanded(
                  child: _buildAlertsList(currentAssignments),
                ),

                // ── Safe Bottom Footer ──
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: const Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.wifi_tethering_rounded, size: 16, color: AppColors.successGreen),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Antique BFP Provincial Network · Live Telemetry',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textMuted,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          widget.onNavigateTab?.call(1);
                        },
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'View All Incidents',
                          style: TextStyle(
                            color: AppColors.primaryRed,
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFilterPill({
    required String label,
    required int count,
    required AlertFilter filter,
    bool isUrgent = false,
  }) {
    final isSelected = _activeFilter == filter;

    return GestureDetector(
      onTap: () => setState(() => _activeFilter = filter),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected
              ? (isUrgent ? AppColors.primaryRed : const Color(0xFF0F172A))
              : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? (isUrgent ? AppColors.primaryRed : const Color(0xFF0F172A))
                : const Color(0xFFE2E8F0),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: (isUrgent ? AppColors.primaryRed : const Color(0xFF0F172A))
                        .withValues(alpha: 0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Colors.white : AppColors.textDark,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.25)
                    : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? Colors.white : AppColors.textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsList(List<MobileDispatchAssignment> assignments) {
    final showDispatches = _activeFilter == AlertFilter.all || _activeFilter == AlertFilter.dispatches;
    final showSystem = _activeFilter == AlertFilter.all || _activeFilter == AlertFilter.system;

    final hasDispatches = assignments.isNotEmpty && showDispatches;
    final hasSystem = _systemAlerts.isNotEmpty && showSystem;

    if (!hasDispatches && !hasSystem) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFECFDF5),
                  border: Border.all(color: const Color(0xFFA7F3D0), width: 2),
                ),
                child: const Icon(
                  Icons.verified_user_rounded,
                  color: AppColors.successGreen,
                  size: 36,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'All Clear · Standby Mode',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textDark,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'There are currently no active dispatch alerts in your queue. You will be alerted immediately when a new emergency is assigned.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12.5, color: AppColors.textMuted, height: 1.45),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      children: [
        // ── Active Dispatches Section ──
        if (showDispatches && assignments.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                const Icon(Icons.emergency_rounded, size: 16, color: AppColors.primaryRed),
                const SizedBox(width: 6),
                const Text(
                  'PRIORITY DISPATCH ASSIGNMENTS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryRed,
                    letterSpacing: 0.8,
                  ),
                ),
                const Spacer(),
                Text(
                  '${assignments.length} ACTIVE',
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryRed,
                  ),
                ),
              ],
            ),
          ),
          ...assignments.map((item) => _buildDispatchCard(item)),
          const SizedBox(height: 14),
        ],

        // ── System & Broadcasts Section ──
        if (showSystem) ...[
          const Padding(
            padding: EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                Icon(Icons.cell_tower_rounded, size: 16, color: AppColors.textMuted),
                SizedBox(width: 6),
                Text(
                  'STATION TELEMETRY & ADVISORIES',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textMuted,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),
          ..._systemAlerts.map((alert) => _buildSystemCard(alert)),
        ],
      ],
    );
  }

  Widget _buildDispatchCard(MobileDispatchAssignment item) {
    final isRead = _readAlertIds.contains(item.dispatchId);
    final fireTypeName = item.fireType.replaceAll('_', ' ');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isRead ? const Color(0xFFE2E8F0) : const Color(0xFFFECACA),
          width: isRead ? 1.0 : 1.4,
        ),
        boxShadow: [
          BoxShadow(
            color: isRead
                ? const Color(0xFF0F172A).withValues(alpha: 0.03)
                : AppColors.primaryRed.withValues(alpha: 0.08),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            setState(() => _readAlertIds.add(item.dispatchId));
            _openMapFor(item);
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Reference & Badge Row
                Row(
                  children: [
                    // Red Fire Badge
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        gradient: AppColors.fireGradient,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.local_fire_department_rounded,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  item.referenceNumber,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 14,
                                    color: AppColors.textDark,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 112),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: item.reportStatus == 'RESPONDING'
                                        ? const Color(0xFFECFDF5)
                                        : const Color(0xFFFEF2F2),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: item.reportStatus == 'RESPONDING'
                                          ? const Color(0xFFA7F3D0)
                                          : const Color(0xFFFECACA),
                                    ),
                                  ),
                                  child: Text(
                                    item.reportStatus,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                      color: item.reportStatus == 'RESPONDING'
                                          ? AppColors.successGreen
                                          : AppColors.primaryRed,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Text(
                            fireTypeName,
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryRed,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Location & Landmark
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded, size: 14, color: AppColors.primaryRed),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              item.locationSummary,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textDark,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (item.landmark != null && item.landmark!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.near_me_rounded, size: 13, color: AppColors.textMuted),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Landmark: ${item.landmark}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textMuted,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Action Buttons Row
                Row(
                  children: [
                    // Details Button
                    Expanded(
                      flex: 4,
                      child: OutlinedButton(
                        onPressed: () => _openDetailsFor(item),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textDark,
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        child: const Text(
                          'Details',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Tactical Map Button (Primary gradient)
                    Expanded(
                      flex: 6,
                      child: ElevatedButton.icon(
                        onPressed: () => _openMapFor(item),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryRed,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        icon: const Icon(Icons.navigation_rounded, size: 15),
                        label: const Text(
                          'Tactical Route',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSystemCard(Map<String, dynamic> alert) {
    final alertId = alert['id'] as String;
    final isRead = _readAlertIds.contains(alertId);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: alert['bgColor'] as Color,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(
              alert['icon'] as IconData,
              color: alert['color'] as Color,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        alert['title'] as String,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isRead ? FontWeight.w700 : FontWeight.w800,
                          color: AppColors.textDark,
                        ),
                      ),
                    ),
                    Text(
                      alert['time'] as String,
                      style: const TextStyle(fontSize: 10.5, color: AppColors.textSubtle),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  alert['desc'] as String,
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textMuted,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
