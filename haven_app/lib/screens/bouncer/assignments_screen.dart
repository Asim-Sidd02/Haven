import 'package:flutter/material.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'assignment_detail_screen.dart';
import 'bouncer_widgets.dart';

class AssignmentsScreen extends StatelessWidget {
  final Personnel personnel;
  final List<Assignment> assignments;
  final bool loading;
  final bool error;
  const AssignmentsScreen({
    super.key,
    required this.personnel,
    required this.assignments,
    required this.loading,
    required this.error,
  });

  @override
  Widget build(BuildContext context) {
    final offers = assignments.where((a) => a.isOffered && !a.isPast).toList()
      ..sort(
        (a, b) =>
            (a.respondBy ?? a.eventDate).compareTo(b.respondBy ?? b.eventDate),
      );
    final upcoming = assignments
        .where(
          (a) =>
              a.isAccepted &&
              (!a.isPast || (a.checkIn != null && a.checkOut == null)),
        )
        .toList();
    final past =
        assignments
            .where((a) => !offers.contains(a) && !upcoming.contains(a))
            .toList()
          ..sort((a, b) => b.eventDate.compareTo(a.eventDate));

    void open(Assignment a) => Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AssignmentDetailScreen(
          assignmentId: a.id,
          personnelId: personnel.id,
        ),
      ),
    );

    Widget section(String title, List<Assignment> list, String empty) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 18),
        SectionTitle('$title (${list.length})'),
        if (list.isEmpty)
          Text(empty, style: Theme.of(context).textTheme.bodySmall)
        else
          for (var i = 0; i < list.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: FadeSlideIn(
                index: i,
                child: AssignmentCard(
                  assignment: list[i],
                  onTap: () => open(list[i]),
                ),
              ),
            ),
      ],
    );

    return Scaffold(
      body: SafeArea(
        child: Builder(
          builder: (context) {
            if (error) {
              return const EmptyState(
                icon: Icons.cloud_off_outlined,
                title: 'We couldn\'t load your assignments',
                message: 'Please check your connection and try again.',
              );
            }
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              children: [
                const PageTitle(
                  title: 'Assignments',
                  subtitle:
                      'Offers from your agency, upcoming shifts and past work.',
                ),
                if (!personnel.isVerified) ...[
                  const SizedBox(height: 14),
                  const SoftBanner(
                    icon: Icons.info_outline,
                    text:
                        'You can accept offers once your profile is verified.',
                  ),
                ],
                if (loading) ...[
                  const SizedBox(height: 18),
                  const SkeletonList(count: 3),
                ] else ...[
                  section('New offers', offers, 'No new offers right now.'),
                  section('Upcoming', upcoming, 'No upcoming shifts.'),
                  section(
                    'Past',
                    past,
                    'Your finished and declined jobs will appear here.',
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
