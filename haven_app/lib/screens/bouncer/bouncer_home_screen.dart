import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../models/bouncer.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import '../shared/booking_tile.dart';

class BouncerHomeScreen extends StatefulWidget {
  final ValueChanged<int> onOpenTab;
  const BouncerHomeScreen({super.key, required this.onOpenTab});
  @override
  State<BouncerHomeScreen> createState() => _BouncerHomeScreenState();
}

class _BouncerHomeScreenState extends State<BouncerHomeScreen> {
  String? _uid;
  late Stream<Bouncer?> _profile;
  late Stream<List<Booking>> _bookings;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final uid = session.user!.uid;
    if (_uid != uid) {
      _uid = uid;
      _profile = DbService.instance.bouncerStream(uid);
      _bookings = DbService.instance.bouncerBookings(uid);
    }
    final firstName = session.user!.name.split(' ').first;

    return SafeArea(
      child: StreamBuilder<Bouncer?>(
        stream: _profile,
        builder: (context, pSnap) {
          final p = pSnap.data;
          return StreamBuilder<List<Booking>>(
            stream: _bookings,
            builder: (context, bSnap) {
              final bookings = bSnap.data ?? [];
              final pending = bookings
                  .where((b) => b.status == BookingStatus.pending)
                  .toList();
              final upcoming =
                  bookings
                      .where((b) => b.status == BookingStatus.accepted)
                      .toList()
                    ..sort((a, b) => a.eventDate.compareTo(b.eventDate));
              final completed = bookings.where(
                (b) => b.status == BookingStatus.completed,
              );
              final earned = completed.fold<double>(
                0,
                (s, b) => s + b.totalAmount,
              );

              return ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Text(
                    'Welcome, $firstName',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Thank you for keeping people safe.',
                    style: TextStyle(color: HavenColors.muted),
                  ),
                  const SizedBox(height: 18),
                  if (p != null) ..._statusCards(context, p),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: StatTile(
                          label: 'New requests',
                          value: '${pending.length}',
                          icon: Icons.mark_email_unread_outlined,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: StatTile(
                          label: 'Completed',
                          value: '${completed.length}',
                          icon: Icons.task_alt_rounded,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: StatTile(
                          label: 'Rating',
                          value: (p == null || p.reviewCount == 0)
                              ? '—'
                              : p.rating.toStringAsFixed(1),
                          icon: Icons.star_outline_rounded,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Card(
                    child: ListTile(
                      leading: const Icon(
                        Icons.savings_outlined,
                        color: HavenColors.sage,
                      ),
                      title: const Text('Total earned'),
                      trailing: Text(
                        session.money(earned),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: HavenColors.sageDark,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  _header(
                    context,
                    'Waiting for your reply',
                    pending.isEmpty ? null : () => widget.onOpenTab(1),
                  ),
                  if (pending.isEmpty)
                    const _Hint('No new requests right now.')
                  else
                    for (final b in pending.take(3))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: BookingTile(booking: b, asBouncer: true),
                      ),
                  const SizedBox(height: 12),
                  _header(context, 'Coming up', null),
                  if (upcoming.isEmpty)
                    const _Hint('No confirmed events yet.')
                  else
                    for (final b in upcoming.take(3))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: BookingTile(booking: b, asBouncer: true),
                      ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  List<Widget> _statusCards(BuildContext context, Bouncer p) {
    final cards = <Widget>[];
    if (!p.isProfileComplete) {
      cards.add(
        Card(
          color: HavenColors.sandSoft,
          child: ListTile(
            leading: const Icon(
              Icons.edit_note_rounded,
              color: HavenColors.sageDark,
            ),
            title: const Text(
              'Complete your profile',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: const Text(
              'Add a bio, your city and hourly rate so our team can review you.',
            ),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => widget.onOpenTab(2),
          ),
        ),
      );
      cards.add(const SizedBox(height: 10));
    }
    final (IconData icon, String text, Color color) = switch (p.status) {
      'approved' => (
        Icons.verified_user_outlined,
        'Your profile is live — customers can find and book you.',
        HavenColors.sage,
      ),
      'rejected' => (
        Icons.info_outline,
        'Your profile wasn\'t approved yet. Please update your details or contact support.',
        HavenColors.declined,
      ),
      'suspended' => (
        Icons.pause_circle_outline,
        'Your profile is paused by our team. Please contact support.',
        HavenColors.declined,
      ),
      _ => (
        Icons.hourglass_top_rounded,
        'Our team is reviewing your profile. This usually takes a day or two.',
        HavenColors.pending,
      ),
    };
    cards.add(SoftBanner(icon: icon, text: text, color: color));
    if (p.isApproved) {
      cards.add(const SizedBox(height: 10));
      cards.add(
        Card(
          child: SwitchListTile(
            activeThumbColor: HavenColors.sage,
            title: const Text(
              'Taking bookings',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: Text(
              p.available
                  ? 'Customers can send you requests'
                  : 'You\'re hidden from "Available now"',
            ),
            value: p.available,
            onChanged: (v) async {
              try {
                await DbService.instance.setAvailability(p.uid, v);
              } catch (e) {
                if (context.mounted) {
                  showMessage(context, AuthService.friendlyError(e));
                }
              }
            },
          ),
        ),
      );
    }
    return cards;
  }

  Widget _header(BuildContext context, String title, VoidCallback? onAll) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          if (onAll != null)
            TextButton(onPressed: onAll, child: const Text('See all')),
        ],
      ),
    );
  }
}

class _Hint extends StatelessWidget {
  final String text;
  const _Hint(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(text, style: const TextStyle(color: HavenColors.muted)),
  );
}
