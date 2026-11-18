import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import '../shared/booking_tile.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});
  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  Stream<List<Booking>>? _stream;
  String? _uid;

  @override
  Widget build(BuildContext context) {
    final uid = context.watch<Session>().user!.uid;
    if (uid != _uid) {
      _uid = uid;
      _stream = DbService.instance.customerBookings(uid);
    }
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My bookings'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Active'),
              Tab(text: 'Past'),
            ],
          ),
        ),
        body: StreamBuilder<List<Booking>>(
          stream: _stream,
          builder: (context, snap) {
            if (snap.hasError) {
              return const EmptyState(
                icon: Icons.cloud_off_outlined,
                title: 'We couldn\'t load your bookings',
                message: 'Please check your connection and try again.',
              );
            }
            if (!snap.hasData) return const SkeletonList();
            final all = snap.data!;
            final active = all.where((b) => b.isActive).toList();
            final past = all.where((b) => !b.isActive).toList();
            return TabBarView(
              children: [
                _List(
                  bookings: active,
                  emptyTitle: 'Nothing booked yet',
                  emptyMessage:
                      'When you book an agency, you\'ll follow every step here.',
                ),
                _List(
                  bookings: past,
                  emptyTitle: 'No past bookings',
                  emptyMessage:
                      'Completed and cancelled bookings will appear here.',
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _List extends StatelessWidget {
  final List<Booking> bookings;
  final String emptyTitle;
  final String emptyMessage;
  const _List({
    required this.bookings,
    required this.emptyTitle,
    required this.emptyMessage,
  });

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return EmptyState(
        icon: Icons.event_note_outlined,
        title: emptyTitle,
        message: emptyMessage,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: bookings.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => FadeSlideIn(
        key: ValueKey(bookings[i].id),
        index: i,
        child: BookingTile(booking: bookings[i]),
      ),
    );
  }
}
