import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../models/records.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import '../customer/explore_screen.dart';
import '../customer/support_screen.dart';
import 'review_sheet.dart';

const _steps = [
  'Requested',
  'Accepted',
  'Team',
  'Confirmed',
  'Ongoing',
  'Done',
];

class BookingDetailScreen extends StatefulWidget {
  final String bookingId;
  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  late final Stream<Booking?> _booking = DbService.instance.bookingStream(
    widget.bookingId,
  );
  late final String _uid = context.read<Session>().user!.uid;
  late final Stream<List<Agreement>> _agreements = DbService.instance
      .bookingAgreements(_uid, widget.bookingId);
  late final Stream<List<AttendanceRecord>> _attendance = DbService.instance
      .bookingAttendance(_uid, widget.bookingId);
  bool _busy = false;

  Future<void> _run(Future<void> Function() action, String done) async {
    setState(() => _busy = true);
    try {
      await action();
      if (mounted) showMessage(context, done);
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _requestChanges(Booking b) async {
    final text = await promptText(
      context,
      title: 'Request changes',
      message:
          'Tell ${b.agencyName} what you\'d like changed. They\'ll re-assign the team.',
      hint: 'e.g. We need someone who speaks Hindi',
    );
    if (text == null) return;
    await _run(
      () => DbService.instance.requestTeamChanges(b, text),
      'Sent. The agency will update your team.',
    );
  }

  Future<void> _cancel(Booking b) async {
    final reason = await promptText(
      context,
      title: 'Cancel this booking?',
      message:
          'This can\'t be undone. Letting the agency know why helps them improve.',
      hint: 'Reason for cancelling',
      confirm: 'Cancel booking',
      destructive: true,
    );
    if (reason == null) return;
    await _run(
      () => DbService.instance.cancelBooking(b, reason),
      'Booking cancelled.',
    );
  }

  Future<void> _reschedule(Booking b) async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: b.eventDate.isAfter(now) ? b.eventDate : now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      helpText: 'Choose a new date',
    );
    if (d == null || !mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(b.eventDate),
      helpText: 'Choose a new start time',
    );
    if (t == null || !mounted) return;
    final date = DateTime(d.year, d.month, d.day, t.hour, t.minute);
    if (date.isBefore(now)) {
      showMessage(context, 'Please choose a time in the future.');
      return;
    }
    final reason = await promptText(
      context,
      title: 'Request new time',
      message:
          'Asking to move to ${DateFormat('EEE d MMM · h:mm a').format(date)}. The agency will confirm.',
      hint: 'Reason (optional)',
      required: false,
    );
    if (reason == null) return;
    await _run(
      () => DbService.instance.requestReschedule(b, date, reason),
      'Reschedule request sent.',
    );
  }

  Future<void> _respondAgreement(Agreement a, bool accept) async {
    final ok = await confirmDialog(
      context,
      title: accept ? 'Accept agreement?' : 'Decline agreement?',
      message: accept
          ? 'You agree to the terms of "${a.title}".'
          : 'The agency will be told you declined "${a.title}".',
      confirm: accept ? 'Accept' : 'Decline',
      destructive: !accept,
    );
    if (!ok || !mounted) return;
    final name = context.read<Session>().user!.name;
    await _run(
      () => DbService.instance.respondToAgreement(
        a,
        accept: accept,
        customerName: name,
      ),
      accept ? 'Agreement accepted.' : 'Agreement declined.',
    );
  }

  Future<void> _confirmAttendance(AttendanceRecord r) async {
    final ok = await confirmDialog(
      context,
      title: 'Confirm attendance?',
      message:
          'You\'re confirming ${r.personnelName} was on duty on ${r.date}.',
      confirm: 'Confirm',
      icon: Icons.how_to_reg_outlined,
    );
    if (ok) {
      await _run(
        () => DbService.instance.confirmAttendance(r.id),
        'Thanks for confirming.',
      );
    }
  }

