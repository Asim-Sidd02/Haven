import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../state/session.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'agency_card.dart';
import 'assignment_detail_screen.dart';
import 'bouncer_widgets.dart';
import 'enrolment_screen.dart';
import 'notifications_screen.dart';

class BouncerHomeScreen extends StatefulWidget {
  final Personnel personnel;
  final List<Assignment> assignments;
  final bool loading;
  final ValueChanged<int> onGoToTab;
  const BouncerHomeScreen({
    super.key,
    required this.personnel,
    required this.assignments,
    required this.loading,
    required this.onGoToTab,
  });

  @override
  State<BouncerHomeScreen> createState() => _BouncerHomeScreenState();
}

class _BouncerHomeScreenState extends State<BouncerHomeScreen> {
  late final Stream<List<AppNotification>> _notes = BouncerService.instance
      .notifications(context.read<Session>().user!.uid);

  void _openProfile() => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => EnrolmentScreen(personnelId: widget.personnel.id),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final p = widget.personnel;
    final list = widget.assignments;
    final offers = list.where((a) => a.isOffered && !a.isPast).toList();
    final upcoming = list
        .where((a) => a.isAccepted && !a.isPast && a.checkOut == null)
        .toList();
    final next = upcoming.isEmpty ? null : upcoming.first;
    final first = p.name.split(' ').first;
    final todos = <(IconData, String, VoidCallback)>[
      if (p.canSubmit)
        (
          Icons.edit_note_rounded,
          'Complete and submit your profile',
          _openProfile,
        ),
      if (offers.isNotEmpty)
        (
          Icons.mark_email_unread_outlined,
          '${offers.length} job offer${offers.length == 1 ? '' : 's'} waiting for your answer',
          () => widget.onGoToTab(1),
        ),
      if (next != null && next.canCheckIn)
        (
          Icons.login_rounded,
          'Check in for ${next.serviceLabel}',
          () => _open(next),
        ),
      for (final a in list.where((a) => a.canCheckOut))
        (
          Icons.logout_rounded,
          'Check out of ${a.serviceLabel}',
          () => _open(a),
        ),
    ];
    var i = 0;
    Widget anim(Widget w) => FadeSlideIn(index: i++, child: w);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            anim(
              PageTitle(
                eyebrow: first.isEmpty ? 'Welcome' : 'Hi, $first',
                title: 'Your work',
                trailing: StreamBuilder<List<AppNotification>>(
                  stream: _notes,
                  builder: (context, s) {
                    if (s.hasError) debugPrint('notifications: ${s.error}');
                    final unread = (s.data ?? const [])
                        .where((n) => !n.read)
                        .length;
                    return IconButton(
                      tooltip: 'Notifications',
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const NotificationsScreen(),
                        ),
                      ),
                      icon: Badge(
                        isLabelVisible: unread > 0,
                        label: Text('$unread'),
                        child: const Icon(Icons.notifications_none_rounded),
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),
            anim(VerificationCard(personnel: p, onOpenProfile: _openProfile)),
            const SizedBox(height: 12),
            anim(AgencyCard(personnel: p, assignments: list)),
            if (todos.isNotEmpty) ...[
              const SizedBox(height: 20),
              const SectionTitle('To do'),
              anim(
                Surface(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 4,
                  ),
                  child: Column(
                    children: [
                      for (final t in todos)
                        ListTile(
                          leading: IconBadge(t.$1, size: 34),
                          title: Text(t.$2),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: t.$3,
                        ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            SectionTitle(
              'Next assignment',
              actionLabel: 'All',
              onAction: () => widget.onGoToTab(1),
            ),
            if (widget.loading)
              Skeleton.card()
            else if (next == null)
              const Surface(
                child: EmptyState(
                  icon: Icons.event_available_outlined,
                  title: 'Nothing scheduled',
                  message:
                      'Accepted jobs show up here. Keep your availability up to date so your agency can book you.',
                ),
              )
            else
              anim(AssignmentCard(assignment: next, onTap: () => _open(next))),
          ],
        ),
      ),
    );
  }

  void _open(Assignment a) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => AssignmentDetailScreen(
        assignmentId: a.id,
        personnelId: widget.personnel.id,
      ),
    ),
  );
}
