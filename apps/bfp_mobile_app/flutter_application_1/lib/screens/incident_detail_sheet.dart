import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/mobile_bfp_api.dart';
import '../theme/app_colors.dart';
import '../theme/liquid_glass.dart';

class IncidentDetailSheet extends StatelessWidget {
  final String title;
  final String location;
  final String severity;
  final String eta;
  final String distance;
  final String unitsAssigned;
  final MobileDispatchAssignment? assignment;
  final ValueChanged<int>? onNavigateTab;
  /// Present when the responder is signed in, which is what allows backup to
  /// be requested from this sheet.
  final String? sessionToken;

  const IncidentDetailSheet({
    super.key,
    this.title = 'Structure Fire',
    this.location = 'Brgy. San Isidro, City of San Jose',
    this.severity = 'HIGH',
    this.eta = '08:12',
    this.distance = '4.2 km',
    this.unitsAssigned = 'E-01, T-02',
    this.assignment,
    this.onNavigateTab,
    this.sessionToken,
  });

  static void show(
    BuildContext context, {
    String? title,
    String? location,
    String? severity,
    String? eta,
    String? distance,
    String? unitsAssigned,
    MobileDispatchAssignment? assignment,
    ValueChanged<int>? onNavigateTab,
    String? sessionToken,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => IncidentDetailSheet(
        title: title ?? (assignment != null ? assignment.fireTypeLabel : 'Structure Fire'),
        location: location ?? (assignment != null ? assignment.locationSummary : 'Brgy. San Isidro, City of San Jose'),
        severity: severity ?? (assignment != null ? assignment.reportStatus : 'HIGH'),
        eta: eta ?? '08:12',
        distance: distance ?? '4.2 km',
        unitsAssigned: unitsAssigned ?? (assignment != null ? assignment.stationName : 'E-01, T-02'),
        assignment: assignment,
        onNavigateTab: onNavigateTab,
        sessionToken: sessionToken,
      ),
    );
  }

  String _formatShortUnits(String rawUnits) {
    if (rawUnits.contains('·')) {
      final part = rawUnits.split('·').first.trim();
      return part.replaceAll('Fire Station', 'Stn').replaceAll('Station', 'Stn');
    }
    return rawUnits;
  }

  String _formatShortSeverity(String raw) {
    final upper = raw.toUpperCase();
    if (upper == 'RESPONDING' || upper == 'ON_SCENE') return 'ON SCENE';
    if (upper == 'COMPLETED' || upper == 'RESOLVED') return 'RESOLVED';
    if (upper == 'EN_ROUTE') return 'EN ROUTE';
    if (upper == 'ASSIGNED') return 'DISPATCHED';
    return raw;
  }

  bool _isResolved(String raw) {
    final upper = raw.toUpperCase();
    return upper == 'COMPLETED' || upper == 'RESOLVED';
  }

