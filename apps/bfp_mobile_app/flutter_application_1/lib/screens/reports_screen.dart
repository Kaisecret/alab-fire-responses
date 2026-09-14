import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  // 0 = Incident Report, 1 = Daily Report
  int _selectedTab = 0;

  // Selected incident for detailed response report (null = show incident list)
  Map<String, dynamic>? _selectedIncident;

  // Hovered / active card index for animated red highlight
  int? _hoveredIncidentIndex;

  // Filter selection for Incident Reports
  int _selectedFilterIndex = 0;
  final List<String> _filters = [
    'Closed (8)',
    'Completed (12)',
    'Archived (4)',
    'All'
  ];

  // Search controller
  final TextEditingController _searchController = TextEditingController();

  // Completed incidents data list
  final List<Map<String, dynamic>> _completedIncidents = [
    {
      'id': 'INC-2025-0518-0924',
      'title': 'Structure Fire',
      'location': 'Brgy. San Isidro, San Jose',
      'date': 'May 18, 2025 • 12:18 PM',
      'assignedDate': 'May 18, 2025 • 12:21 PM',
      'distance': '2.8 km',
      'severity': 'HIGH',
      'severityColor': const Color(0xFFEF4444),
      'status': 'Closed',
      'statusColor': const Color(0xFF10B981),
      'imageAsset': 'assets/images/burning-house.webp',
      'icon': Icons.local_fire_department_rounded,
      'iconBg': AppColors.primaryRed,
      'buttonText': 'Open Response Report',
    },
    {
      'id': 'INC-2025-0518-0876',
      'title': 'Grass Fire',
      'location': 'Brgy. Mapatag, Hamtic',
      'date': 'May 18, 2025 • 11:45 AM',
      'assignedDate': 'May 18, 2025 • 11:48 AM',
      'distance': '3.6 km',
      'severity': 'MEDIUM',
      'severityColor': const Color(0xFFF97316),
      'status': 'Completed',
      'statusColor': const Color(0xFF10B981),
      'imageAsset': 'assets/images/ChatGPT Image Jul 28, 2026, 02_33_55 AM.webp',
      'icon': Icons.local_fire_department_rounded,
      'iconBg': const Color(0xFFF97316),
      'buttonText': 'View Incident Report',
    },
    {
      'id': 'INC-2025-0518-0821',
      'title': 'Vehicle Fire',
      'location': 'Poblacion, Sibalom',
      'date': 'May 18, 2025 • 10:52 AM',
      'assignedDate': 'May 18, 2025 • 10:55 AM',
      'distance': '4.1 km',
      'severity': 'LOW',
      'severityColor': const Color(0xFF10B981),
      'status': 'Cleared',
      'statusColor': const Color(0xFF10B981),
      'imageAsset': 'assets/images/FOR PROVOCIAL SIDE.webp',
      'icon': Icons.directions_car_rounded,
      'iconBg': const Color(0xFF10B981),
      'buttonText': 'View Incident Report',
    },
    {
      'id': 'INC-2025-0518-0710',
      'title': 'Commercial Fire',
      'location': 'Brgy. Poblacion, San Jose',
      'date': 'May 18, 2025 • 9:37 AM',
      'assignedDate': 'May 18, 2025 • 9:40 AM',
      'distance': '5.2 km',
      'severity': 'HIGH',
      'severityColor': const Color(0xFFEF4444),
      'status': 'Closed',
      'statusColor': const Color(0xFF10B981),
      'imageAsset': 'assets/images/BFPBACK.webp',
      'icon': Icons.business_rounded,
      'iconBg': const Color(0xFFE5252A),
      'buttonText': 'Open Response Report',
    },
  ];

  // Tasks for active incident response
  final List<Map<String, dynamic>> _tasks = [
    {'title': 'Secure perimeter', 'status': 'Completed', 'isDone': true},
    {'title': 'Establish water supply', 'status': 'Completed', 'isDone': true},
    {'title': 'Search structure', 'status': 'In Progress', 'isDone': false},
    {'title': 'Assist evacuation', 'status': 'Pending', 'isDone': false},
    {'title': 'Submit field update', 'status': 'Pending', 'isDone': false},
  ];

  // Field updates list
  final List<Map<String, String>> _fieldUpdates = [
    {
      'time': '12:41 PM',
      'title': 'Fire spreading to adjacent wall.',
      'desc': 'Heavy smoke on Bravo side.',
    },
    {
      'time': '12:33 PM',
      'title': 'Arrived at incident.',
      'desc': 'Crew assessing size-up. Light to moderate smoke showing.',
    },
  ];

  // Notes
  String _responderNotes =
      'One resident evacuated. Hydrant accessible on east side. Primary search on first floor in progress. Coordinate with BRGY for additional manpower if needed.';

  // ═══════════════════════════════════════════════════════════════
  // DAILY REPORTS STATE
  // ═══════════════════════════════════════════════════════════════

  final List<Map<String, dynamic>> _dailyReports = [
    {
      'id': 'DR-2025-0524',
      'date': 'May 24, 2025',
      'shift': 'Shift Alpha (08:00 - 20:00)',
      'station': 'BFP San Jose Station',
      'title': 'Daily Shift Operations & Equipment Inspection',
      'summary':
          'Conducted morning roll call, pump operational testing on Engine 01, hydrant flow tests along Rizal St, and routine fire safety inspection of 4 commercial buildings. All equipment verified in service.',
      'photos': [
        'assets/images/step4_firefighter.webp',
        'assets/images/FOR PROVOCIAL SIDE.webp',
      ],
      'status': 'Submitted',
      'statusColor': const Color(0xFF10B981),
      'submittedAt': 'May 24, 2025 • 7:45 PM',
    },
    {
      'id': 'DR-2025-0523',
      'date': 'May 23, 2025',
      'shift': 'Shift Alpha (08:00 - 20:00)',
      'station': 'BFP San Jose Station',
      'title': 'Community Fire Prevention Drill & Hydrant Maintenance',
      'summary':
          'Organized barangay fire preparedness seminar at Brgy. Funda-Dalipe with 45 attendees. Inspected 8 public hydrants and calibrated SCBA tank pressures.',
      'photos': [
        'assets/images/ChatGPT Image Aug 3, 2026, 09_51_05 PM.webp',
      ],
      'status': 'Submitted',
      'statusColor': const Color(0xFF10B981),
      'submittedAt': 'May 23, 2025 • 6:30 PM',
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // ═══════════════════════════════════════════════════════════════
  // DIALOGS & FORMS
  // ═══════════════════════════════════════════════════════════════

  void _openDailyReportForm({Map<String, dynamic>? existingReport, int? index}) {
    final titleController =
        TextEditingController(text: existingReport?['title'] ?? '');
    final summaryController =
        TextEditingController(text: existingReport?['summary'] ?? '');
    String selectedShift =
        existingReport?['shift'] ?? 'Shift Alpha (08:00 - 20:00)';
    List<String> attachedPhotos =
        List<String>.from(existingReport?['photos'] ?? [
      'assets/images/step4_firefighter.webp',
    ]);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.88,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: Column(
            children: [
              // Top grab bar
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),

              // Sheet Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Color(0xFFFFECEB),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.assignment_add,
                            color: AppColors.primaryRed,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              existingReport == null
                                  ? 'New Daily Report'
                                  : 'Edit Daily Report',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF141923),
                              ),
                            ),
                            Text(
                              'Daily duty logs & shift activity explanation',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.5,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: Color(0xFF64748B)),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1, color: Color(0xFFF1F5F9)),

              // Scrollable Form Fields
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Shift Selector
                      Text(
                        'DUTY SHIFT',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedShift,
                            isExpanded: true,
                            icon: const Icon(Icons.keyboard_arrow_down_rounded,
                                color: Color(0xFF64748B)),
                            items: [
                              'Shift Alpha (08:00 - 20:00)',
                              'Shift Bravo (20:00 - 08:00)',
                              'Special Duty / Training',
                            ].map((s) {
                              return DropdownMenuItem(
                                value: s,
                                child: Text(
                                  s,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF1E293B),
                                  ),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setModalState(() {
                                  selectedShift = val;
                                });
                              }
                            },
                          ),
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Report Title / Duty Activity
                      Text(
                        'REPORT TITLE / DUTY ACTIVITY',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: titleController,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF141923),
                        ),
                        decoration: InputDecoration(
                          hintText:
                              'e.g. Shift Operations, Hydrant Maintenance...',
                          hintStyle: GoogleFonts.plusJakartaSans(
                            color: const Color(0xFF94A3B8),
                            fontSize: 13,
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 14),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Explanation of what happened in that day
                      Text(
                        'EXPLAIN WHAT HAPPENED IN THAT DAY',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: summaryController,
                        maxLines: 5,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF141923),
                          height: 1.45,
                        ),
                        decoration: InputDecoration(
                          hintText:
                              'Detailed narrative of daily tasks, incident responses, equipment status, and personnel observations...',
                          hintStyle: GoogleFonts.plusJakartaSans(
                            color: const Color(0xFF94A3B8),
                            fontSize: 13,
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.all(14),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:
                                const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Attach Photos Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'ATTACH PHOTOS / EVIDENCE',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF64748B),
                              letterSpacing: 0.8,
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              setModalState(() {
                                attachedPhotos.add(
                                    'assets/images/ChatGPT Image Aug 3, 2026, 09_51_05 PM.webp');
                              });
                            },
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.add_photo_alternate_rounded,
                                  size: 15,
                                  color: AppColors.primaryRed,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '+ Add Photo',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.primaryRed,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Attached Photo Gallery
                      Row(
                        children: [
                          ...attachedPhotos.map((p) => Container(
                                margin: const EdgeInsets.only(right: 10),
                                width: 75,
                                height: 75,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                      color: const Color(0xFFE2E8F0)),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(11),
                                  child: Image.asset(
                                    p,
                                    fit: BoxFit.cover,
                                    errorBuilder: (c, e, s) => Container(
                                      color: const Color(0xFFF1F5F9),
                                      child: const Icon(Icons.image, size: 24),
                                    ),
                                  ),
                                ),
                              )),
                          GestureDetector(
                            onTap: () {
                              setModalState(() {
                                attachedPhotos.add(
                                    'assets/images/FOR PROVOCIAL SIDE.webp');
                              });
                            },
                            child: Container(
                              width: 75,
                              height: 75,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(0xFFCBD5E1),
                                  style: BorderStyle.solid,
                                ),
                              ),
                              child: const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.camera_alt_outlined,
                                      size: 22, color: Color(0xFF94A3B8)),
                                  SizedBox(height: 4),
                                  Text(
                                    'Attach',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 28),

                      // Save & Submit Buttons
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                side: const BorderSide(
                                    color: Color(0xFFCBD5E1)),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: () {
                                Navigator.of(ctx).pop();
                              },
                              child: Text(
                                'Save Draft',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Container(
                              height: 50,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFFE5252A),
                                    Color(0xFFB81419)
                                  ],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primaryRed
                                        .withValues(alpha: 0.35),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(14),
                                  onTap: () {
                                    final title = titleController.text.trim().isEmpty
                                        ? 'Daily Station Shift Report'
                                        : titleController.text.trim();
                                    final summary = summaryController.text.trim().isEmpty
                                        ? 'Duty operations logged and submitted.'
                                        : summaryController.text.trim();

                                    setState(() {
                                      if (index != null) {
                                        // Edit existing
                                        _dailyReports[index] = {
                                          ..._dailyReports[index],
                                          'title': title,
                                          'summary': summary,
                                          'shift': selectedShift,
                                          'photos': attachedPhotos,
                                          'submittedAt':
                                              'Just now (Edited & Resubmitted)',
                                        };
                                      } else {
                                        // Add new
                                        _dailyReports.insert(0, {
                                          'id':
                                              'DR-2025-05${25 + _dailyReports.length}',
                                          'date': 'Today',
                                          'shift': selectedShift,
                                          'station': 'BFP San Jose Station',
                                          'title': title,
                                          'summary': summary,
                                          'photos': attachedPhotos,
                                          'status': 'Submitted',
                                          'statusColor':
                                              const Color(0xFF10B981),
                                          'submittedAt': 'Just now',
                                        });
                                      }
                                    });

                                    Navigator.of(ctx).pop();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          index != null
                                              ? 'Daily report updated and resubmitted!'
                                              : 'Daily report successfully submitted!',
                                          style: GoogleFonts.plusJakartaSans(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        backgroundColor: AppColors.textDark,
                                        behavior: SnackBarBehavior.floating,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(12),
                                        ),
                                      ),
                                    );
                                  },
                                  child: Center(
                                    child: Text(
                                      existingReport == null
                                          ? 'Submit Report'
                                          : 'Save & Resubmit',
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _addNewFieldUpdate() {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Add Field Update',
          style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        content: TextField(
          controller: textController,
          maxLines: 3,
          style: GoogleFonts.plusJakartaSans(fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Enter observation or action taken...',
            hintStyle: GoogleFonts.plusJakartaSans(
              color: const Color(0xFF94A3B8),
              fontSize: 13,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cancel',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w700,
                color: const Color(0xFF64748B),
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryRed,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () {
              if (textController.text.trim().isNotEmpty) {
                final now = TimeOfDay.now();
                final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
                final period = now.period == DayPeriod.am ? 'AM' : 'PM';
                final timeStr =
                    '$hour:${now.minute.toString().padLeft(2, '0')} $period';

                setState(() {
                  _fieldUpdates.insert(0, {
                    'time': timeStr,
                    'title': textController.text.trim(),
                    'desc': 'Logged by On-Scene Responder Unit.',
                  });
                });
              }
              Navigator.of(ctx).pop();
            },
            child: Text(
              'Post Update',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _editNotes() {
    final textController = TextEditingController(text: _responderNotes);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Edit Responder Notes',
          style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        content: TextField(
          controller: textController,
          maxLines: 4,
          style: GoogleFonts.plusJakartaSans(fontSize: 13.5),
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cancel',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w700,
                color: const Color(0xFF64748B),
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryRed,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () {
              setState(() {
                _responderNotes = textController.text.trim();
              });
              Navigator.of(ctx).pop();
            },
            child: Text(
              'Save Notes',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN BUILD
  // ═══════════════════════════════════════════════════════════════

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 110),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── 2 Main Toggle Buttons: Incident Report vs Daily Report ──
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0).withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedTab = 0;
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutCubic,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _selectedTab == 0
                                ? Colors.white
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: _selectedTab == 0
                                ? [
                                    BoxShadow(
                                      color:
                                          Colors.black.withValues(alpha: 0.05),
                                      blurRadius: 10,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : [],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.local_fire_department_rounded,
                                size: 18,
                                color: _selectedTab == 0
                                    ? AppColors.primaryRed
                                    : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Incident Report',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: _selectedTab == 0
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: _selectedTab == 0
                                      ? const Color(0xFF141923)
                                      : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedTab = 1;
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          curve: Curves.easeOutCubic,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _selectedTab == 1
                                ? Colors.white
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: _selectedTab == 1
                                ? [
                                    BoxShadow(
                                      color:
                                          Colors.black.withValues(alpha: 0.05),
                                      blurRadius: 10,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : [],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.assignment_turned_in_rounded,
                                size: 18,
                                color: _selectedTab == 1
                                    ? AppColors.primaryRed
                                    : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Daily Report',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: _selectedTab == 1
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: _selectedTab == 1
                                      ? const Color(0xFF141923)
                                      : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // ── Tab Content Switching ──
              _selectedTab == 0
                  ? _buildIncidentReportSection()
                  : _buildDailyReportSection(),
            ],
          ),
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: INCIDENT REPORT (List -> Drill-down to Detail)
  // ═══════════════════════════════════════════════════════════════

  Widget _buildIncidentReportSection() {
    // If an incident is chosen, show Detailed Response Report (Page 2)
    if (_selectedIncident != null) {
      return _buildDetailedResponseReport(_selectedIncident!);
    }

    // Otherwise show the "Choose Completed Incident" list (Page 1)
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Title & Subtitle
        Text(
          'Choose Completed Incident',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF141923),
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: 14),

        // Search Bar & Filter
        Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFFE2E8F0),
                    width: 1.1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search incidents by type, location, or ID...',
                    hintStyle: GoogleFonts.plusJakartaSans(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF94A3B8),
                    ),
                    prefixIcon: const Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: Color(0xFF94A3B8),
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 14,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFFE2E8F0),
                  width: 1.1,
                ),
              ),
              child: const Icon(
                Icons.tune_rounded,
                size: 20,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // Filter Pills Row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: List.generate(_filters.length, (index) {
              final isSelected = _selectedFilterIndex == index;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedFilterIndex = index;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color:
                          isSelected ? const Color(0xFFFEF2F2) : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primaryRed
                            : const Color(0xFFE2E8F0),
                        width: 1.2,
                      ),
                    ),
                    child: Text(
                      _filters[index],
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight:
                            isSelected ? FontWeight.w800 : FontWeight.w600,
                        color: isSelected
                            ? AppColors.primaryRed
                            : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),

        const SizedBox(height: 18),

        // ── List of Completed Incident Cards with Red Hover Animation ──
        ...List.generate(_completedIncidents.length, (i) {
          final inc = _completedIncidents[i];
          final isHovered = _hoveredIncidentIndex == i;

          return Padding(
            padding: const EdgeInsets.only(bottom: 14.0),
            child: _buildInteractiveIncidentCard(
              index: i,
              incident: inc,
              isHighlighted: isHovered,
              onTap: () {
                setState(() {
                  _hoveredIncidentIndex = i;
                  _selectedIncident = inc;
                });
              },
            ),
          );
        }),

        const SizedBox(height: 8),

        // ── Notice Bottom Banner ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFFBBF7D0),
              width: 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.verified_user_rounded,
                  size: 20,
                  color: Color(0xFF16A34A),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'This page shows finished incidents only',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF14532D),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Open a completed incident to review response reports, field updates, photos, notes, and incident progress.',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF166534),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1.2: DETAILED RESPONSE REPORT (Page 2 - Zero Overflows)
  // ═══════════════════════════════════════════════════════════════

  Widget _buildDetailedResponseReport(Map<String, dynamic> inc) {
    final completedCount = _tasks.where((t) => t['isDone'] == true).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Top Back Row to return to incident list
        Row(
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Material(
                color: Colors.transparent,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () {
                    setState(() {
                      _selectedIncident = null;
                    });
                  },
                  child: const Padding(
                    padding: EdgeInsets.all(8.0),
                    child: Icon(
                      Icons.arrow_back_rounded,
                      size: 20,
                      color: AppColors.textDark,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'My assigned response details',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF64748B),
                  ),
                ),
                Text(
                  'My Response',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF141923),
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
          ],
        ),

        const SizedBox(height: 16),

        // ── Hero Assigned Incident Card (Overflow Fixed) ──
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryRed.withValues(alpha: 0.08),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: Stack(
              children: [
                // Right thumbnail
                Positioned(
                  top: 0,
                  right: 0,
                  width: 140,
                  height: 110,
                  child: Opacity(
                    opacity: 0.85,
                    child: Image.asset(
                      inc['imageAsset'] ?? 'assets/images/burning-house.webp',
                      fit: BoxFit.cover,
                      errorBuilder: (c, e, s) => const SizedBox.shrink(),
                    ),
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        Colors.white,
                        Colors.white.withValues(alpha: 0.95),
                        Colors.white.withValues(alpha: 0.35),
                      ],
                    ),
                  ),
                ),

                // Content
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: AppColors.primaryRed,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              Icons.local_fire_department_rounded,
                              color: Colors.white,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'ASSIGNED INCIDENT',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.primaryRed,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  inc['title'] ?? 'Structure Fire',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF141923),
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.location_on_rounded,
                                      size: 13,
                                      color: AppColors.primaryRed,
                                    ),
                                    const SizedBox(width: 3),
                                    Expanded(
                                      child: Text(
                                        inc['location'] ?? 'Brgy. San Isidro',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                          color: const Color(0xFF64748B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 14),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 12),

                      // Meta 2x2 Grid to completely prevent horizontal overflow
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'INCIDENT ID',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 9.0,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF94A3B8),
                                  ),
                                ),
                                Text(
                                  inc['id'] ?? 'INC-2025-0518-0924',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF1E293B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'ASSIGNED',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 9.0,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF94A3B8),
                                  ),
                                ),
                                Text(
                                  inc['assignedDate'] ?? 'May 18 • 12:21 PM',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF1E293B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      Row(
                        children: [
                          Row(
                            children: [
                              Text(
                                'SEVERITY: ',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 9.0,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF94A3B8),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: inc['severityColor'] ??
                                      const Color(0xFFEF4444),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  inc['severity'] ?? 'HIGH',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 9.0,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFE5252A), Color(0xFFB81419)],
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primaryRed
                                      .withValues(alpha: 0.3),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  'ON SCENE',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // ── Assigned Tasks Card (Responsive, Full Width) ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.assignment_outlined,
                        size: 18,
                        color: AppColors.primaryRed,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Assigned Tasks',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF141923),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$completedCount / ${_tasks.length} Completed',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF10B981),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Tasks Checklist
              ...List.generate(_tasks.length, (index) {
                final task = _tasks[index];
                final isDone = task['isDone'] as bool;
                final status = task['status'] as String;

                Color statusColor;
                Color statusBg;
                if (isDone) {
                  statusColor = const Color(0xFF10B981);
                  statusBg = const Color(0xFFECFDF5);
                } else if (status == 'In Progress') {
                  statusColor = const Color(0xFFF97316);
                  statusBg = const Color(0xFFFFF4ED);
                } else {
                  statusColor = const Color(0xFF94A3B8);
                  statusBg = const Color(0xFFF1F5F9);
                }

                return InkWell(
                  onTap: () {
                    setState(() {
                      task['isDone'] = !isDone;
                      task['status'] =
                          task['isDone'] ? 'Completed' : 'Pending';
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6.0),
                    child: Row(
                      children: [
                        Icon(
                          isDone
                              ? Icons.check_circle_rounded
                              : status == 'In Progress'
                                  ? Icons.radio_button_checked_rounded
                                  : Icons.radio_button_unchecked_rounded,
                          size: 18,
                          color: isDone
                              ? const Color(0xFF10B981)
                              : status == 'In Progress'
                                  ? const Color(0xFFF97316)
                                  : const Color(0xFFCBD5E1),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            task['title'] as String,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12.5,
                              fontWeight:
                                  isDone ? FontWeight.w700 : FontWeight.w500,
                              color: isDone
                                  ? const Color(0xFF1E293B)
                                  : const Color(0xFF475569),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            status,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                              color: statusColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Responder Status Stepper Card ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.insights_rounded,
                    size: 18,
                    color: AppColors.primaryRed,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Responder Status',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF141923),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildStatusStep(
                      icon: Icons.radio_outlined,
                      label: 'Dispatched',
                      time: '12:21 PM',
                      isCurrent: false,
                      isDone: true,
                    ),
                    _buildStatusStepLine(),
                    _buildStatusStep(
                      icon: Icons.local_shipping_outlined,
                      label: 'En Route',
                      time: '12:24 PM',
                      isCurrent: false,
                      isDone: true,
                    ),
                    _buildStatusStepLine(),
                    _buildStatusStep(
                      icon: Icons.location_on_outlined,
                      label: 'Arrived',
                      time: '12:31 PM',
                      isCurrent: false,
                      isDone: true,
                    ),
                    _buildStatusStepLine(),
                    _buildStatusStep(
                      icon: Icons.local_fire_department_rounded,
                      label: 'Fire Fighting',
                      time: '12:33 PM',
                      isCurrent: true,
                      isDone: false,
                    ),
                    _buildStatusStepLine(),
                    _buildStatusStep(
                      icon: Icons.shield_outlined,
                      label: 'Contained',
                      time: '—',
                      isCurrent: false,
                      isDone: false,
                    ),
                    _buildStatusStepLine(),
                    _buildStatusStep(
                      icon: Icons.check_circle_outline_rounded,
                      label: 'Cleared',
                      time: '—',
                      isCurrent: false,
                      isDone: false,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Field Updates Card ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 18,
                        color: AppColors.primaryRed,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Field Updates',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF141923),
                        ),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: _addNewFieldUpdate,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryRed,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.add, size: 13, color: Colors.white),
                          const SizedBox(width: 3),
                          Text(
                            'Add Update',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              ...List.generate(_fieldUpdates.length, (i) {
                final u = _fieldUpdates[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        margin: const EdgeInsets.only(top: 4),
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primaryRed,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              u['time']!,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primaryRed,
                              ),
                            ),
                            Text(
                              u['title']!,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1E293B),
                              ),
                            ),
                            Text(
                              u['desc']!,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Photos Gallery Card ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.camera_alt_outlined,
                        size: 18,
                        color: AppColors.primaryRed,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Photos',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF141923),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: const Color(0xFFFECACA), width: 1),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.file_upload_outlined,
                          size: 13,
                          color: AppColors.primaryRed,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          'Upload Photo',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryRed,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: _buildPhotoThumb(
                      'assets/images/burning-house.webp',
                      '1',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildPhotoThumb(
                      'assets/images/step4_firefighter.webp',
                      '2',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildPhotoThumb(
                      'assets/images/ChatGPT Image Aug 3, 2026, 09_51_05 PM.webp',
                      '3',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Responder Notes Card ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.edit_note_rounded,
                        size: 20,
                        color: AppColors.primaryRed,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Responder Notes',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF141923),
                        ),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: _editNotes,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: const Color(0xFFFDE68A), width: 1),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.edit,
                              size: 12, color: Color(0xFFD97706)),
                          const SizedBox(width: 4),
                          Text(
                            'Edit Notes',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFD97706),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFDF5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFDE68A), width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _responderNotes,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF334155),
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        'Updated 12:42 PM',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── Incident Progress Timeline Bar ──
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.timeline_rounded,
                    size: 18,
                    color: AppColors.primaryRed,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Incident Progress',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF141923),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildTimelineNode(
                      icon: Icons.phone_in_talk_rounded,
                      label: 'Reported',
                      time: '12:05 PM',
                      isDone: true,
                      isCurrent: false,
                    ),
                    _buildTimelineConnector(isDone: true),
                    _buildTimelineNode(
                      icon: Icons.check_circle_rounded,
                      label: 'Verified',
                      time: '12:12 PM',
                      isDone: true,
                      isCurrent: false,
                    ),
                    _buildTimelineConnector(isDone: true),
                    _buildTimelineNode(
                      icon: Icons.radio_outlined,
                      label: 'Dispatched',
                      time: '12:21 PM',
                      isDone: true,
                      isCurrent: false,
                    ),
                    _buildTimelineConnector(isDone: true),
                    _buildTimelineNode(
                      icon: Icons.local_shipping_outlined,
                      label: 'En Route',
                      time: '12:24 PM',
                      isDone: true,
                      isCurrent: false,
                    ),
                    _buildTimelineConnector(isDone: true),
                    _buildTimelineNode(
                      icon: Icons.location_on_rounded,
                      label: 'Arrived',
                      time: '12:31 PM',
                      isDone: true,
                      isCurrent: false,
                    ),
                    _buildTimelineConnector(isDone: true),
                    _buildTimelineNode(
                      icon: Icons.local_fire_department_rounded,
                      label: 'Fire Fighting',
                      time: '12:33 PM',
                      isDone: true,
                      isCurrent: true,
                    ),
                    _buildTimelineConnector(isDone: false),
                    _buildTimelineNode(
                      icon: Icons.shield_outlined,
                      label: 'Contained',
                      time: '—',
                      isDone: false,
                      isCurrent: false,
                    ),
                    _buildTimelineConnector(isDone: false),
                    _buildTimelineNode(
                      icon: Icons.check_circle_outline_rounded,
                      label: 'Cleared',
                      time: '—',
                      isDone: false,
                      isCurrent: false,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),
              Center(
                child: Text(
                  'Current Phase: Fire Fighting',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryRed,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: DAILY REPORT (List + Submit & Edit Form)
  // ═══════════════════════════════════════════════════════════════

  Widget _buildDailyReportSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Top Action Header with "+ New Daily Report" Button
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Daily Duty Logs',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF141923),
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Daily responder shift reports & activity logs',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // + New Daily Report Button
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFFE5252A), Color(0xFFB81419)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryRed.withValues(alpha: 0.35),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => _openDailyReportForm(),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: 14.0,
                      vertical: 10.0,
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.add, color: Colors.white, size: 18),
                        SizedBox(width: 6),
                        Text(
                          'New Report',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 18),

        // List of Daily Reports
        ...List.generate(_dailyReports.length, (index) {
          final report = _dailyReports[index];
          final photos = report['photos'] as List<String>;

          return Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFFE2E8F0).withValues(alpha: 0.8),
                width: 1.1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.025),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Report Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(7),
                          decoration: const BoxDecoration(
                            color: Color(0xFFFFECEB),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.assignment_turned_in_rounded,
                            size: 18,
                            color: AppColors.primaryRed,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              report['id'] as String,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF94A3B8),
                              ),
                            ),
                            Text(
                              report['date'] as String,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF141923),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                            color: const Color(0xFFA7F3D0), width: 1),
                      ),
                      child: Text(
                        report['status'] as String,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF10B981),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Shift & Station
                Row(
                  children: [
                    const Icon(Icons.schedule_rounded,
                        size: 13, color: Color(0xFF64748B)),
                    const SizedBox(width: 4),
                    Text(
                      report['shift'] as String,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // Title
                Text(
                  report['title'] as String,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 4),

                // Summary / Explanation
                Text(
                  report['summary'] as String,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF475569),
                    height: 1.45,
                  ),
                ),

                // Attached photos thumbnails if any
                if (photos.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: photos.map((p) {
                      return Container(
                        margin: const EdgeInsets.only(right: 8),
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(7),
                          child: Image.asset(
                            p,
                            fit: BoxFit.cover,
                            errorBuilder: (c, e, s) => Container(
                              color: const Color(0xFFF1F5F9),
                              child: const Icon(Icons.image, size: 18),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],

                const SizedBox(height: 14),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 10),

                // Footer with Submitted Timestamp & Edit & Resubmit Action
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Submitted: ${report['submittedAt']}',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF94A3B8),
                      ),
                    ),

                    // Edit & Resubmit Button
                    InkWell(
                      onTap: () => _openDailyReportForm(
                        existingReport: report,
                        index: index,
                      ),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: const Color(0xFFFECACA),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.edit_outlined,
                              size: 13,
                              color: AppColors.primaryRed,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Edit & Resubmit',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primaryRed,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERACTIVE CARD BUILDERS
  // ═══════════════════════════════════════════════════════════════

  Widget _buildInteractiveIncidentCard({
    required int index,
    required Map<String, dynamic> incident,
    required bool isHighlighted,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isHighlighted
              ? AppColors.primaryRed
              : const Color(0xFFE2E8F0).withValues(alpha: 0.8),
          width: isHighlighted ? 2.0 : 1.1,
        ),
        boxShadow: [
          BoxShadow(
            color: isHighlighted
                ? AppColors.primaryRed.withValues(alpha: 0.12)
                : Colors.black.withValues(alpha: 0.02),
            blurRadius: isHighlighted ? 16 : 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thumbnail with icon badge
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.asset(
                        incident['imageAsset'] as String,
                        width: 78,
                        height: 78,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            Container(
                          width: 78,
                          height: 78,
                          color: const Color(0xFFE2E8F0),
                          child: const Icon(Icons.local_fire_department),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: incident['iconBg'] as Color,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(
                          incident['icon'] as IconData,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),

                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            incident['id'] as String,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF94A3B8),
                            ),
                          ),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: incident['severityColor'] as Color,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  incident['severity'] as String,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: const Color(0xFFA7F3D0),
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  incident['status'] as String,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    color: incident['statusColor'] as Color,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        incident['title'] as String,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF141923),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on_rounded,
                            size: 13,
                            color: AppColors.primaryRed,
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              incident['location'] as String,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Meta row
                      Row(
                        children: [
                          const Icon(
                            Icons.access_time_rounded,
                            size: 12,
                            color: Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              incident['date'] as String,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.near_me_outlined,
                            size: 12,
                            color: Color(0xFF94A3B8),
                          ),
                          const SizedBox(width: 3),
                          Text(
                            incident['distance'] as String,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Action Button at bottom of card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 11),
            decoration: BoxDecoration(
              color: isHighlighted
                  ? AppColors.primaryRed
                  : const Color(0xFFF8FAFC),
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(19),
              ),
              border: Border(
                top: BorderSide(
                  color: isHighlighted
                      ? Colors.transparent
                      : const Color(0xFFF1F5F9),
                  width: 1,
                ),
              ),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onTap,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      incident['buttonText'] as String,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: isHighlighted
                            ? Colors.white
                            : const Color(0xFF334155),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 18,
                      color: isHighlighted
                          ? Colors.white
                          : const Color(0xFF64748B),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusStep({
    required IconData icon,
    required String label,
    required String time,
    required bool isCurrent,
    required bool isDone,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: isCurrent ? const Color(0xFFFEF2F2) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: isCurrent
            ? Border.all(color: AppColors.primaryRed, width: 1.5)
            : null,
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isCurrent
                  ? AppColors.primaryRed
                  : isDone
                      ? const Color(0xFFF1F5F9)
                      : const Color(0xFFF8FAFC),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 16,
              color: isCurrent
                  ? Colors.white
                  : isDone
                      ? const Color(0xFF475569)
                      : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
              color:
                  isCurrent ? AppColors.primaryRed : const Color(0xFF475569),
            ),
          ),
          Text(
            time,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 9,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusStepLine() {
    return Container(
      width: 14,
      height: 1.5,
      color: const Color(0xFFCBD5E1),
    );
  }

  Widget _buildPhotoThumb(String assetPath, String number) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Stack(
        children: [
          Image.asset(
            assetPath,
            height: 75,
            width: double.infinity,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(
              height: 75,
              color: const Color(0xFFE2E8F0),
              child: const Icon(Icons.broken_image, size: 20),
            ),
          ),
          Positioned(
            bottom: 4,
            left: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.65),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  const Icon(Icons.image, size: 10, color: Colors.white),
                  const SizedBox(width: 3),
                  Text(
                    number,
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineNode({
    required IconData icon,
    required String label,
    required String time,
    required bool isDone,
    required bool isCurrent,
  }) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isCurrent
                ? AppColors.primaryRed
                : isDone
                    ? const Color(0xFFFFECEB)
                    : const Color(0xFFF1F5F9),
            shape: BoxShape.circle,
            border: Border.all(
              color: isCurrent
                  ? AppColors.primaryRed
                  : isDone
                      ? const Color(0xFFFECACA)
                      : const Color(0xFFE2E8F0),
              width: 1.5,
            ),
            boxShadow: isCurrent
                ? [
                    BoxShadow(
                      color: AppColors.primaryRed.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : [],
          ),
          child: Icon(
            icon,
            size: 16,
            color: isCurrent
                ? Colors.white
                : isDone
                    ? AppColors.primaryRed
                    : const Color(0xFF94A3B8),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 10,
            fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
            color: isCurrent ? AppColors.primaryRed : const Color(0xFF334155),
          ),
        ),
        Text(
          time,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 9,
            fontWeight: FontWeight.w500,
            color: const Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineConnector({required bool isDone}) {
    return Container(
      width: 22,
      height: 2,
      margin: const EdgeInsets.only(bottom: 24),
      color: isDone ? AppColors.primaryRed : const Color(0xFFCBD5E1),
    );
  }
}
