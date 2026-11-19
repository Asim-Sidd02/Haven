import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'bouncer_widgets.dart';
import 'bouncer_support_screen.dart';

class AssignmentDetailScreen extends StatefulWidget {
  final String assignmentId;
  final String personnelId;
  const AssignmentDetailScreen({
    super.key,
    required this.assignmentId,
    required this.personnelId,
  });

  @override
  State<AssignmentDetailScreen> createState() => _AssignmentDetailScreenState();
}

class _AssignmentDetailScreenState extends State<AssignmentDetailScreen> {
  final _svc = BouncerService.instance;
  late final Stream<Assignment?> _assignment = _svc.assignmentStream(
    widget.assignmentId,
  );
  late final Stream<Personnel?> _personnel = _svc.personnelStream(
    widget.personnelId,
  );
  late final Stream<List<Assignment>> _all = _svc.assignments(
    widget.personnelId,
  );
  Personnel? _me;
  List<Assignment> _mine = const [];
  bool _busy = false;

  Future<void> _guard(Future<void> Function() f) async {
    setState(() => _busy = true);
    try {
      await f();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _accept(Assignment a) async {
    final me = _me;
    if (me == null) return;
    if (!me.isVerified) {
      await confirmDialog(
        context,
        title: 'Verification needed',
        message:
            'Only verified personnel can accept work. Complete your profile and wait for Haven to verify it, then come back to this offer.',
        confirm: 'OK',
        cancel: 'Close',
        icon: Icons.verified_user_outlined,
      );
      return;
    }
    final ok = await confirmDialog(
      context,
      title: 'Accept this job?',
      message:
          'You commit to ${a.serviceLabel} on ${DateFormat('EEE d MMM, h:mm a').format(a.eventDate)} for ${a.hours} h.',
      confirm: 'Accept',
      icon: Icons.check_circle_outline,
    );
    if (!ok || !mounted) return;
    await _guard(() async {
      var confirmed = false;
      final done = await runAction(context, () async {
        confirmed = await _svc.accept(a, me, _mine);
      });
      if (done && mounted) {
        showMessage(
          context,
          confirmed
              ? 'Accepted. The whole team is in — booking confirmed!'
              : 'Accepted. Your agency has been notified.',
        );
      }
    });
  }

  Future<void> _decline(Assignment a) async {
    final me = _me;
    if (me == null) return;
    final reason = await promptText(
      context,
      title: 'Decline this job?',
      message: 'Tell your agency why so they can find a replacement.',
      hint: 'e.g. Not available that evening',
      confirm: 'Decline',
      destructive: true,
    );
    if (reason == null || !mounted) return;
    await _guard(
      () => runAction(
        context,
        () => _svc.decline(a, me, reason),
        done: 'Declined. Your agency has been told.',
      ),
    );
  }

  Future<GeoFix?> _locate(String action) async {
    final ok = await confirmDialog(
      context,
      title: 'Share your location?',
      message:
          'To $action, Haven records your current location once. Your agency uses it to confirm you were on site. We don\'t track you in the background.',
      confirm: 'Continue',
      cancel: 'Cancel',
      icon: Icons.location_on_outlined,
    );
    if (!ok) return null;
    try {
      return await LocationService.currentFix();
    } on LocationException catch (e) {
      if (!mounted) return null;
      final open = await confirmDialog(
        context,
        title: 'Location needed',
        message: e.message,
        confirm: 'Open settings',
        cancel: 'Close',
        icon: Icons.location_off_outlined,
      );
      if (open) await LocationService.openSettings(e.problem);
      return null;
    } catch (e) {
      debugPrint('location: $e');
      if (mounted) {
        showMessage(
          context,
          'We couldn\'t get your location. Move to an open area and try again.',
        );
      }
      return null;
    }
  }

  Future<void> _checkIn(Assignment a) async {
    final me = _me;
    if (me == null) return;
    await _guard(() async {
      final fix = await _locate('check in');
      if (fix == null || !mounted) return;
      await runAction(
        context,
        () => _svc.checkIn(a, me, fix),
        done: 'Checked in. Have a safe shift.',
      );
    });
  }

  Future<void> _checkOut(Assignment a) async {
    final me = _me;
    if (me == null) return;
    final ok = await confirmDialog(
      context,
      title: 'Check out now?',
      message: 'This ends your shift for ${a.serviceLabel}.',
      confirm: 'Check out',
      icon: Icons.logout_rounded,
    );
    if (!ok || !mounted) return;
    await _guard(() async {
      final fix = await _locate('check out');
      if (fix == null || !mounted) return;
      await runAction(
        context,
        () => _svc.checkOut(a, me, fix),
        done: 'Checked out. Thanks!',
      );
    });
  }

  Future<void> _maps(String location) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(location)}',
    );
    try {
      if (await launchUrl(uri, mode: LaunchMode.externalApplication)) return;
    } catch (e) {
      debugPrint('maps: $e');
    }
    await Clipboard.setData(ClipboardData(text: location));
    if (mounted) showMessage(context, 'Address copied');
  }

  Future<void> _call(String phone) async {
    try {
      if (await launchUrl(Uri(scheme: 'tel', path: phone))) return;
    } catch (e) {
      debugPrint('call: $e');
    }
    await Clipboard.setData(ClipboardData(text: phone));
    if (mounted) showMessage(context, 'Number copied');
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Personnel?>(
      stream: _personnel,
      builder: (context, ps) {
        _me = ps.data ?? _me;
        return StreamBuilder<List<Assignment>>(
          stream: _all,
          builder: (context, all) {
            _mine = all.data ?? _mine;
            return StreamBuilder<Assignment?>(
              stream: _assignment,
              builder: (context, snap) {
                if (snap.hasError || (snap.hasData && snap.data == null)) {
                  if (snap.hasError) debugPrint('assignment: ${snap.error}');
                  return Scaffold(
                    appBar: AppBar(),
                    body: const EmptyState(
                      icon: Icons.work_off_outlined,
                      title: 'Assignment not found',
                      message: 'It may have been withdrawn by your agency.',
                    ),
                  );
                }
                if (!snap.hasData) {
                  return Scaffold(appBar: AppBar(), body: const SkeletonList());
                }
                return _body(snap.data!);
              },
            );
          },
        );
      },
    );
  }

  Widget _body(Assignment a) {
    final df = DateFormat('EEEE d MMMM · h:mm a');
    final t = DateFormat('h:mm a');
    final beforeWindow =
        a.isAccepted &&
        a.checkIn == null &&
        DateTime.now().isBefore(a.eventDate.subtract(const Duration(hours: 1)));
    return Scaffold(
      appBar: AppBar(title: const Text('Assignment')),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        a.serviceLabel.isEmpty ? 'Assignment' : a.serviceLabel,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        [
                          a.eventType,
                          a.customerName,
                        ].where((s) => s.isNotEmpty).join(' · '),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (a.isOffered && a.respondBy != null)
              SoftBanner(
                icon: Icons.timer_outlined,
                color: a.respondBy!.isBefore(DateTime.now())
                    ? HavenColors.declined
                    : HavenColors.sage,
                text:
                    'Please respond by ${DateFormat('EEE d MMM, h:mm a').format(a.respondBy!)}.',
              ),
            if (a.status == AssignmentStatus.declined)
              SoftBanner(
                icon: Icons.cancel_outlined,
                color: HavenColors.declined,
                text:
                    'You declined${a.declineReason.isEmpty ? '' : ': ${a.declineReason}'}',
              ),
            if (a.status == AssignmentStatus.withdrawn)
              const SoftBanner(
                icon: Icons.undo_rounded,
                color: HavenColors.declined,
                text: 'Your agency withdrew this offer.',
              ),
            if (a.checkIn != null)
              SoftBanner(
                icon: Icons.how_to_reg_outlined,
                text: [
                  if (a.checkIn!.at != null)
                    'Checked in ${t.format(a.checkIn!.at!)}',
                  if (a.checkOut?.at != null)
                    'checked out ${t.format(a.checkOut!.at!)}',
                ].join(' · ').ifEmpty('Checked in'),
              ),
            const SizedBox(height: 14),
            Surface(
              child: Column(
                children: [
                  InfoTile(
                    icon: Icons.calendar_today_outlined,
                    label: 'When',
                    value:
                        '${df.format(a.eventDate)} · ${a.hours} h (until ${t.format(a.endsAt)})',
                  ),
                  if (a.location.isNotEmpty)
                    InkWell(
                      onTap: () => _maps(a.location),
                      child: Row(
                        children: [
                          Expanded(
                            child: InfoTile(
                              icon: Icons.location_on_outlined,
                              label: 'Where',
                              value: a.location,
                            ),
                          ),
                          const Icon(
                            Icons.map_outlined,
                            color: HavenColors.sage,
                          ),
                        ],
                      ),
                    ),
                  if (a.requirements.isNotEmpty)
                    InfoTile(
                      icon: Icons.notes_outlined,
                      label: 'Requirements',
                      value: a.requirements,
                    ),
                  if (a.agencyNote.isNotEmpty)
                    InfoTile(
                      icon: Icons.chat_bubble_outline,
                      label: 'Note from agency',
                      value: a.agencyNote,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Surface(
              child: Row(
                children: [
                  Avatar(name: a.agencyName, radius: 22, square: true),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          a.agencyName.isEmpty ? 'Your agency' : a.agencyName,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if (a.agencyPhone.isNotEmpty)
                          Text(
                            a.agencyPhone,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                  if (a.agencyPhone.isNotEmpty)
                    IconButton.filledTonal(
                      onPressed: () => _call(a.agencyPhone),
                      icon: const Icon(Icons.call_outlined),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (a.isOffered && !a.isPast) ...[
              if (_me != null && !_me!.isVerified)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: SoftBanner(
                    icon: Icons.info_outline,
                    text: 'You need a verified profile to accept work.',
                  ),
                ),
              Row(
                children: [
                  Expanded(
                    child: SecondaryButton(
                      label: 'Decline',
                      onPressed: () => _decline(a),
                      color: HavenColors.declined,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: PrimaryButton(
                      label: 'Accept',
                      loading: _busy,
                      onPressed: () => _accept(a),
                    ),
                  ),
                ],
              ),
            ],
            if (a.canCheckIn)
              PrimaryButton(
                label: 'Check in',
                icon: Icons.login_rounded,
                loading: _busy,
                onPressed: () => _checkIn(a),
              ),
            if (beforeWindow)
              Text(
                'Check-in opens at ${t.format(a.eventDate.subtract(const Duration(hours: 1)))} on ${DateFormat('d MMM').format(a.eventDate)}.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            if (a.canCheckOut)
              PrimaryButton(
                label: 'Check out',
                icon: Icons.logout_rounded,
                loading: _busy,
                onPressed: () => _checkOut(a),
              ),
            if (a.isAccepted && _me != null) ...[
              const SizedBox(height: 10),
              SecondaryButton(
                label: 'Report an incident',
                icon: Icons.report_outlined,
                onPressed: () => showBouncerTicketSheet(
                  context,
                  personnel: _me!,
                  assignment: a,
                  emergency: false,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

extension on String {
  String ifEmpty(String other) => isEmpty ? other : this;
}
