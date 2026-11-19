import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../services/auth_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'bouncer_support_screen.dart';
import 'bouncer_widgets.dart';
import 'documents_screen.dart';
import 'earnings_screen.dart';
import 'enrolment_screen.dart';
import 'notifications_screen.dart';

class BouncerProfileScreen extends StatelessWidget {
  final Personnel personnel;
  final List<Assignment> assignments;
  const BouncerProfileScreen({
    super.key,
    required this.personnel,
    required this.assignments,
  });

  @override
  Widget build(BuildContext context) {
    final p = personnel;
    final user = context.watch<Session>().user!;
    void push(Widget w) =>
        Navigator.push(context, MaterialPageRoute(builder: (_) => w));
    final items = <(IconData, String, String, VoidCallback)>[
      (
        Icons.badge_outlined,
        'Profile & enrolment',
        VerificationStatus.label(p.verificationStatus),
        () => push(EnrolmentScreen(personnelId: p.id)),
      ),
      (
        Icons.folder_open_outlined,
        'Documents',
        'ID, address proof, training',
        () => push(DocumentsScreen(personnel: p)),
      ),
      (
        Icons.payments_outlined,
        'Earnings & history',
        'Pay slips and completed jobs',
        () => push(EarningsScreen(personnel: p, assignments: assignments)),
      ),
      (
        Icons.notifications_none_rounded,
        'Notifications',
        'Offers and updates',
        () => push(const NotificationsScreen()),
      ),
      (
        Icons.support_agent_outlined,
        'Support & safety',
        'Get help or report an incident',
        () =>
            push(BouncerSupportScreen(personnel: p, assignments: assignments)),
      ),
    ];
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            Surface(
              child: Row(
                children: [
                  Avatar(
                    url: p.photoUrl.isEmpty ? user.photoUrl : p.photoUrl,
                    name: p.name.isEmpty ? user.name : p.name,
                    radius: 32,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.name.isEmpty ? user.name : p.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          user.email,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            Pill(
                              VerificationStatus.label(p.verificationStatus),
                              color: verificationColor(p.verificationStatus),
                            ),
                            if (p.code.isNotEmpty)
                              Pill(p.code, color: HavenColors.muted),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Surface(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: Column(
                children: [
                  for (final it in items)
                    ListTile(
                      leading: IconBadge(it.$1, size: 36),
                      title: Text(
                        it.$2,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      subtitle: Text(it.$3),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: it.$4,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SecondaryButton(
              label: 'Sign out',
              icon: Icons.logout_rounded,
              color: HavenColors.declined,
              onPressed: () async {
                final ok = await confirmDialog(
                  context,
                  title: 'Sign out?',
                  message: 'You can sign back in any time.',
                  confirm: 'Sign out',
                );
                if (ok && context.mounted) {
                  await context.read<AuthService>().signOut();
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
