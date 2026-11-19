import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../services/auth_service.dart';
import '../../services/bouncer_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';

/// User-facing text for any error raised in the bouncer module.
String bouncerError(Object e) {
  if (e is BouncerException) return e.message;
  if (e is LocationException) return e.message;
  return AuthService.friendlyError(e);
}

/// Runs [action], shows [done] or a friendly error. Returns true on success.
Future<bool> runAction(
  BuildContext context,
  Future<void> Function() action, {
  String? done,
}) async {
  try {
    await action();
    if (context.mounted && done != null) showMessage(context, done);
    return true;
  } catch (e) {
    debugPrint('bouncer action failed: $e');
    if (context.mounted) showMessage(context, bouncerError(e));
    return false;
  }
}

Color verificationColor(String s) => switch (s) {
  VerificationStatus.verified => HavenColors.accepted,
  VerificationStatus.pending || VerificationStatus.draft => HavenColors.pending,
  _ => HavenColors.declined,
};

/// Verification state with next steps; shown on the home tab.
class VerificationCard extends StatelessWidget {
  final Personnel personnel;
  final VoidCallback onOpenProfile;
  const VerificationCard({
    super.key,
    required this.personnel,
    required this.onOpenProfile,
  });

  @override
  Widget build(BuildContext context) {
    final p = personnel;
    final s = p.verificationStatus;
    final (IconData icon, String next, String? action) = switch (s) {
      VerificationStatus.draft => (
        Icons.edit_note_rounded,
        'Complete your profile and upload your ID, then submit it for verification.',
        'Complete profile',
      ),
      VerificationStatus.pending => (
        Icons.hourglass_top_rounded,
        'Thanks! Our team is reviewing your profile. We\'ll notify you once it\'s done.',
        'View profile',
      ),
      VerificationStatus.needsCorrection => (
        Icons.report_gmailerrorred_rounded,
        'A few things need fixing before we can verify you.',
        'Fix and resubmit',
      ),
      VerificationStatus.verified => (
        Icons.verified_rounded,
        'You\'re verified and can accept assignments.',
        null,
      ),
      VerificationStatus.rejected => (
        Icons.block_rounded,
        'Your profile wasn\'t approved. You can update it and submit again.',
        'Update profile',
      ),
      VerificationStatus.expired => (
        Icons.event_busy_outlined,
        'Your verification has expired. Please review your details and resubmit.',
        'Review profile',
      ),
      VerificationStatus.suspended => (
        Icons.pause_circle_outline,
        'Your profile is suspended. Please contact your agency or Haven support.',
        null,
      ),
      _ => (Icons.info_outline, '', null),
    };
    final color = verificationColor(s);
    return Surface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconBadge(icon, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Verification',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      VerificationStatus.label(s),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
              if (p.code.isNotEmpty) Pill(p.code, color: HavenColors.muted),
            ],
          ),
          const SizedBox(height: 12),
          Text(next, style: const TextStyle(height: 1.4)),
          if (p.adminRemarks.isNotEmpty &&
              (s == VerificationStatus.needsCorrection ||
                  s == VerificationStatus.rejected ||
                  s == VerificationStatus.suspended)) ...[
            const SizedBox(height: 10),
            SoftBanner(
              icon: Icons.chat_bubble_outline,
              color: HavenColors.declined,
              text: 'Reviewer: ${p.adminRemarks}',
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: 14),
            SecondaryButton(label: action, onPressed: onOpenProfile),
          ],
        ],
      ),
    );
  }
}

