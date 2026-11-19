import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../services/bouncer_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final Stream<List<AppNotification>> _stream = BouncerService.instance
      .notifications(context.read<Session>().user!.uid);

  Future<void> _read(AppNotification n) async {
    if (n.read) return;
    try {
      await BouncerService.instance.markRead(n.id);
    } catch (e) {
      debugPrint('markRead: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<AppNotification>>(
      stream: _stream,
      builder: (context, snap) {
        final list = snap.data ?? const <AppNotification>[];
        final unread = list.where((n) => !n.read).toList();
        return Scaffold(
          appBar: AppBar(
            title: const Text('Notifications'),
            actions: [
              if (unread.isNotEmpty)
                TextButton(
                  onPressed: () async {
                    for (final n in unread) {
                      await _read(n);
                    }
                  },
                  child: const Text('Mark all read'),
                ),
            ],
          ),
          body: Builder(
            builder: (context) {
              if (snap.hasError) {
                debugPrint('notifications: ${snap.error}');
                return const EmptyState(
                  icon: Icons.cloud_off_outlined,
                  title: 'We couldn\'t load notifications',
                  message: 'Please check your connection and try again.',
                );
              }
              if (!snap.hasData) return const SkeletonList(height: 70);
              if (list.isEmpty) {
                return const EmptyState(
                  icon: Icons.notifications_none_rounded,
                  title: 'All caught up',
                  message:
                      'Job offers and updates from your agency appear here.',
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                itemCount: list.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final n = list[i];
                  return ListTile(
                    onTap: () => _read(n),
                    leading: IconBadge(
                      n.type == 'emergency'
                          ? Icons.emergency_outlined
                          : n.type == 'assignment'
                          ? Icons.work_outline_rounded
                          : Icons.notifications_none_rounded,
                      color: n.read ? HavenColors.faint : HavenColors.sage,
                      size: 38,
                    ),
                    title: Text(
                      n.title,
                      style: TextStyle(
                        fontWeight: n.read ? FontWeight.w500 : FontWeight.w800,
                      ),
                    ),
                    subtitle: Text(
                      [
                        n.body,
                        if (n.createdAt != null)
                          DateFormat('d MMM, h:mm a').format(n.createdAt!),
                      ].where((s) => s.isNotEmpty).join('\n'),
                    ),
                    isThreeLine: n.body.isNotEmpty && n.createdAt != null,
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}
