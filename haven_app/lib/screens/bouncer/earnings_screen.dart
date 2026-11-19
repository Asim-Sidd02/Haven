import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';

/// Pay slips and completed work.
class EarningsScreen extends StatefulWidget {
  final Personnel personnel;
  final List<Assignment> assignments;
  const EarningsScreen({
    super.key,
    required this.personnel,
    required this.assignments,
  });
  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  late final Stream<List<PayrollEntry>> _payroll = BouncerService.instance
      .payroll(widget.personnel.id);

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final done =
        widget.assignments
            .where((a) => a.isAccepted && (a.isPast || a.checkOut != null))
            .toList()
          ..sort((a, b) => b.eventDate.compareTo(a.eventDate));
    final hours = done.fold<int>(0, (s, a) => s + a.hours);
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings & history')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Row(
            children: [
              Expanded(
                child: StatTile(
                  label: 'Jobs done',
                  value: '${done.length}',
                  icon: Icons.task_alt_rounded,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  label: 'Hours worked',
                  value: '$hours',
                  icon: Icons.schedule_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const SectionTitle('Pay slips'),
          StreamBuilder<List<PayrollEntry>>(
            stream: _payroll,
            builder: (context, snap) {
              if (snap.hasError) {
                debugPrint('payroll: ${snap.error}');
                return Text(
                  'We couldn\'t load your pay slips.',
                  style: Theme.of(context).textTheme.bodySmall,
                );
              }
              if (!snap.hasData) {
                return const SkeletonList(count: 2, height: 64);
              }
              final list = snap.data!;
              if (list.isEmpty) {
                return Text(
                  'No pay slips yet. Your agency publishes them monthly.',
                  style: Theme.of(context).textTheme.bodySmall,
                );
              }
              return Surface(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 4,
                ),
                child: Column(
                  children: [
                    for (final e in list)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          _month(e.month),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        subtitle: Text('${e.daysWorked} days worked'),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              session.money(e.net),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            Text(
                              e.status == 'paid' ? 'Paid' : 'Pending',
                              style: TextStyle(
                                fontSize: 12,
                                color: e.status == 'paid'
                                    ? HavenColors.accepted
                                    : HavenColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 20),
          const SectionTitle('Completed work'),
          if (done.isEmpty)
            const EmptyState(
              icon: Icons.history_rounded,
              title: 'No completed jobs yet',
              message: 'Your finished assignments will be listed here.',
            )
          else
            Surface(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              child: Column(
                children: [
                  for (final a in done)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        a.serviceLabel,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${DateFormat('d MMM yyyy').format(a.eventDate)} · ${a.agencyName}',
                      ),
                      trailing: Text('${a.hours} h'),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  static String _month(String m) {
    final d = DateTime.tryParse('$m-01');
    return d == null ? m : DateFormat('MMMM yyyy').format(d);
  }
}
