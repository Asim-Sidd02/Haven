import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'bouncer_widgets.dart';

/// Shows the bouncer's agency, or lets an independent bouncer ask to join one.
class AgencyCard extends StatefulWidget {
  final Personnel personnel;
  final List<Assignment> assignments;
  const AgencyCard({
    super.key,
    required this.personnel,
    required this.assignments,
  });
  @override
  State<AgencyCard> createState() => _AgencyCardState();
}

class _AgencyCardState extends State<AgencyCard> {
  late final Stream<JoinRequest?> _request = BouncerService.instance
      .joinRequest(context.read<Session>().user!.uid);
  Future<String?>? _name;
  String? _nameFor;

  Future<void> _join() async {
    final code = await promptText(
      context,
      title: 'Join an agency',
      message: 'Enter the agency code they shared with you.',
      hint: 'e.g. SHIELD',
      confirm: 'Find agency',
    );
    if (code == null || !mounted) return;
    List<AgencyMatch> found = const [];
    final ok = await runAction(context, () async {
      found = await BouncerService.instance.findAgency(code);
    });
    if (!ok || !mounted) return;
    if (found.isEmpty) {
      showMessage(
        context,
        'No approved agency uses that code. Please check it with the agency.',
      );
      return;
    }
    final a = found.first;
    final yes = await confirmDialog(
      context,
      title: 'Ask to join ${a.name}?',
      message:
          '${a.name}${a.city.isEmpty ? '' : ' (${a.city})'} will see your profile and can accept you into their team.',
      confirm: 'Send request',
      icon: Icons.business_outlined,
    );
    if (!yes || !mounted) return;
    final uid = context.read<Session>().user!.uid;
    await runAction(
      context,
      () => BouncerService.instance.sendJoinRequest(widget.personnel, uid, a),
      done: 'Request sent to ${a.name}.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.personnel;
    return StreamBuilder<JoinRequest?>(
      stream: _request,
      builder: (context, snap) {
        if (snap.hasError) debugPrint('joinRequest: ${snap.error}');
        final req = snap.data;
        if (p.inAgency) {
          if (_nameFor != p.agencyId) {
            _nameFor = p.agencyId;
            _name = BouncerService.instance.agencyName(p.agencyId);
          }
          return FutureBuilder<String?>(
            future: _name,
            builder: (context, n) {
              final fromJobs = widget.assignments
                  .where(
                    (a) => a.agencyId == p.agencyId && a.agencyName.isNotEmpty,
                  )
                  .map((a) => a.agencyName);
              final name =
                  n.data ??
                  (req?.agencyId == p.agencyId ? req!.agencyName : null) ??
                  (fromJobs.isEmpty ? null : fromJobs.first) ??
                  'Your agency';
              return Surface(
                child: Row(
                  children: [
                    Avatar(name: name, radius: 22, square: true),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Your agency',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          Text(
                            name,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ],
                      ),
                    ),
                    if (p.code.isNotEmpty) Pill(p.code),
                  ],
                ),
              );
            },
          );
        }
        if (req != null && req.status == 'pending') {
          return Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const IconBadge(
                      Icons.hourglass_top_rounded,
                      color: HavenColors.pending,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Request sent to ${req.agencyName}. You\'ll be notified when they respond.',
                        style: const TextStyle(height: 1.4),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => runAction(
                      context,
                      () => BouncerService.instance.cancelJoinRequest(p.id),
                      done: 'Request withdrawn.',
                    ),
                    child: const Text('Withdraw request'),
                  ),
                ),
              ],
            ),
          );
        }
        return Surface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const IconBadge(Icons.business_outlined),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Join an agency',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'You\'re registered independently. Agencies assign the work, so ask one to take you on with their agency code.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (req != null && req.status == 'rejected') ...[
                const SizedBox(height: 10),
                SoftBanner(
                  icon: Icons.info_outline,
                  color: HavenColors.declined,
                  text:
                      '${req.agencyName} declined your last request. You can try another agency.',
                ),
              ],
              const SizedBox(height: 14),
              SecondaryButton(
                label: 'Enter agency code',
                icon: Icons.vpn_key_outlined,
                onPressed: _join,
              ),
            ],
          ),
        );
      },
    );
  }
}
