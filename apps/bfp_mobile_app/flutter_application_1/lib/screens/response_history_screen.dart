import 'package:flutter/material.dart';

import '../services/mobile_bfp_api.dart';
import '../services/mobile_dispatch_store.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

/// Read-only record of the incidents this responder was dispatched to.
/// Every value comes from the server; nothing here is written by the responder.
class ResponseHistoryScreen extends StatefulWidget {
  const ResponseHistoryScreen({
    super.key,
    required this.session,
    this.dispatchStore,
  });

  final MobileBfpSession session;
  final MobileDispatchStore? dispatchStore;

  @override
  State<ResponseHistoryScreen> createState() => _ResponseHistoryScreenState();
}

class _ResponseHistoryScreenState extends State<ResponseHistoryScreen> {
  final _api = MobileBfpApi();
  final _searchController = TextEditingController();
  late Future<List<MobileDispatchAssignment>> _future;
  String _query = '';
  String? _fireType;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadData() {
    _future = widget.dispatchStore != null
        ? widget.dispatchStore!.fetchResolvedAssignments()
        : _api.listResolvedAssignments(widget.session.token);
  }

  Future<void> _refresh() async {
    setState(_loadData);
    await _future;
  }

  List<MobileDispatchAssignment> _filter(List<MobileDispatchAssignment> rows) {
    final query = _query.trim().toLowerCase();
    return rows.where((row) {
      if (_fireType != null && row.fireTypeLabel != _fireType) return false;
      return query.isEmpty || row.referenceNumber.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppColors.bgLight,
        appBar: AppBar(
          title: const Text(
            'Response History',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark),
          ),
          actions: [
            IconButton(
              onPressed: _refresh,
              tooltip: 'Refresh history',
              icon: const Icon(Icons.refresh_rounded, color: AppColors.textDark),
            ),
          ],
        ),
        body: FutureBuilder<List<MobileDispatchAssignment>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: AppColors.primaryRed, strokeWidth: 2.5));
            }
            if (snapshot.hasError) {
              return _MessageState(
                icon: Icons.cloud_off_rounded,
                title: 'Unable to load response history',
                message: 'Check your internet connection and try again.',
                onRetry: _refresh,
              );
            }
            final all = snapshot.data ?? const <MobileDispatchAssignment>[];
            if (all.isEmpty) {
              return _MessageState(
                icon: Icons.history_rounded,
                title: 'No response history yet',
                message: 'Incidents you responded to appear here after Municipal BFP resolves them.',
                onRetry: _refresh,
              );
            }
            final fireTypes = all.map((row) => row.fireTypeLabel).toSet().toList()..sort();
            final rows = _filter(all);
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) => setState(() => _query = value),
                    decoration: InputDecoration(
                      hintText: 'Search reference number',
                      prefixIcon: const Icon(Icons.search_rounded, size: 20),
                      isDense: true,
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                  ),
                ),
                SizedBox(
                  height: 44,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      for (final type in <String?>[null, ...fireTypes])
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(type ?? 'All'),
                            selected: _fireType == type,
                            onSelected: (_) => setState(() => _fireType = type),
                            selectedColor: const Color(0xFFFEE2E2),
                            labelStyle: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: _fireType == type ? AppColors.fireRedDark : AppColors.textMuted,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.primaryRed,
                    onRefresh: _refresh,
                    child: rows.isEmpty
                        ? ListView(
                            padding: const EdgeInsets.fromLTRB(16, 40, 16, 108),
                            children: const [
                              Text(
                                'No incidents match your search.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                              ),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 6, 16, 108),
                            itemCount: rows.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 12),
                            itemBuilder: (_, index) => _HistoryCard(
                              assignment: rows[index],
                              onTap: () => _ResponseDetailSheet.show(context, rows[index]),
                            ),
                          ),
                  ),
                ),
              ],
            );
          },
        ),
      );
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.assignment, required this.onTap});

  final MobileDispatchAssignment assignment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final assignedAt = assignment.assignedAt;
    return LiquidGlassContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: 20,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _DangerBadge(level: assignment.levelOfDanger),
              const Spacer(),
              Text(
                assignment.referenceNumber,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            assignment.fireTypeLabel,
            style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w900, color: AppColors.textDark),
          ),
          const SizedBox(height: 6),
          _IconLine(icon: Icons.location_on_rounded, text: assignment.locationSummary),
          const SizedBox(height: 8),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              if (assignedAt != null) _IconLine(icon: Icons.event_rounded, text: formatHistoryDate(assignedAt), muted: true),
              _IconLine(icon: Icons.timer_outlined, text: responseText(assignment), muted: true),
            ],
          ),
        ],
      ),
    );
  }
}