  int _stepFor(String s) => BookingStatus.flow.indexOf(s);

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    return StreamBuilder<Booking?>(
      stream: _booking,
      builder: (context, snap) {
        if (snap.hasError || (snap.hasData && snap.data == null)) {
          return Scaffold(
            appBar: AppBar(),
            body: const EmptyState(
              icon: Icons.event_busy_outlined,
              title: 'Booking not found',
              message: 'It may have been removed. Please check My bookings.',
            ),
          );
        }
        if (!snap.hasData) {
          return Scaffold(appBar: AppBar(), body: const SkeletonList());
        }
        final b = snap.data!;
        final ended =
            b.status == BookingStatus.cancelled ||
            b.status == BookingStatus.declined;
        final showOps = const [
          BookingStatus.assigned,
          BookingStatus.confirmed,
          BookingStatus.ongoing,
          BookingStatus.completed,
        ].contains(b.status);
        var i = 0;
        Widget anim(Widget w) => FadeSlideIn(index: i++, child: w);
        return Scaffold(
          appBar: AppBar(title: const Text('Booking')),
          body: AbsorbPointer(
            absorbing: _busy,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              children: [
                anim(
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              b.agencyName,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            Text(
                              '${b.serviceLabel} · ${b.eventType}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      StatusChip(b.status),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                if (!ended)
                  anim(
                    StatusTimeline(
                      current: _stepFor(b.status),
                      color: HavenColors.sage,
                      steps: _steps,
                    ),
                  ),
                if (b.status == BookingStatus.declined)
                  anim(
                    SoftBanner(
                      icon: Icons.info_outline,
                      color: HavenColors.declined,
                      text: b.agencyNote.isNotEmpty
                          ? '${b.agencyName} couldn\'t take this one: ${b.agencyNote}'
                          : '${b.agencyName} couldn\'t take this booking. Other agencies may be free — have a look in Explore.',
                    ),
                  ),
                if (b.status == BookingStatus.declined) ...[
                  const SizedBox(height: 12),
                  PrimaryButton(
                    label: 'Find another agency',
                    icon: Icons.search_rounded,
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => Scaffold(
                          appBar: AppBar(
                            title: const Text('Find another agency'),
                          ),
                          body: ExploreScreen(initialService: b.service),
                        ),
                      ),
                    ),
                  ),
                ],
                if (b.status == BookingStatus.cancelled)
                  anim(
                    SoftBanner(
                      icon: Icons.cancel_outlined,
                      color: HavenColors.declined,
                      text: b.cancelReason.isNotEmpty
                          ? 'Cancelled: ${b.cancelReason}'
                          : 'This booking was cancelled.',
                    ),
                  ),
                if (b.status == BookingStatus.pending) ...[
                  const SizedBox(height: 14),
                  anim(
                    const SoftBanner(
                      icon: Icons.hourglass_top_rounded,
                      text:
                          'Your request is with the agency. Most reply within a few hours.',
                    ),
                  ),
                ],
                if (!ended && b.agencyNote.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  anim(
                    SoftBanner(
                      icon: Icons.chat_bubble_outline,
                      text: 'Note from ${b.agencyName}: ${b.agencyNote}',
                    ),
                  ),
                ],
                if (b.rescheduleRequest != null && b.isActive) ...[
                  const SizedBox(height: 10),
                  anim(
                    SoftBanner(
                      icon: Icons.update_rounded,
                      text:
                          '${b.rescheduleRequest!.by == 'agency' ? 'The agency' : 'You'} asked to move this to '
                          '${DateFormat('EEE d MMM · h:mm a').format(b.rescheduleRequest!.date)}'
                          '${b.rescheduleRequest!.reason.isEmpty ? '' : ' — ${b.rescheduleRequest!.reason}'}.',
                    ),
                  ),
                ],
                if (b.assigned.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const SectionTitle('Your team'),
                  const SizedBox(height: 8),
                  anim(_TeamCard(booking: b)),
                  if (b.status == BookingStatus.assigned) ...[
                    const SizedBox(height: 10),
                    SoftBanner(
                      icon: Icons.hourglass_top_rounded,
                      text:
                          '${b.confirmedCount} of ${b.teamSize} confirmed. Your booking is confirmed once every team member accepts.',
                    ),
                  ],
                  if (b.status == BookingStatus.confirmed) ...[
                    const SizedBox(height: 10),
                    const SoftBanner(
                      icon: Icons.verified_outlined,
                      text: 'Your whole team has confirmed. You\'re all set.',
                    ),
                  ],
                  if (b.canRequestTeamChanges &&
                      b.clientApproval != ClientApproval.changesRequested) ...[
                    const SizedBox(height: 12),
                    SecondaryButton(
                      label: 'Request changes to team',
                      icon: Icons.sync_rounded,
                      onPressed: () => _requestChanges(b),
                    ),
                  ],
                  if (b.clientApproval == ClientApproval.changesRequested) ...[
                    const SizedBox(height: 10),
                    SoftBanner(
                      icon: Icons.sync_rounded,
                      text:
                          'You asked for changes${b.clientFeedback.isEmpty ? '' : ': "${b.clientFeedback}"'}. The agency is updating your team.',
                    ),
                  ],
                ],
                const SizedBox(height: 20),
                const SectionTitle('Details'),
                const SizedBox(height: 8),
                anim(
                  Surface(
                    child: Column(
                      children: [
                        InfoTile(
                          icon: Icons.calendar_today_outlined,
                          label: 'When',
                          value:
                              '${DateFormat('EEEE d MMMM · h:mm a').format(b.eventDate)} · ${b.hours} h',
                        ),
                        InfoTile(
                          icon: Icons.location_on_outlined,
                          label: 'Where',
                          value: b.location,
                        ),
                        InfoTile(
                          icon: Icons.groups_outlined,
                          label: 'Team & guests',
                          value:
                              '${b.personnelCount} personnel · ${b.guests} guests',
                        ),
                        if (b.requirements.isNotEmpty)
                          InfoTile(
                            icon: Icons.notes_outlined,
                            label: 'Requirements',
                            value: b.requirements,
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                anim(
                  Surface(
                    child: Column(
                      children: [
                        _Line(
                          '${session.money(b.hourlyRate)} × ${b.hours} h × ${b.personnelCount}',
                          session.money(b.subtotal),
                        ),
                        _Line('Platform fee', session.money(b.platformFee)),
                        _Line('Tax', session.money(b.tax)),
                        const HairlineDivider(),
                        _Line(
                          'Total',
                          session.money(b.totalAmount),
                          bold: true,
                        ),
                        const SizedBox(height: 4),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            b.paymentStatus == 'paid'
                                ? 'Marked as paid.'
                                : b.paymentStatus == 'refunded'
                                ? 'Refunded.'
                                : 'Nothing is charged in the app. Pay ${b.agencyName} directly as agreed with them.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                StreamBuilder<List<Agreement>>(
                  stream: _agreements,
                  builder: (context, s) {
                    final list = s.data ?? const <Agreement>[];
                    if (list.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 20),
                        const SectionTitle('Agreements'),
                        const SizedBox(height: 8),
                        for (final a in list)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _AgreementCard(
                              agreement: a,
                              amount: session.money(a.amount),
                              onAccept: () => _respondAgreement(a, true),
                              onDecline: () => _respondAgreement(a, false),
                            ),
                          ),
                      ],
                    );
                  },
                ),
                if (showOps)
                  StreamBuilder<List<AttendanceRecord>>(
                    stream: _attendance,
                    builder: (context, s) {
                      final list = s.data ?? const <AttendanceRecord>[];
                      if (list.isEmpty) return const SizedBox.shrink();
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 20),
                          const SectionTitle('Attendance'),
                          const SizedBox(height: 8),
                          Surface(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            child: Column(
                              children: [
                                for (final r in list)
                                  _AttendanceRow(
                                    record: r,
                                    onConfirm: () => _confirmAttendance(r),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                const SizedBox(height: 24),
                if (b.canReview) ...[
                  PrimaryButton(
                    label: 'Review ${b.agencyName}',
                    icon: Icons.star_outline_rounded,
                    onPressed: () =>
                        showReviewSheet(context, b, session.user!.name),
                  ),
                  const SizedBox(height: 10),
                ],
                if (b.reviewed)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 10),
                    child: SoftBanner(
                      icon: Icons.favorite_border_rounded,
                      text: 'Thanks for sharing your review.',
                    ),
                  ),
                if (b.canCancel) ...[
                  SecondaryButton(
                    label: 'Request a new date or time',
                    icon: Icons.update_rounded,
                    onPressed: () => _reschedule(b),
                  ),
                  const SizedBox(height: 10),
                ],
                SecondaryButton(
                  label: 'Report a problem',
                  icon: Icons.support_agent_rounded,
                  onPressed: () => showNewTicketSheet(context, booking: b),
                ),
                if (b.canCancel) ...[
                  const SizedBox(height: 4),
                  TextButton(
                    onPressed: () => _cancel(b),
                    style: TextButton.styleFrom(
                      foregroundColor: HavenColors.declined,
                    ),
                    child: const Text('Cancel booking'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TeamCard extends StatelessWidget {
  final Booking booking;
  const _TeamCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    return Surface(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      child: Column(
        children: [
          for (final p in booking.assigned)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Avatar(
                    url: p.photoUrl.isEmpty ? null : p.photoUrl,
                    name: p.name,
                    radius: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.name,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          [
                            if (p.code.isNotEmpty) p.code,
                            ...p.skills.take(3),
                          ].join(' · '),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _AgreementCard extends StatelessWidget {
  final Agreement agreement;
  final String amount;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  const _AgreementCard({
    required this.agreement,
    required this.amount,
    required this.onAccept,
    required this.onDecline,
  });

  @override
  Widget build(BuildContext context) {
    final a = agreement;
    return Surface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  a.title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              Pill(
                switch (a.status) {
                  'sent' => 'Awaiting you',
                  'accepted' => 'Accepted',
                  'declined' => 'Declined',
                  _ => a.status,
                },
                color: StatusChip.colorFor(a.status),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [
              amount,
              if (a.startDate.isNotEmpty)
                '${a.startDate}${a.endDate.isEmpty ? '' : ' → ${a.endDate}'}',
            ].join(' · '),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (a.terms.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(a.terms, style: const TextStyle(height: 1.45)),
          ],
          if (a.awaitingClient) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SecondaryButton(
                    label: 'Decline',
                    onPressed: onDecline,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: PrimaryButton(label: 'Accept', onPressed: onAccept),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _AttendanceRow extends StatelessWidget {
  final AttendanceRecord record;
  final VoidCallback onConfirm;
  const _AttendanceRow({required this.record, required this.onConfirm});

  @override
  Widget build(BuildContext context) {
    final r = record;
    final t = DateFormat('h:mm a');
    final times = [
      if (r.checkIn != null) 'in ${t.format(r.checkIn!)}',
      if (r.checkOut != null) 'out ${t.format(r.checkOut!)}',
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  r.personnelName,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  '${r.date} · ${r.status}${times.isEmpty ? '' : ' · $times'}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          AnimatedSwitcher(
            duration: Motion.medium,
            child: r.clientConfirmed
                ? const Pill(
                    'Confirmed',
                    key: ValueKey('c'),
                    icon: Icons.check_rounded,
                  )
                : TextButton(
                    key: const ValueKey('n'),
                    onPressed: onConfirm,
                    child: const Text('Confirm attendance'),
                  ),
          ),
        ],
      ),
    );
  }
}

class _Line extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _Line(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
      color: bold ? HavenColors.ink : HavenColors.muted,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}
