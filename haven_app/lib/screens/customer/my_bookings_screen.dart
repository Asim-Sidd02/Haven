import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
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
    if (_uid != uid) {
      _uid = uid;
      _stream = DbService.instance.customerBookings(uid);
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My bookings'),
          bottom: const TabBar(
            labelColor: HavenColors.sageDark,
            indicatorColor: HavenColors.sage,
            tabs: [
              Tab(text: 'Upcoming'),
              Tab(text: 'Past'),
            ],
          ),
        ),
        body: StreamBuilder<List<Booking>>(
          stream: _stream,
          builder: (context, snap) {
            if (!snap.hasData) {
              return snap.hasError
                  ? const EmptyState(
                      icon: Icons.cloud_off_outlined,
                      title: 'Couldn\'t load bookings',
                      message: 'Please check your connection.',
                    )
                  : const Center(
                      child: CircularProgressIndicator(color: HavenColors.sage),
                    );
            }
            final all = snap.data!;
            final upcoming = all.where((b) => b.isUpcoming).toList();
            final past = all.where((b) => !b.isUpcoming).toList();
            return TabBarView(
              children: [
                _List(
                  bookings: upcoming,
                  empty: const EmptyState(
                    icon: Icons.event_available_outlined,
                    title: 'Nothing planned yet',
                    message:
                        'When you request a booking, you\'ll be able to follow it here.',
                  ),
                ),
                _List(
                  bookings: past,
                  empty: const EmptyState(
                    icon: Icons.history_rounded,
                    title: 'No past bookings',
                    message:
                        'Your completed and cancelled bookings will appear here.',
                  ),
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
  final Widget empty;
  const _List({required this.bookings, required this.empty});

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) return empty;
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: bookings.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => FadeSlideIn(
        key: ValueKey(bookings[i].id),
        index: i,
        child: BookingTile(booking: bookings[i], asBouncer: false),
      ),
    );
  }
}
