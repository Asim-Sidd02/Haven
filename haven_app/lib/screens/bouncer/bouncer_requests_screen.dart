import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../shared/booking_tile.dart';

class BouncerRequestsScreen extends StatefulWidget {
  const BouncerRequestsScreen({super.key});
  @override
  State<BouncerRequestsScreen> createState() => _BouncerRequestsScreenState();
}

class _BouncerRequestsScreenState extends State<BouncerRequestsScreen> {
  String? _uid;
  late Stream<List<Booking>> _stream;

  @override
  Widget build(BuildContext context) {
    final uid = context.watch<Session>().user!.uid;
    if (_uid != uid) {
      _uid = uid;
      _stream = DbService.instance.bouncerBookings(uid);
    }

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Requests'),
          bottom: const TabBar(
            labelColor: HavenColors.sageDark,
            indicatorColor: HavenColors.sage,
            tabs: [Tab(text: 'New'), Tab(text: 'Confirmed'), Tab(text: 'History')],
          ),
        ),
        body: StreamBuilder<List<Booking>>(
          stream: _stream,
          builder: (context, snap) {
            if (!snap.hasData) {
              return snap.hasError
                  ? const EmptyState(
                      icon: Icons.cloud_off_outlined,
                      title: 'Couldn\'t load requests',
                      message: 'Please check your connection.')
                  : const Center(
                      child:
                          CircularProgressIndicator(color: HavenColors.sage));
            }
            final all = snap.data!;
            List<Booking> by(bool Function(Booking) f) => all.where(f).toList();
            return TabBarView(children: [
              _List(
                by((b) => b.status == BookingStatus.pending),
                const EmptyState(
                    icon: Icons.inbox_outlined,
                    title: 'All caught up',
                    message: 'New booking requests will appear here.'),
              ),
              _List(
                by((b) => b.status == BookingStatus.accepted)
                  ..sort((a, b) => a.eventDate.compareTo(b.eventDate)),
                const EmptyState(
                    icon: Icons.event_available_outlined,
                    title: 'No confirmed events',
                    message: 'Bookings you accept will be listed here.'),
              ),
              _List(
                by((b) => !b.isUpcoming),
                const EmptyState(
                    icon: Icons.history_rounded,
                    title: 'No history yet',
                    message: 'Completed, declined and cancelled bookings live here.'),
              ),
            ]);
          },
        ),
      ),
    );
  }
}

class _List extends StatelessWidget {
  final List<Booking> items;
  final Widget empty;
  const _List(this.items, this.empty);

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return empty;
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => BookingTile(booking: items[i], asBouncer: true),
    );
  }
}
