import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import 'review_sheet.dart';

class BookingDetailScreen extends StatelessWidget {
  final String bookingId;
  final bool asBouncer;
  const BookingDetailScreen({
    super.key,
    required this.bookingId,
    required this.asBouncer,
  });

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    return Scaffold(
      appBar: AppBar(title: const Text('Booking details')),
      body: StreamBuilder<Booking?>(
        stream: DbService.instance.bookingStream(bookingId),
        builder: (context, snap) {
          final b = snap.data;
          if (b == null) {
            return snap.connectionState == ConnectionState.waiting
                ? const Center(
                    child: CircularProgressIndicator(color: HavenColors.sage),
                  )
                : const EmptyState(
                    icon: Icons.event_busy_outlined,
                    title: 'Booking not found',
                    message: 'It may have been removed.',
                  );
          }
          final otherName = asBouncer ? b.customerName : b.bouncerName;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                children: [
                  Avatar(
                    url: asBouncer ? null : b.bouncerPhotoUrl,
                    name: otherName,
                    radius: 30,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          asBouncer ? 'Requested by' : 'Your professional',
                          style: const TextStyle(
                            color: HavenColors.muted,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          otherName,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                  ),
                  StatusChip(b.status),
                ],
              ),
              const SizedBox(height: 16),
              _statusBanner(b),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Column(
                    children: [
                      InfoTile(
                        icon: Icons.celebration_outlined,
                        label: 'Event',
                        value: b.eventType,
                      ),
                      InfoTile(
                        icon: Icons.calendar_today_outlined,
                        label: 'When',
                        value: DateFormat(
                          'EEEE, d MMMM y · h:mm a',
                        ).format(b.eventDate),
                      ),
                      InfoTile(
                        icon: Icons.timelapse_rounded,
                        label: 'Duration',
                        value: '${b.hours} hours',
                      ),
                      InfoTile(
                        icon: Icons.location_on_outlined,
                        label: 'Venue',
                        value: b.location,
                      ),
                      InfoTile(
                        icon: Icons.groups_outlined,
                        label: 'Expected guests',
                        value: '${b.guests}',
                      ),
                      if (asBouncer &&
                          b.customerPhone.isNotEmpty &&
                          b.status == BookingStatus.accepted)
                        InfoTile(
                          icon: Icons.phone_outlined,
                          label: 'Client phone',
                          value: b.customerPhone,
                        ),
                      if (b.notes.isNotEmpty)
                        InfoTile(
                          icon: Icons.sticky_note_2_outlined,
                          label: 'Notes',
                          value: b.notes,
                        ),
                      if (b.bouncerNote.isNotEmpty)
                        InfoTile(
                          icon: Icons.chat_bubble_outline,
                          label:
                              'Message from ${b.bouncerName.split(' ').first}',
                          value: b.bouncerNote,
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: HavenColors.sandSoft,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Text(
                      '${session.money(b.hourlyRate)} × ${b.hours} h',
                      style: const TextStyle(color: HavenColors.muted),
                    ),
                    const Spacer(),
                    Text(
                      session.money(b.totalAmount),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        color: HavenColors.sageDark,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              ..._actions(context, b, session),
            ],
          );
        },
      ),
    );
  }

  Widget _statusBanner(Booking b) {
    final (IconData icon, String text) = switch (b.status) {
      BookingStatus.pending => (
        Icons.hourglass_top_rounded,
        asBouncer
            ? 'This client is waiting for your reply.'
            : 'Your request has been sent. We\'ll let you know as soon as there\'s a reply.',
      ),
      BookingStatus.accepted => (
        Icons.check_circle_outline,
        asBouncer
            ? 'You\'ve confirmed this booking. Mark it complete after the event.'
            : 'Confirmed! Your professional will be there for you.',
      ),
      BookingStatus.completed => (
        Icons.favorite_border,
        asBouncer
            ? 'Event completed. Thank you for keeping people safe.'
            : 'We hope everything went smoothly.',
      ),
      BookingStatus.declined => (
        Icons.info_outline,
        asBouncer
            ? 'You declined this request.'
            : 'This professional isn\'t available. Others would be glad to help.',
      ),
      _ => (Icons.block_rounded, 'This booking was cancelled.'),
    };
    return SoftBanner(
      icon: icon,
      text: text,
      color: StatusChip.colorFor(b.status),
    );
  }

  List<Widget> _actions(BuildContext context, Booking b, Session session) {
    Future<void> run(Future<void> Function() f, String done) async {
      try {
        await f();
        if (context.mounted) showMessage(context, done);
      } catch (e) {
        if (context.mounted) showMessage(context, AuthService.friendlyError(e));
      }
    }

    final db = DbService.instance;

    if (asBouncer) {
      if (b.status == BookingStatus.pending) {
        return [
          FilledButton.icon(
            icon: const Icon(Icons.check_rounded),
            label: const Text('Accept booking'),
            onPressed: () async {
              final note = await _askNote(
                context,
                'Add a note for the client',
                'e.g. I\'ll arrive 30 minutes early to walk the venue.',
              );
              if (note == null) return;
              await run(
                () => db.setBookingStatus(
                  b.id,
                  BookingStatus.accepted,
                  note: note,
                ),
                'Booking accepted',
              );
            },
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () async {
              final note = await _askNote(
                context,
                'Decline kindly',
                'Let the client know why (optional).',
              );
              if (note == null) return;
              await run(
                () => db.setBookingStatus(
                  b.id,
                  BookingStatus.declined,
                  note: note,
                ),
                'Booking declined',
              );
            },
            child: const Text('Decline'),
          ),
        ];
      }
      if (b.status == BookingStatus.accepted) {
        return [
          FilledButton.icon(
            icon: const Icon(Icons.task_alt_rounded),
            label: const Text('Mark as completed'),
            onPressed: () async {
              if (!await confirmDialog(
                context,
                title: 'Event finished?',
                message: 'The client will be invited to leave a review.',
                confirm: 'Mark complete',
              )) {
                return;
              }
              await run(
                () => db.setBookingStatus(b.id, BookingStatus.completed),
                'Marked as completed',
              );
            },
          ),
        ];
      }
      return [];
    }

    // Customer actions
    final widgets = <Widget>[];
    if (b.status == BookingStatus.completed && !b.reviewed) {
      widgets.add(
        FilledButton.icon(
          icon: const Icon(Icons.star_outline_rounded),
          label: const Text('Leave a review'),
          onPressed: () => showReviewSheet(context, b, session.user!.name),
        ),
      );
    }
    if (b.status == BookingStatus.completed && b.reviewed) {
      widgets.add(
        const SoftBanner(
          icon: Icons.favorite_rounded,
          text: 'Thanks for sharing your review!',
          color: HavenColors.sand,
        ),
      );
    }
    if (b.isUpcoming) {
      widgets.add(
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            foregroundColor: HavenColors.declined,
          ),
          onPressed: () async {
            if (!await confirmDialog(
              context,
              title: 'Cancel this booking?',
              message: 'Your professional will be notified.',
              confirm: 'Cancel booking',
              destructive: true,
            )) {
              return;
            }
            await run(
              () => db.setBookingStatus(b.id, BookingStatus.cancelled),
              'Booking cancelled',
            );
          },
          child: const Text('Cancel booking'),
        ),
      );
    }
    return widgets;
  }

  Future<String?> _askNote(BuildContext context, String title, String hint) {
    final c = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: HavenColors.surface,
        title: Text(title),
        content: TextField(
          controller: c,
          maxLines: 3,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Back'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, c.text.trim()),
            child: const Text(
              'Send',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
