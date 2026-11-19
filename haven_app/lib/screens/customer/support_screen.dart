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

/// The client's complaints and support requests.
class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});
  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  Stream<List<Ticket>>? _stream;
  String? _uid;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final uid = session.user!.uid;
    if (uid != _uid) {
      _uid = uid;
      _stream = DbService.instance.customerTickets(uid);
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showNewTicketSheet(context),
        icon: const Icon(Icons.add_comment_outlined),
        label: const Text('Get help'),
      ),
      body: StreamBuilder<List<Ticket>>(
        stream: _stream,
        builder: (context, snap) {
          if (snap.hasError) {
            return const EmptyState(
              icon: Icons.cloud_off_outlined,
              title: 'We couldn\'t load your requests',
              message: 'Please check your connection and try again.',
            );
          }
          if (!snap.hasData) return const SkeletonList(height: 90);
          final list = snap.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
            children: [
              if (session.supportEmail.isNotEmpty ||
                  session.supportPhone.isNotEmpty) ...[
                SoftBanner(
                  icon: Icons.support_agent_rounded,
                  text:
                      'Haven support: ${[session.supportEmail, session.supportPhone].where((s) => s.isNotEmpty).join(' · ')}',
                ),
                const SizedBox(height: 16),
              ],
              if (list.isEmpty)
                const EmptyState(
                  icon: Icons.mark_chat_read_outlined,
                  title: 'All quiet here',
                  message:
                      'If anything about a booking doesn\'t feel right, tap "Get help". In an emergency, choose Emergency priority so the agency is alerted straight away.',
                ),
              for (var i = 0; i < list.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: FadeSlideIn(
                    key: ValueKey(list[i].id),
                    index: i,
                    child: _TicketTile(ticket: list[i]),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _TicketTile extends StatelessWidget {
  final Ticket ticket;
  const _TicketTile({required this.ticket});

  @override
  Widget build(BuildContext context) {
    final t = ticket;
    return Pressable(
      child: Surface(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => TicketDetailScreen(ticketId: t.id)),
        ),
        child: Row(
          children: [
            IconBadge(
              t.priority == 'emergency'
                  ? Icons.emergency_outlined
                  : Icons.forum_outlined,
              color: t.priority == 'emergency'
                  ? HavenColors.declined
                  : HavenColors.sage,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.subject,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    [
                      ticketCategories[t.category] ?? t.category,
                      if (t.updatedAt != null)
                        DateFormat('d MMM').format(t.updatedAt!),
                    ].join(' · '),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            StatusChip(t.status),
          ],
        ),
      ),
    );
  }
}

class TicketDetailScreen extends StatefulWidget {
  final String ticketId;

  /// Who is replying: 'customer' in the client app, 'bouncer' for personnel.
  final String by;
  const TicketDetailScreen({
    super.key,
    required this.ticketId,
    this.by = 'customer',
  });
  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  late final Stream<Ticket?> _stream = DbService.instance.ticketStream(
    widget.ticketId,
  );
  final _reply = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _reply.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _reply.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await DbService.instance.replyToTicket(
        widget.ticketId,
        context.read<Session>().user!.name,
        text,
        by: widget.by,
      );
      _reply.clear();
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Ticket?>(
      stream: _stream,
      builder: (context, snap) {
        final t = snap.data;
        if (snap.hasError || (snap.hasData && t == null)) {
          return Scaffold(
            appBar: AppBar(),
            body: const EmptyState(
              icon: Icons.forum_outlined,
              title: 'Request not found',
              message: 'It may have been closed or removed.',
            ),
          );
        }
        if (t == null) {
          return Scaffold(appBar: AppBar(), body: const SkeletonList());
        }
        final resolved = t.status == 'resolved';
        return Scaffold(
          appBar: AppBar(title: Text(t.subject)),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Row(
                  children: [
                    StatusChip(t.status),
                    const SizedBox(width: 8),
                    Pill(
                      ticketPriorities[t.priority] ?? t.priority,
                      color: t.priority == 'emergency'
                          ? HavenColors.declined
                          : HavenColors.muted,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    for (var i = 0; i < t.messages.length; i++)
                      FadeSlideIn(
                        index: i,
                        child: _Bubble(message: t.messages[i], me: widget.by),
                      ),
                  ],
                ),
              ),
              if (!resolved)
                SafeArea(
                  minimum: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _reply,
                          textCapitalization: TextCapitalization.sentences,
                          decoration: const InputDecoration(
                            hintText: 'Add a message',
                          ),
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        tooltip: 'Send',
                        onPressed: _sending ? null : _send,
                        icon: const Icon(Icons.send_rounded),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _Bubble extends StatelessWidget {
  final TicketMessage message;
  final String me;
  const _Bubble({required this.message, required this.me});

  @override
  Widget build(BuildContext context) {
    final mine = message.by == me;
    final who = mine
        ? 'You'
        : message.by == 'admin'
        ? 'Haven support'
        : (message.name.isEmpty ? 'Agency' : message.name);
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        constraints: const BoxConstraints(maxWidth: 300),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: mine ? HavenColors.sage : HavenColors.sageSoft,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              who +
                  (message.at == null
                      ? ''
                      : ' · ${DateFormat('d MMM, h:mm a').format(message.at!)}'),
              style: TextStyle(
                fontSize: 11,
                color: mine ? Colors.white70 : HavenColors.muted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message.text,
              style: TextStyle(color: mine ? Colors.white : HavenColors.ink),
            ),
          ],
        ),
      ),
    );
  }
}

/// Opens the "raise a ticket" sheet. Pass [booking] to pre-select it.
Future<void> showNewTicketSheet(BuildContext context, {Booking? booking}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: HavenColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _NewTicketSheet(booking: booking),
  );
}

class _NewTicketSheet extends StatefulWidget {
  final Booking? booking;
  const _NewTicketSheet({this.booking});
  @override
  State<_NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends State<_NewTicketSheet> {
  final _form = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  late final Stream<List<Booking>> _bookings = DbService.instance
      .customerBookings(context.read<Session>().user!.uid);
  Booking? _booking;
  String _category = 'complaint';
  String _priority = 'normal';
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
  }

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (_booking == null) {
      showMessage(context, 'Please choose the booking this is about.');
      return;
    }
    if (_priority == 'emergency') {
      final ok = await confirmDialog(
        context,
        title: 'Send as an emergency?',
        message:
            'The agency is alerted immediately. If anyone is in danger, please also call your local emergency number.',
        confirm: 'Send emergency',
        destructive: true,
      );
      if (!ok) return;
    }
    if (!mounted) return;
    final user = context.read<Session>().user!;
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      await DbService.instance.createTicket(
        customerId: user.uid,
        customerName: user.name,
        booking: _booking!,
        subject: _subject.text,
        category: _category,
        priority: _priority,
        message: _message.text,
      );
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Sent. We\'ll keep you posted in Support.'),
        ),
      );
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        20,
        24,
        24 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Form(
        key: _form,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'How can we help?',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              const Text(
                'Tell us what happened — the agency and Haven will follow up.',
                style: TextStyle(color: HavenColors.muted),
              ),
              const SizedBox(height: 16),
              if (widget.booking == null)
                StreamBuilder<List<Booking>>(
                  stream: _bookings,
                  builder: (context, snap) {
                    final list = snap.data ?? const <Booking>[];
                    if (snap.hasData && list.isEmpty) {
                      return const SoftBanner(
                        icon: Icons.info_outline,
                        text:
                            'Requests are linked to a booking. Once you\'ve booked an agency, you can reach them here.',
                      );
                    }
                    return DropdownButtonFormField<String>(
                      initialValue: _booking?.id,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Which booking?',
                      ),
                      items: [
                        for (final b in list)
                          DropdownMenuItem(
                            value: b.id,
                            child: Text(
                              '${b.agencyName} · ${DateFormat('d MMM').format(b.eventDate)}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: (id) => setState(
                        () => _booking = list.firstWhere((b) => b.id == id),
                      ),
                      validator: (v) => v == null ? 'Choose the booking' : null,
                    );
                  },
                )
              else
                SoftBanner(
                  icon: Icons.event_note_outlined,
                  text:
                      '${widget.booking!.agencyName} · ${DateFormat('EEE d MMM').format(widget.booking!.eventDate)}',
                ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                children: [
                  for (final e in ticketCategories.entries)
                    ChoiceChip(
                      label: Text(e.value),
                      selected: _category == e.key,
                      onSelected: (_) => setState(() => _category = e.key),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                children: [
                  for (final e in ticketPriorities.entries)
                    ChoiceChip(
                      label: Text(e.value),
                      avatar: e.key == 'emergency'
                          ? const Icon(Icons.emergency_outlined, size: 16)
                          : null,
                      selected: _priority == e.key,
                      onSelected: (_) => setState(() => _priority = e.key),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _subject,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Subject'),
                validator: (v) => (v == null || v.trim().length < 3)
                    ? 'A short title, please'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _message,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'What happened?',
                  alignLabelWithHint: true,
                ),
                validator: (v) => (v == null || v.trim().length < 10)
                    ? 'A little more detail helps us act quickly'
                    : null,
              ),
              const SizedBox(height: 18),
              PrimaryButton(
                label: _priority == 'emergency' ? 'Send emergency' : 'Send',
                loading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