  @override
  Widget build(BuildContext context) {
    final shortUnits = _formatShortUnits(unitsAssigned);
    final shortSeverity = _formatShortSeverity(severity);
    final refNumber = assignment?.referenceNumber ?? 'INC-2026-LIVE';

    final isResolvedStatus = _isResolved(severity);

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          const SizedBox(height: 14),

          // Sheet Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isResolvedStatus
                        ? const Color(0xFFECFDF5)
                        : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isResolvedStatus
                          ? const Color(0xFFA7F3D0)
                          : const Color(0xFFFECACA),
                    ),
                  ),
                  child: Icon(
                    isResolvedStatus
                        ? Icons.verified_rounded
                        : Icons.local_fire_department_rounded,
                    color: isResolvedStatus
                        ? const Color(0xFF047857)
                        : AppColors.primaryRed,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: isResolvedStatus
                                  ? const Color(0xFFE6F4EA)
                                  : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              shortSeverity,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                                color: isResolvedStatus
                                    ? const Color(0xFF15803D)
                                    : AppColors.primaryRed,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              refNumber,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF64748B),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        title,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF141923),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded,
                              size: 13, color: AppColors.primaryRed),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              location,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded,
                      color: Color(0xFF64748B), size: 22),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Scrollable Content
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              children: [
                // Quick Info Glass Grid
                LiquidGlassContainer(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
                  borderRadius: 18,
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildDetailCol(
                          'Status',
                          shortSeverity,
                          isResolvedStatus
                              ? const Color(0xFF047857)
                              : AppColors.primaryRed,
                          isResolvedStatus
                              ? Icons.check_circle_rounded
                              : Icons.warning_amber_rounded,
                        ),
                      ),
                      Container(
                          width: 1, height: 28, color: const Color(0xFFE2E8F0)),
                      Expanded(
                        child: _buildDetailCol(
                          'Distance',
                          distance,
                          const Color(0xFF141923),
                          Icons.navigation_rounded,
                        ),
                      ),
                      Container(
                          width: 1, height: 28, color: const Color(0xFFE2E8F0)),
                      Expanded(
                        child: _buildDetailCol(
                          'ETA',
                          eta,
                          AppColors.primaryRed,
                          Icons.timer_rounded,
                        ),
                      ),
                      Container(
                          width: 1, height: 28, color: const Color(0xFFE2E8F0)),
                      Expanded(
                        child: _buildDetailCol(
                          'Unit',
                          shortUnits,
                          const Color(0xFF141923),
                          Icons.fire_truck_rounded,
                        ),
                      ),
                    ],
                  ),
                ),

                // Dedicated Station & Responding Unit Banner
                Container(
                  margin: const EdgeInsets.only(top: 12),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.02),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.shield_outlined,
                            size: 18, color: AppColors.primaryRed),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'ASSIGNED BFP FIRE STATION',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF94A3B8),
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              unitsAssigned,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF141923),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ── Official Incident Dossier Card ──
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.assignment_outlined,
                                color: Color(0xFF2563EB), size: 18),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'OFFICIAL INCIDENT DOSSIER',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF2563EB),
                                    letterSpacing: 0.6,
                                  ),
                                ),
                                Text(
                                  refNumber,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF141923),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(8),
                              border:
                                  Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.verified_rounded,
                                    size: 12, color: Color(0xFF047857)),
                                const SizedBox(width: 4),
                                Text(
                                  'BFP SYNCED',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF047857),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 10),

                      _buildReportRow('Fire Classification', title),
                      const SizedBox(height: 6),
                      _buildReportRow('Barangay Location', location),
                      if (assignment?.landmark != null &&
                          assignment!.landmark!.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _buildReportRow('Landmark', assignment!.landmark!),
                      ],
                      if (assignment != null) ...[
                        const SizedBox(height: 6),
                        _buildReportRow(
                          'GPS Coordinates',
                          '${assignment!.latitude.toStringAsFixed(4)}, ${assignment!.longitude.toStringAsFixed(4)}',
                        ),
                      ],
                      const SizedBox(height: 6),
                      _buildReportRow('Operational Status', shortSeverity),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Read-only record of finished responses
                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      onNavigateTab?.call(3); // Tab 3: Response History
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      backgroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.history_rounded,
                        size: 15, color: Color(0xFF475569)),
                    label: Text(
                      'View Response History',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF475569),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 18),

                // Live Tactical Status Timeline
                Text(
                  'TACTICAL DISPATCH STATUS',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF141923),
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                LiquidGlassContainer(
                  padding: const EdgeInsets.all(14),
                  borderRadius: 18,
                  child: Column(
                    children: [
                      _buildTimelineItem(
                        time: '08:00 AM',
                        title: 'Citizen Emergency Call Verified',
                        subtitle:
                            'Reference $refNumber recorded by Municipal BFP',
                        isFirst: true,
                      ),
                      _buildTimelineItem(
                        time: '08:04 AM',
                        title: 'Units Dispatched: $shortUnits',
                        subtitle: 'Station: $unitsAssigned',
                      ),
                      _buildTimelineItem(
                        time: isResolvedStatus ? '08:45 AM' : '08:07 AM',
                        title: isResolvedStatus
                            ? 'Fire Incident Suppressed & Resolved'
                            : 'Provincial BFP Notified for Backup',
                        subtitle:
                            'Current Operational Status: $shortSeverity',
                        isLast: true,
                        isActive: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Nearest Verified Water Source
                Text(
                  'NEAREST VERIFIED WATER SOURCE',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF141923),
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                LiquidGlassContainer(
                  padding: const EdgeInsets.all(14),
                  borderRadius: 18,
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.water_drop_rounded,
                          color: Color(0xFF2563EB),
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hydrant #SJ-04 (High Pressure)',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF141923),
                              ),
                            ),
                            Text(
                              '350m North • Corner Mabini St. • 55 PSI',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'OPERATIONAL',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF047857),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 130,
          child: Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF64748B),
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF141923),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailCol(
      String label, String value, Color valueColor, IconData icon) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF64748B)),
        const SizedBox(height: 4),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          softWrap: false,
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            color: valueColor,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 9.5,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineItem({
    required String time,
    required String title,
    required String subtitle,
    bool isFirst = false,
    bool isLast = false,
    bool isActive = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive
                    ? AppColors.primaryRed
                    : const Color(0xFFCBD5E1),
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 38,
                color: const Color(0xFFE2E8F0),
              ),
          ],
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
                      title,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.5,
                        fontWeight:
                            isActive ? FontWeight.w800 : FontWeight.w600,
                        color: isActive
                            ? AppColors.primaryRed
                            : const Color(0xFF141923),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    time,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
              Text(
                subtitle,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF64748B),
                ),
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ],
    );
  }
}
