import 'package:flutter/material.dart';
import '../services/mobile_bfp_api.dart';
import '../services/mobile_dispatch_store.dart';
import '../theme/app_colors.dart';
import 'incident_detail_sheet.dart';
import 'response_history_screen.dart' show formatHistoryDateTime;

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
  bool _isRefreshing = false;
  final Set<String> _readAlertIds = {};

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
    final parentContext = Navigator.of(context).context;
    final store = widget.dispatchStore;
    final onNavigateTab = widget.onNavigateTab;
    setState(() => _readAlertIds.add(item.dispatchId));
    Navigator.of(context).pop();
    IncidentDetailSheet.show(
      parentContext,
      assignment: item,
      onNavigateTab: onNavigateTab,
      sessionToken: store.session.token,
      api: store.api,
      roadRoute: store.activeAssignment?.dispatchId == item.dispatchId ? store.activeRoadRoute : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.dispatchStore,
      builder: (context, _) {
        final currentAssignments = widget.dispatchStore.assignments;
        final syncDelayed = widget.dispatchStore.error != null;
        final unreadCount = currentAssignments.where((item) => !_readAlertIds.contains(item.dispatchId)).length;

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
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: syncDelayed ? AppColors.warningAmber : AppColors.successGreen,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  syncDelayed ? 'Sync delayed · showing last update' : 'Live dispatch queue',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: syncDelayed ? const Color(0xFFB45309) : const Color(0xFF0F766E),
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
                        child: Text(
                          currentAssignments.isEmpty
                              ? 'No active dispatches'
                              : '${currentAssignments.length} active ${currentAssignments.length == 1 ? 'dispatch' : 'dispatches'}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textDark,
                          ),
                        ),
                      ),
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
                      const Icon(Icons.local_fire_department_outlined, size: 16, color: AppColors.textMuted),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'BFP ${widget.dispatchStore.session.identity.municipalityName}',
                          style: const TextStyle(
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

  Widget _buildAlertsList(List<MobileDispatchAssignment> assignments) {
    if (assignments.isEmpty) {
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
        ...assignments.map(_buildDispatchCard),
      ],
    );
  }

  Widget _buildDispatchCard(MobileDispatchAssignment item) {
    final isRead = _readAlertIds.contains(item.dispatchId);
    final fireTypeName = item.fireTypeLabel;

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
                          Text(
                            item.referenceNumber,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 14,
                              color: AppColors.textDark,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  fireTypeName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primaryRed,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 170),
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
                                    item.reportStatus.replaceAll('_', ' '),
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
                          if (item.assignedAt case final assignedAt?) ...[
                            const SizedBox(height: 2),
                            Text(
                              'Dispatched ${formatHistoryDateTime(assignedAt)}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
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
}