String responseText(MobileDispatchAssignment assignment) => assignment.responseSeconds == null
    ? 'Response not recorded'
    : 'Response ${assignment.responseTimeLabel}';

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// Local date only, for example "Oct 1, 2026".
String formatHistoryDate(DateTime value) {
  final local = value.toLocal();
  return '${_months[local.month - 1]} ${local.day}, ${local.year}';
}

/// Local date and time, for example "Oct 1, 2026 · 4:02 PM".
String formatHistoryDateTime(DateTime value) {
  final local = value.toLocal();
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final minute = local.minute.toString().padLeft(2, '0');
  return '${formatHistoryDate(local)} · $hour:$minute ${local.hour < 12 ? 'AM' : 'PM'}';
}

class _DangerBadge extends StatelessWidget {
  const _DangerBadge({required this.level});

  final String? level;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (level) {
      'CRITICAL' => (const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
      'HIGH' => (const Color(0xFFFFEDD5), const Color(0xFFC2410C)),
      'MODERATE' => (const Color(0xFFFEF3C7), const Color(0xFFA16207)),
      'LOW' => (const Color(0xFFDCFCE7), const Color(0xFF15803D)),
      _ => (const Color(0xFFF1F5F9), AppColors.textMuted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(8)),
      child: Text(
        level ?? 'NOT RATED',
        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: foreground, letterSpacing: 0.4),
      ),
    );
  }
}

class _IconLine extends StatelessWidget {
  const _IconLine({required this.icon, required this.text, this.muted = false});

  final IconData icon;
  final String text;
  final bool muted;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: muted ? AppColors.textSubtle : AppColors.primaryRed),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              text,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: muted ? 11.5 : 13,
                fontWeight: muted ? FontWeight.w600 : FontWeight.w800,
                color: muted ? AppColors.textMuted : AppColors.textDark,
              ),
            ),
          ),
        ],
      );
}

class _ResponseDetailSheet extends StatelessWidget {
  const _ResponseDetailSheet({required this.assignment});

  final MobileDispatchAssignment assignment;

  static Future<void> show(BuildContext context, MobileDispatchAssignment assignment) => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _ResponseDetailSheet(assignment: assignment),
      );

  @override
  Widget build(BuildContext context) {
    final a = assignment;
    final arrivedLabel = switch (a.arrivalMethod) {
      'AUTO_GEOFENCE' => 'Arrived · GPS',
      'MANUAL' => 'Arrived · Manual',
      _ => 'Arrived',
    };
    final danger = a.dangerScore == null ? a.levelOfDangerLabel : '${a.levelOfDangerLabel} · ${a.dangerScore}/100';
    final steps = <(String, DateTime?)>[
      ('Dispatched', a.assignedAt),
      ('En Route', a.enRouteAt),
      (arrivedLabel, a.onSceneAt),
      ('Resolved', a.completedAt),
    ];
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Text(a.referenceNumber, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
              const SizedBox(height: 4),
              Text(a.fireTypeLabel, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.textDark)),
              const SizedBox(height: 18),
              const _SectionLabel('Level of Danger'),
              Row(
                children: [
                  _DangerBadge(level: a.levelOfDanger),
                  const SizedBox(width: 10),
                  Text(danger, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                ],
              ),
              const SizedBox(height: 18),
              const _SectionLabel('Response Timeline'),
              for (final (label, time) in steps) _TimelineRow(label: label, time: time),
              const SizedBox(height: 6),
              _IconLine(icon: Icons.timer_outlined, text: responseText(a)),
              const SizedBox(height: 18),
              const _SectionLabel('Location'),
              _IconLine(icon: Icons.location_on_rounded, text: a.locationSummary),
              if (a.landmark != null && a.landmark!.trim().isNotEmpty) ...[
                const SizedBox(height: 6),
                _IconLine(icon: Icons.flag_outlined, text: a.landmark!, muted: true),
              ],
              const SizedBox(height: 6),
              _IconLine(icon: Icons.shield_outlined, text: a.stationName, muted: true),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.textDark),
        ),
      );
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.label, required this.time});

  final String label;
  final DateTime? time;

  @override
  Widget build(BuildContext context) {
    final recorded = time != null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(
            recorded ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
            size: 16,
            color: recorded ? AppColors.successGreen : AppColors.textSubtle,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark)),
          ),
          Text(
            recorded ? formatHistoryDateTime(time!) : 'Not recorded',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: recorded ? AppColors.textMuted : AppColors.textSubtle),
          ),
        ],
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({required this.icon, required this.title, required this.message, required this.onRetry});

  final IconData icon;
  final String title;
  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 44, color: AppColors.textSubtle),
              const SizedBox(height: 14),
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textDark)),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12.5, height: 1.4, color: AppColors.textMuted),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Refresh'),
              ),
            ],
          ),
        ),
      );
}
