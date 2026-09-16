import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

/// What the responder asked for.
class RequestBackupResult {
  const RequestBackupResult({
    required this.firetrucks,
    required this.personnel,
    required this.description,
    this.photos = const [],
  });

  final int firetrucks;
  final int personnel;
  final String description;
  final List<XFile> photos;
}

/// A responder may attach up to this many photographs to one request.
const int kMaxBackupPhotos = 3;

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
  final List<XFile> _photos = [];
  int _firetrucks = 1;
  int _personnel = 0;

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  bool get _hasResources => _firetrucks > 0 || _personnel > 0;

  Future<void> _addPhoto() async {
    if (_photos.length >= kMaxBackupPhotos) return;

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded, color: _kOrange),
              title: Text(
                'Take a photo',
                style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
              ),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded, color: _kOrange),
              title: Text(
                'Choose from gallery',
                style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
              ),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source == null) return;

    // Downscaled on device: these travel over a field connection.
    final picked = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1600,
      maxHeight: 1600,
      imageQuality: 80,
    );
    if (picked == null || !mounted) return;
    setState(() => _photos.add(picked));
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final bottomInset = media.viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        // Never taller than the space the keyboard leaves behind.
        constraints: BoxConstraints(
          maxHeight: media.size.height - media.padding.top - bottomInset - 24,
        ),
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
                      child: const Icon(
                        Icons.campaign_rounded,
                        color: _kOrange,
                        size: 22,
                      ),
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
                            style: GoogleFonts.robotoMono(
                              fontSize: 11.5,
                              color: _kMuted,
                              fontWeight: FontWeight.w600,
                            ),
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

              // The header stays put; the form scrolls under it.
              Flexible(
                child: SingleChildScrollView(
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
                        onChanged: (value) =>
                            setState(() => _firetrucks = value),
                      ),
                      const SizedBox(height: 10),
                      _ResourceRow(
                        icon: Icons.groups_rounded,
                        label: 'Personnel',
                        value: _personnel,
                        onChanged: (value) =>
                            setState(() => _personnel = value),
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
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13.5,
                          height: 1.5,
                          color: _kInk,
                        ),
                        decoration: InputDecoration(
                          hintText:
                              'Fire is spreading to the next house. Water running low.',
                          hintStyle: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            color: const Color(0xFF94A3B8),
                            height: 1.5,
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.all(14),
                          counterStyle: GoogleFonts.plusJakartaSans(
                            fontSize: 10.5,
                            color: _kMuted,
                          ),
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
                            borderSide: const BorderSide(
                              color: _kOrange,
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text(
                            'PHOTOS',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: _kMuted,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${_photos.length} of $kMaxBackupPhotos',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: _kMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 78,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount:
                              _photos.length +
                              (_photos.length < kMaxBackupPhotos ? 1 : 0),
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (context, index) {
                            if (index == _photos.length) {
                              return _AddPhotoTile(onTap: _addPhoto);
                            }
                            return _PhotoTile(
                              file: _photos[index],
                              onRemove: () =>
                                  setState(() => _photos.removeAt(index)),
                            );
                          },
                        ),
                      ),

                      const SizedBox(height: 18),
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
                            const Icon(
                              Icons.info_outline_rounded,
                              size: 16,
                              color: _kOrangeDeep,
                            ),
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
                                    photos: List<XFile>.unmodifiable(_photos),
                                  ),
                                )
                              : null,
                          style: FilledButton.styleFrom(
                            backgroundColor: _kOrange,
                            disabledBackgroundColor: const Color(0xFFCBD5E1),
                            padding: const EdgeInsets.symmetric(vertical: 15),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            _hasResources
                                ? 'Send request'
                                : 'Add a firetruck or responder',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
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
            child: Icon(
              icon,
              size: 17,
              color: enabled ? _kInk : const Color(0xFFCBD5E1),
            ),
          ),
        ),
      ),
    );
  }
}

/// One attached photograph, with a way to take it back off.
class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.file, required this.onRemove});

  final XFile file;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 78,
      height: 78,
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.file(
              File(file.path),
              width: 78,
              height: 78,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                width: 78,
                height: 78,
                color: const Color(0xFFF1F5F9),
                child: const Icon(
                  Icons.broken_image_rounded,
                  color: _kMuted,
                  size: 20,
                ),
              ),
            ),
          ),
          Positioned(
            top: 2,
            right: 2,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  color: Color(0xCC0F172A),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.close_rounded,
                  size: 14,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddPhotoTile extends StatelessWidget {
  const _AddPhotoTile({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 78,
        height: 78,
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _kLine, style: BorderStyle.solid),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.add_a_photo_rounded, color: _kOrange, size: 22),
            const SizedBox(height: 4),
            Text(
              'Add',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                color: _kMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
