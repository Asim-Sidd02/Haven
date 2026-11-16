import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'booking_detail_screen.dart';

class BookingTile extends StatelessWidget {
  final Booking booking;
  final bool asBouncer;
  const BookingTile({
    super.key,
    required this.booking,
    required this.asBouncer,
  });

  @override
  Widget build(BuildContext context) {
    final session = context.read<Session>();
    final b = booking;
    final otherName = asBouncer ? b.customerName : b.bouncerName;
    return Pressable(
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  BookingDetailScreen(bookingId: b.id, asBouncer: asBouncer),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Avatar(
                      url: asBouncer ? null : b.bouncerPhotoUrl,
                      name: otherName,
                      radius: 22,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            otherName,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          Text(
                            b.eventType,
                            style: const TextStyle(
                              color: HavenColors.muted,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    StatusChip(b.status),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Divider(height: 1),
                ),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 16,
                      color: HavenColors.sage,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      DateFormat('EEE d MMM · h:mm a').format(b.eventDate),
                      style: const TextStyle(fontSize: 13),
                    ),
                    const Spacer(),
                    Text(
                      session.money(b.totalAmount),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: HavenColors.sageDark,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 16,
                      color: HavenColors.sage,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        b.location,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                    Text(
                      '${b.hours} h',
                      style: const TextStyle(
                        color: HavenColors.muted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
