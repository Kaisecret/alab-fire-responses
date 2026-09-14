import 'package:flutter/material.dart';

import '../services/mobile_bfp_api.dart';
import '../services/mobile_dispatch_store.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class IncidentsScreen extends StatefulWidget {
  const IncidentsScreen({
    super.key,
    required this.session,
    this.dispatchStore,
    this.onNavigateTab,
  });

  final MobileBfpSession session;
  final MobileDispatchStore? dispatchStore;
  final void Function(int)? onNavigateTab;

  @override
  State<IncidentsScreen> createState() => _IncidentsScreenState();
}

class _IncidentsScreenState extends State<IncidentsScreen> {
  final _api = MobileBfpApi();
  late Future<List<MobileDispatchAssignment>> _assignments;
  String? _startingDispatchId;

  @override
  void initState() {
    super.initState();
    _assignments = widget.dispatchStore?.refresh().then((_) => widget.dispatchStore!.assignments) ?? _api.listDispatchAssignments(widget.session.token);
  }

  Future<void> _refresh() async {
    setState(() => _assignments = widget.dispatchStore?.refresh().then((_) => widget.dispatchStore!.assignments) ?? _api.listDispatchAssignments(widget.session.token));
    await _assignments;
  }

  void _openMapFor(MobileDispatchAssignment assignment) {
    widget.dispatchStore?.selectDispatch(assignment.dispatchId);
    widget.onNavigateTab?.call(2);
  }

  Future<void> _startRoute(MobileDispatchAssignment assignment) async {
    setState(() => _startingDispatchId = assignment.dispatchId);
    try {
      await _api.startDispatchRoute(token: widget.session.token, dispatchId: assignment.dispatchId);
      widget.dispatchStore?.selectDispatch(assignment.dispatchId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.successGreen,
          content: Text('Route acknowledged! Opening tactical route map…'),
          duration: Duration(seconds: 2),
        ),
      );
      await _refresh();
      widget.onNavigateTab?.call(2);
    } on MobileBfpApiException catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _startingDispatchId = null);
    }
  }

  /*
  Future<void> _resolveIncident(MobileDispatchAssignment assignment) async {
    final confirmed = await ResolveIncidentDialog.show(context, assignment);
    /*
    await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        icon: Container(
          width: 52,
          height: 52,
          decoration: const BoxDecoration(color: Color(0xFFECFDF5), shape: BoxShape.circle),
          child: const Icon(Icons.verified_rounded, color: Color(0xFF047857), size: 28),
        ),
        title: const Text('Resolve Fire Incident?', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Are you sure this fire incident is under control and fully resolved?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Text(assignment.fireType.replaceAll('_', ' '), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: AppColors.textDark)),
                  const SizedBox(height: 3),
                  Text(assignment.referenceNumber, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                  const SizedBox(height: 3),
                  Text(assignment.locationSummary, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppColors.primaryRed)),
                ],
              ),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textDark)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF047857),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.check_rounded, size: 16),
                  label: const Text('Confirm', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    */
    if (confirmed != true) return;

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Only Municipal Operations can resolve an incident.')),
    );
  }

  */

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.bgLight,
    appBar: AppBar(
      title: const Text('Assigned Incidents', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark)),
      actions: [IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh_rounded, color: AppColors.textDark))],
    ),
    body: FutureBuilder<List<MobileDispatchAssignment>>(
      future: _assignments,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator(color: AppColors.primaryRed));
        if (snapshot.hasError) return _MessageState(icon: Icons.cloud_off_rounded, title: 'Unable to load dispatches', action: _refresh);
        final assignments = snapshot.data ?? const [];
        if (assignments.isEmpty) return _MessageState(icon: Icons.check_circle_outline_rounded, title: 'No active station dispatches', action: _refresh);
        return RefreshIndicator(
          color: AppColors.primaryRed,
          onRefresh: _refresh,
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 108),
            itemCount: assignments.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (_, index) {
              final assignment = assignments[index];
              final isOnScene = assignment.recipientStatus == 'ON_SCENE';
              final isEnRoute = assignment.recipientStatus == 'EN_ROUTE';
              final isResolved = assignment.recipientStatus == 'COMPLETED';

              return LiquidGlassContainer(
                padding: const EdgeInsets.all(16),
                borderRadius: 20,
                onTap: () => _openMapFor(assignment),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isResolved
                            ? const Color(0xFFF0FDF4)
                            : isOnScene
                                ? const Color(0xFFECFDF5)
                                : const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isResolved
                            ? 'RESOLVED'
                            : isOnScene
                                ? 'ON SCENE'
                                : isEnRoute
                                    ? 'EN ROUTE'
                                    : 'DISPATCHED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: isResolved
                              ? const Color(0xFF15803D)
                              : isOnScene
                                  ? const Color(0xFF047857)
                                  : AppColors.primaryRed,
                        ),
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.map_rounded, size: 20, color: AppColors.primaryRed),
                      tooltip: 'View on map',
                      onPressed: () => _openMapFor(assignment),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  Text(assignment.fireType.replaceAll('_', ' '), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.textDark)),
                  const SizedBox(height: 4),
                  Text(assignment.referenceNumber, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Icon(Icons.location_on_rounded, size: 16, color: AppColors.primaryRed),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          assignment.locationSummary,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textDark),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Assigned station: ${assignment.stationName}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSubtle)),
                  if (!isResolved) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _startingDispatchId == assignment.dispatchId
                                ? null
                                : isEnRoute
                                    ? () => _openMapFor(assignment)
                                    : () => _startRoute(assignment),
                            icon: _startingDispatchId == assignment.dispatchId
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Icon(isEnRoute ? Icons.map_rounded : Icons.route_rounded, size: 17),
                            label: Text(
                              isEnRoute ? 'Route Active · View Map' : 'Acknowledge Route',
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else ...[
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () => _openMapFor(assignment),
                        icon: const Icon(Icons.map_rounded, color: Color(0xFF047857)),
                        label: const Text('View Tactical Map', style: TextStyle(color: Color(0xFF047857), fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ],
                ]),
              );
            },
          ),
        );
      },
    ),
  );
}

class _MessageState extends StatelessWidget {
  const _MessageState({required this.icon, required this.title, required this.action});
  final IconData icon;
  final String title;
  final Future<void> Function() action;
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 44, color: AppColors.textSubtle), const SizedBox(height: 12), Text(title, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textDark)), const SizedBox(height: 10), TextButton(onPressed: action, child: const Text('Try again'))]));
}
