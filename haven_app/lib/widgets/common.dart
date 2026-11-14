import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/booking.dart';
import '../theme/app_theme.dart';

/// Haven emblem — a shield holding two figures linked by a velvet rope.
/// The figures are the guards at the door; together they form an "H";
/// the rope dips into a gentle smile: protection, given with care.
/// Geometry mirrors brand/haven-emblem.svg (100×100 design grid).
class HavenLogo extends StatelessWidget {
  final double size;
  final bool showName;
  const HavenLogo({super.key, this.size = 56, this.showName = true});

  @override
  Widget build(BuildContext context) {
    final mark = SizedBox.square(
      dimension: size,
      child: const CustomPaint(painter: _HavenEmblemPainter()),
    );
    if (!showName) return mark;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      mark,
      SizedBox(height: size * 0.2),
      Text('Haven', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 6),
      const Text('SAFETY, BOOKED WITH CARE',
          style: TextStyle(
              color: HavenColors.muted, fontSize: 11, letterSpacing: 1.8)),
    ]);
  }
}

class _HavenEmblemPainter extends CustomPainter {
  const _HavenEmblemPainter();

  static const _rope = Color(0xFFD2B496);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 100, size.height / 100);

    // Shield
    final shield = Path()
      ..moveTo(50, 4)
      ..lineTo(88, 16)
      ..lineTo(88, 48)
      ..cubicTo(88, 72, 71, 88, 50, 96)
      ..cubicTo(29, 88, 12, 72, 12, 48)
      ..lineTo(12, 16)
      ..close();
    canvas.drawPath(shield, Paint()..color = HavenColors.sage);

    // Figures, scaled into the shield
    canvas
      ..translate(50, 50)
      ..scale(0.78)
      ..translate(-50, -52);
    final fg = Paint()..color = HavenColors.cream;
    canvas
      ..drawCircle(const Offset(32, 27), 6.5, fg)
      ..drawCircle(const Offset(68, 27), 6.5, fg)
      ..drawRRect(
          RRect.fromLTRBR(26.5, 38, 37.5, 78, const Radius.circular(5.5)), fg)
      ..drawRRect(
          RRect.fromLTRBR(62.5, 38, 73.5, 78, const Radius.circular(5.5)), fg);

    // Velvet rope / smile
    final rope = Path()
      ..moveTo(37.5, 50)
      ..quadraticBezierTo(50, 66, 62.5, 50);
    canvas.drawPath(
        rope,
        Paint()
          ..color = _rope
          ..style = PaintingStyle.stroke
          ..strokeWidth = 6.5
          ..strokeCap = StrokeCap.round);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class Avatar extends StatelessWidget {
  final String? url;
  final String name;
  final double radius;
  const Avatar({super.key, this.url, required this.name, this.radius = 28});

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().isEmpty
        ? '?'
        : name
            .trim()
            .split(RegExp(r'\s+'))
            .take(2)
            .map((p) => p[0].toUpperCase())
            .join();
    return CircleAvatar(
      radius: radius,
      backgroundColor: HavenColors.sandSoft,
      foregroundImage: (url != null && url!.isNotEmpty)
          ? CachedNetworkImageProvider(url!)
          : null,
      child: Text(initials,
          style: TextStyle(
              color: HavenColors.sageDark,
              fontWeight: FontWeight.w700,
              fontSize: radius * 0.6)),
    );
  }
}

class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip(this.status, {super.key});

  static Color colorFor(String s) => switch (s) {
        BookingStatus.pending => HavenColors.pending,
        BookingStatus.accepted || 'approved' => HavenColors.accepted,
        BookingStatus.completed => HavenColors.completed,
        _ => HavenColors.declined,
      };

  static String labelFor(String s) => switch (s) {
        BookingStatus.pending => 'Awaiting reply',
        BookingStatus.accepted => 'Confirmed',
        BookingStatus.declined => 'Declined',
        BookingStatus.completed => 'Completed',
        BookingStatus.cancelled => 'Cancelled',
        'approved' => 'Approved',
        'rejected' => 'Not approved',
        'suspended' => 'Suspended',
        _ => s,
      };

  @override
  Widget build(BuildContext context) {
    final c = colorFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(labelFor(status),
          style: TextStyle(
              color: c, fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }
}

class RatingStars extends StatelessWidget {
  final double rating;
  final double size;
  const RatingStars(this.rating, {super.key, this.size = 16});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final icon = rating >= i + 1
            ? Icons.star_rounded
            : rating >= i + 0.5
                ? Icons.star_half_rounded
                : Icons.star_outline_rounded;
        return Icon(icon, size: size, color: HavenColors.sand);
      }),
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final Widget? action;
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
                color: HavenColors.sageSoft, shape: BoxShape.circle),
            child: Icon(icon, size: 36, color: HavenColors.sage),
          ),
          const SizedBox(height: 16),
          Text(title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: HavenColors.muted)),
          if (action != null) ...[const SizedBox(height: 20), action!],
        ]),
      ),
    );
  }
}

class InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const InfoTile(
      {super.key, required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 20, color: HavenColors.sage),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label,
                style: const TextStyle(color: HavenColors.muted, fontSize: 12)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ]),
        ),
      ]),
    );
  }
}

class SoftBanner extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const SoftBanner(
      {super.key,
      required this.icon,
      required this.text,
      this.color = HavenColors.sage});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 12),
        Expanded(
            child: Text(text,
                style: TextStyle(color: color, fontWeight: FontWeight.w600))),
      ]),
    );
  }
}

class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const StatCard(
      {super.key, required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: HavenColors.sage, size: 20),
          const SizedBox(height: 10),
          Text(value,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          Text(label,
              style: const TextStyle(color: HavenColors.muted, fontSize: 12)),
        ]),
      ),
    );
  }
}

void showMessage(BuildContext context, String msg) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg)));
}

Future<bool> confirmDialog(BuildContext context,
    {required String title,
    required String message,
    String confirm = 'Yes',
    bool destructive = false}) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      backgroundColor: HavenColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Not now')),
        TextButton(
          onPressed: () => Navigator.pop(c, true),
          child: Text(confirm,
              style: TextStyle(
                  color: destructive ? HavenColors.declined : HavenColors.sage,
                  fontWeight: FontWeight.w700)),
        ),
      ],
    ),
  );
  return r ?? false;
}
