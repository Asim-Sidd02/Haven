import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../models/records.dart';
import '../../services/bouncer_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import '../customer/support_screen.dart';
import 'bouncer_widgets.dart';

/// Help requests and incident reports raised by the bouncer.
class BouncerSupportScreen extends StatefulWidget {
  final Personnel personnel;
  final List<Assignment> assignments;
  const BouncerSupportScreen({
    super.key,
    required this.personnel,
    required this.assignments,
  });
  @override
  State<BouncerSupportScreen> createState() => _BouncerSupportScreenState();
}

class _BouncerSupportScreenState extends State<BouncerSupportScreen> {
  late final Stream<List<Ticket>> _stream = BouncerService.instance.tickets(
    context.read<Session>().user!.uid,
  );

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final p = widget.personnel;
    final current = widget.assignments
        .where((a) => a.isAccepted && !a.isPast)
        .toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Support & safety')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showBouncerTicketSheet(
          context,
          personnel: p,
          assignment: current.isEmpty ? null : current.first,
          emergency: false,
        ),
        icon: const Icon(Icons.add_comment_outlined),
        label: const Text('Get help'),
      ),
      body: StreamBuilder<List<Ticket>>(
        stream: _stream,
        builder: (context, snap) {
          if (snap.hasError) {
            debugPrint('bouncer tickets: ${snap.error}');
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
              Surface(
                color: HavenColors.declined.withValues(alpha: 0.06),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Row(
                      children: [
                        IconBadge(
                          Icons.emergency_outlined,
                          color: HavenColors.declined,
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Emergency on duty?',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      p.inAgency
                          ? 'Raise an emergency and your agency is alerted straight away. If anyone is in danger, call local emergency services first.'
                          : 'Raise an emergency and Haven support is alerted. If anyone is in danger, call local emergency services first.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    PrimaryButton(
                      label: 'Report an emergency',
                      icon: Icons.warning_amber_rounded,
                      onPressed: () => showBouncerTicketSheet(
                        context,
                        personnel: p,
                        assignment: current.isEmpty ? null : current.first,
                        emergency: true,
                      ),
                    ),
                  ],
                ),
              ),
              if (session.supportEmail.isNotEmpty ||
                  session.supportPhone.isNotEmpty) ...[
                const SizedBox(height: 12),
                SoftBanner(
                  icon: Icons.support_agent_rounded,
                  text:
                      'Haven support: ${[session.supportEmail, session.supportPhone].where((s) => s.isNotEmpty).join(' · ')}',
                ),
              ],
              const SizedBox(height: 20),
              const SectionTitle('Your requests'),
              if (list.isEmpty)
                Text(
                  'No requests yet.',
                  style: Theme.of(context).textTheme.bodySmall,
                )
              else
                for (final t in list)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Surface(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              TicketDetailScreen(ticketId: t.id, by: 'bouncer'),
                        ),
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
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  '${ticketCategories[t.category] ?? t.category} · ${DateFormat('d MMM').format(t.sortKey)}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          StatusChip(t.status),
                        ],
                      ),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

Future<void> showBouncerTicketSheet(
  BuildContext context, {
  required Personnel personnel,
  Assignment? assignment,
  required bool emergency,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => _TicketSheet(
    personnel: personnel,
    assignment: assignment,
    emergency: emergency,
  ),
);

class _TicketSheet extends StatefulWidget {
  final Personnel personnel;
  final Assignment? assignment;
  final bool emergency;
  const _TicketSheet({
    required this.personnel,
    this.assignment,
    required this.emergency,
  });
  @override
  State<_TicketSheet> createState() => _TicketSheetState();
}

class _TicketSheetState extends State<_TicketSheet> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  late String _category = widget.emergency ? 'incident' : 'support';
  late String _priority = widget.emergency ? 'emergency' : 'normal';
  late bool _linkJob = widget.assignment != null;
  bool _busy = false;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_subject.text.trim().length < 3 || _message.text.trim().length < 3) {
      showMessage(
        context,
        'Please add a subject and a few words about what happened.',
      );
      return;
    }
    setState(() => _busy = true);
    final user = context.read<Session>().user!;
    final ok = await runAction(
      context,
      () => BouncerService.instance.createTicket(
        me: widget.personnel,
        uid: user.uid,
        reporterName: widget.personnel.name.isEmpty
            ? user.name
            : widget.personnel.name,
        bookingId: _linkJob ? widget.assignment?.bookingId : null,
        subject: _subject.text,
        category: _category,
        priority: _priority,
        message: _message.text,
      ),
      done: _priority == 'emergency'
          ? 'Emergency reported. Help is being alerted.'
          : 'Request sent.',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.emergency ? 'Report an emergency' : 'Get help',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 14),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'support', label: Text('Support')),
                ButtonSegment(value: 'incident', label: Text('Incident')),
              ],
              selected: {_category},
              onSelectionChanged: (s) => setState(() => _category = s.first),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              items: [
                for (final e in ticketPriorities.entries)
                  DropdownMenuItem(value: e.key, child: Text(e.value)),
              ],
              onChanged: (v) => setState(() => _priority = v ?? 'normal'),
            ),
            if (widget.assignment != null)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _linkJob,
                onChanged: (v) => setState(() => _linkJob = v),
                title: Text(
                  'About ${widget.assignment!.serviceLabel} on ${DateFormat('d MMM').format(widget.assignment!.eventDate)}',
                ),
              ),
            const SizedBox(height: 8),
            TextField(
              controller: _subject,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Subject'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _message,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'What happened?'),
            ),
            const SizedBox(height: 16),
            PrimaryButton(label: 'Send', loading: _busy, onPressed: _send),
          ],
        ),
      ),
    );
  }
}
