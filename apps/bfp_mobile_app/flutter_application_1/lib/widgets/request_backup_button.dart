import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// What the responder asked for.
class RequestBackupResult {
  const RequestBackupResult({
    required this.firetrucks,
    required this.personnel,
    required this.description,
  });

  final int firetrucks;
  final int personnel;
  final String description;
}

const _kOrange = Color(0xFFEA580C);
const _kOrangeDeep = Color(0xFFC2410C);
const _kInk = Color(0xFF0F172A);
const _kMuted = Color(0xFF64748B);
const _kLine = Color(0xFFE2E8F0);

/// Asks what the scene needs before calling for backup.
///
/// A request with nothing in it cannot be sent: the station receiving it has to
/// know what to move, so at least one firetruck or one responder is required.
class RequestBackupSheet extends StatefulWidget {
  const RequestBackupSheet({super.key, required this.referenceNumber});

  final String referenceNumber;

  @override
  State<RequestBackupSheet> createState() => _RequestBackupSheetState();
}

class _RequestBackupSheetState extends State<RequestBackupSheet> {
  final TextEditingController _description = TextEditingController();
  int _firetrucks = 1;
  int _personnel = 0;

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  bool get _hasResources => _firetrucks > 0 || _personnel > 0;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Grabber
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 10, bottom: 6),
                decoration: BoxDecoration(
                  color: _kLine,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),

              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _kOrange.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.campaign_rounded, color: _kOrange, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Request backup',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: _kInk,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.referenceNumber,
                            style: GoogleFonts.robotoMono(fontSize: 11.5, color: _kMuted, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded, color: _kMuted),
                      tooltip: 'Close',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 4),
              const Divider(height: 24, thickness: 1, color: Color(0xFFF1F5F9)),

              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'WHAT DO YOU NEED',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: _kMuted,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _ResourceRow(
                      icon: Icons.fire_truck_rounded,
                      label: 'Firetrucks',
                      value: _firetrucks,
                      onChanged: (value) => setState(() => _firetrucks = value),
                    ),
                    const SizedBox(height: 10),
                    _ResourceRow(
                      icon: Icons.groups_rounded,
                      label: 'Personnel',
                      value: _personnel,
                      onChanged: (value) => setState(() => _personnel = value),
                    ),

                    const SizedBox(height: 20),
                    Text(
                      'WHAT IS HAPPENING',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: _kMuted,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _description,
                      maxLines: 3,
                      maxLength: 240,
                      textCapitalization: TextCapitalization.sentences,
                      style: GoogleFonts.plusJakartaSans(fontSize: 13.5, height: 1.5, color: _kInk),
                      decoration: InputDecoration(
                        hintText: 'Fire is spreading to the next house. Water running low.',
                        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 13, color: const Color(0xFF94A3B8), height: 1.5),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.all(14),
                        counterStyle: GoogleFonts.plusJakartaSans(fontSize: 10.5, color: _kMuted),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: _kLine),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: _kLine),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: _kOrange, width: 1.5),
                        ),
                      ),
                    ),

                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7ED),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFFED7AA)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.info_outline_rounded, size: 16, color: _kOrangeDeep),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Your station is notified first. If they do not forward it, this goes to the province on its own.',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11.5,
                                height: 1.45,
                                color: _kOrangeDeep,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        // Nothing to send means nothing to dispatch.
                        onPressed: _hasResources
                            ? () => Navigator.of(context).pop(
                                  RequestBackupResult(
                                    firetrucks: _firetrucks,
                                    personnel: _personnel,
                                    description: _description.text.trim(),
                                  ),
                                )
                            : null,
                        style: FilledButton.styleFrom(
                          backgroundColor: _kOrange,
                          disabledBackgroundColor: const Color(0xFFCBD5E1),
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(
                          _hasResources ? 'Send request' : 'Add a firetruck or responder',
                          style: GoogleFonts.plusJakartaSans(fontSize: 14.5, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One resource line: label on the left, a stepper on the right.
class _ResourceRow extends StatelessWidget {
  const _ResourceRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String label;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final isSet = value > 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isSet ? const Color(0xFFFFF7ED) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isSet ? const Color(0xFFFED7AA) : _kLine),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: isSet ? _kOrange : _kMuted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: _kInk,
              ),
            ),
          ),
          _StepButton(
            icon: Icons.remove_rounded,
            // 44x44 target, so a gloved hand can still hit it.
            onTap: value > 0 ? () => onChanged(value - 1) : null,
          ),
          SizedBox(
            width: 36,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: isSet ? _kOrangeDeep : _kMuted,
              ),
            ),
          ),
          _StepButton(
            icon: Icons.add_rounded,
            onTap: value < 20 ? () => onChanged(value + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: enabled ? Colors.white : const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
              border: Border.all(color: enabled ? _kLine : Colors.transparent),
            ),
            child: Icon(icon, size: 17, color: enabled ? _kInk : const Color(0xFFCBD5E1)),
          ),
        ),
      ),
    );
  }
}