/// Compact job card used on the home and assignments tabs.
class AssignmentCard extends StatelessWidget {
  final Assignment assignment;
  final VoidCallback onTap;
  const AssignmentCard({
    super.key,
    required this.assignment,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final a = assignment;
    final (String label, Color color) = switch (a.status) {
      AssignmentStatus.offered => ('New offer', HavenColors.accepted),
      AssignmentStatus.accepted when a.checkOut != null => (
        'Checked out',
        HavenColors.completed,
      ),
      AssignmentStatus.accepted when a.checkIn != null => (
        'On duty',
        HavenColors.accepted,
      ),
      AssignmentStatus.accepted when a.isPast => (
        'Completed',
        HavenColors.completed,
      ),
      AssignmentStatus.accepted => ('Accepted', HavenColors.accepted),
      AssignmentStatus.declined => ('Declined', HavenColors.declined),
      AssignmentStatus.withdrawn => ('Withdrawn', HavenColors.declined),
      _ => (a.status, HavenColors.muted),
    };
    return Surface(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const IconBadge(Icons.work_outline_rounded),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.serviceLabel.isEmpty ? 'Assignment' : a.serviceLabel,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      [
                        a.eventType,
                        a.agencyName,
                      ].where((s) => s.isNotEmpty).join(' · '),
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Pill(label, color: color),
            ],
          ),
          const HairlineDivider(vertical: 10),
          Row(
            children: [
              const Icon(
                Icons.calendar_today_outlined,
                size: 16,
                color: HavenColors.sage,
              ),
              const SizedBox(width: 6),
              Text(
                '${DateFormat('EEE d MMM · h:mm a').format(a.eventDate)} · ${a.hours} h',
                style: const TextStyle(fontSize: 13),
              ),
            ],
          ),
          if (a.location.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: 16,
                  color: HavenColors.sage,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    a.location,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
          ],
          if (a.isOffered && a.respondBy != null) ...[
            const SizedBox(height: 8),
            Text(
              'Respond by ${DateFormat('EEE d MMM, h:mm a').format(a.respondBy!)}',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: a.respondBy!.isBefore(DateTime.now())
                    ? HavenColors.declined
                    : HavenColors.muted,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Wrap of selectable chips (multi-select).
class ChoiceChips extends StatelessWidget {
  final Map<String, String> options;
  final List<String> selected;
  final ValueChanged<List<String>>? onChanged;
  const ChoiceChips({
    super.key,
    required this.options,
    required this.selected,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final e in options.entries)
          FilterChip(
            label: Text(e.value),
            selected: selected.contains(e.key),
            onSelected: onChanged == null
                ? null
                : (v) => onChanged!(
                    v
                        ? [...selected, e.key]
                        : selected.where((k) => k != e.key).toList(),
                  ),
          ),
      ],
    );
  }
}

/// Free-text tags: type and press add; tap a chip to remove it.
class TagInput extends StatefulWidget {
  final String label;
  final String hint;
  final List<String> values;
  final ValueChanged<List<String>>? onChanged;
  const TagInput({
    super.key,
    required this.label,
    required this.hint,
    required this.values,
    this.onChanged,
  });

  @override
  State<TagInput> createState() => _TagInputState();
}

class _TagInputState extends State<TagInput> {
  final _c = TextEditingController();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _add() {
    final v = _c.text.trim();
    if (v.isEmpty || widget.values.contains(v)) return;
    widget.onChanged?.call([...widget.values, v]);
    _c.clear();
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onChanged != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (enabled)
          TextField(
            controller: _c,
            textCapitalization: TextCapitalization.words,
            onSubmitted: (_) => _add(),
            decoration: InputDecoration(
              labelText: widget.label,
              hintText: widget.hint,
              suffixIcon: IconButton(
                icon: const Icon(Icons.add_circle_outline),
                onPressed: _add,
              ),
            ),
          )
        else
          Text(widget.label, style: Theme.of(context).textTheme.bodySmall),
        if (widget.values.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final v in widget.values)
                InputChip(
                  label: Text(v),
                  onDeleted: enabled
                      ? () => widget.onChanged!(
                          widget.values.where((x) => x != v).toList(),
                        )
                      : null,
                ),
            ],
          ),
        ],
      ],
    );
  }
}
