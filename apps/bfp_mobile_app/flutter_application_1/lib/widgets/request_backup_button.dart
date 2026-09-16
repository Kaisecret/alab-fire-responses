import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/mobile_bfp_api.dart';

/// Calls for backup on an incident the responder is working.
///
/// The request goes to the municipality that owns the incident, and forwards
/// itself to the province if that municipality does not act in time, so the
/// responder never has to chase the escalation.
class RequestBackupButton extends StatefulWidget {
  const RequestBackupButton({
    super.key,
    required this.token,
    required this.dispatchId,
    this.api,
  });

  final String token;
  final String dispatchId;
  final MobileBfpApi? api;

  @override
  State<RequestBackupButton> createState() => _RequestBackupButtonState();
}

class _RequestBackupButtonState extends State<RequestBackupButton> {
  late final MobileBfpApi _api = widget.api ?? MobileBfpApi();
  bool _sending = false;
  bool _sent = false;

  Future<void> _confirmAndSend() async {
    final reasonController = TextEditingController();
    var firetrucks = 1;
    var personnel = 0;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: Text('Request backup', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your station is notified first. If they do not forward it within a minute, it goes to the province automatically.',
                style: GoogleFonts.plusJakartaSans(fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 16),
              _Stepper(
                label: 'Firetrucks',
                value: firetrucks,
                onChanged: (value) => setDialogState(() => firetrucks = value),
              ),
              const SizedBox(height: 8),
              _Stepper(
                label: 'Personnel',
                value: personnel,
                onChanged: (value) => setDialogState(() => personnel = value),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                maxLines: 2,
                maxLength: 200,
                decoration: const InputDecoration(
                  labelText: 'What is happening?',
                  hintText: 'Fire spreading to next house',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD00F09)),
              child: const Text('Send request'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _sending = true);
    try {
      await _api.requestBackup(
        token: widget.token,
        dispatchId: widget.dispatchId,
        reason: reasonController.text,
        requestedFiretrucks: firetrucks,
        requestedPersonnel: personnel,
      );
      if (!mounted) return;
      setState(() => _sent = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Backup requested. Your station has been notified.'),
          backgroundColor: Color(0xFF047857),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error is MobileBfpApiException ? error.message : 'Could not request backup. Try again.'),
          backgroundColor: const Color(0xFFB91C1C),
        ),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _sending || _sent ? null : _confirmAndSend,
        icon: _sending
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : Icon(_sent ? Icons.check_circle_outline : Icons.campaign_outlined),
        label: Text(
          _sending
              ? 'Sending...'
              : _sent
                  ? 'Backup requested'
                  : 'Request backup',
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 14),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: _sent ? const Color(0xFF047857) : const Color(0xFFD00F09),
          foregroundColor: Colors.white,
          disabledBackgroundColor: _sent ? const Color(0xFF047857) : const Color(0xFF94A3B8),
          disabledForegroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.label, required this.value, required this.onChanged});

  final String label;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
        ),
        IconButton(
          onPressed: value > 0 ? () => onChanged(value - 1) : null,
          icon: const Icon(Icons.remove_circle_outline),
          tooltip: 'Fewer $label',
        ),
        SizedBox(
          width: 28,
          child: Text(
            '$value',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800),
          ),
        ),
        IconButton(
          onPressed: value < 20 ? () => onChanged(value + 1) : null,
          icon: const Icon(Icons.add_circle_outline),
          tooltip: 'More $label',
        ),
      ],
    );
  }
}
