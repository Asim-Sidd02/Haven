import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../models/booking.dart';
import '../theme/app_theme.dart';
import 'ui.dart';

/// Haven emblem — a shield holding two figures linked by a velvet rope.
/// The figures are the guards at the door; together they form an "H";
/// the rope dips into a gentle smile: protection, given with care.
/// Geometry mirrors brand/haven-emblem.svg (100×100 design grid).
class HavenLogo extends StatelessWidget {
  final double size;
  final bool showName;
  final bool onDark;
  const HavenLogo(
      {super.key, this.size = 56, this.showName = true, this.onDark = false});

  @override
  Widget build(BuildContext context) {
    final mark = SizedBox.square(
      dimension: size,
      child: CustomPaint(painter: _HavenEmblemPainter(onDark: onDark)),
    );
    if (!showName) return mark;
    final t = Theme.of(context).textTheme;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      mark,
      SizedBox(height: size * 0.22),
      Text('Haven',
          style: t.displaySmall
              ?.copyWith(color: onDark ? Colors.white : HavenColors.ink)),
      const SizedBox(height: 6),
      Text('SAFETY, BOOKED WITH CARE',
          style: t.labelSmall?.copyWith(
              color: onDark
                  ? Colors.white.withValues(alpha: 0.75)
                  : HavenColors.muted,
              letterSpacing: 2)),
    ]);
  }
}

class _HavenEmblemPainter extends CustomPainter {
  final bool onDark;
  const _HavenEmblemPainter({this.onDark = false});

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 100, size.height / 100);

    final shield = Path()
      ..moveTo(50, 4)
      ..lineTo(88, 16)
      ..lineTo(88, 48)
      ..cubicTo(88, 72, 71, 88, 50, 96)
      ..cubicTo(29, 88, 12, 72, 12, 48)
      ..lineTo(12, 16)
      ..close();
    canvas.drawPath(
        shield, Paint()..color = onDark ? HavenColors.cream : HavenColors.sage);

    canvas
      ..translate(50, 50)
      ..scale(0.78)
      ..translate(-50, -52);
    final fg = Paint()..color = onDark ? HavenColors.sageDark : HavenColors.cream;
    canvas
      ..drawCircle(const Offset(32, 27), 6.5, fg)
      ..drawCircle(const Offset(68, 27), 6.5, fg)
      ..drawRRect(
          RRect.fromLTRBR(26.5, 38, 37.5, 78, const Radius.circular(5.5)), fg)
      ..drawRRect(
          RRect.fromLTRBR(62.5, 38, 73.5, 78, const Radius.circular(5.5)), fg);

    final rope = Path()
      ..moveTo(37.5, 50)
      ..quadraticBezierTo(50, 66, 62.5, 50);
    canvas.drawPath(
        rope,
        Paint()
          ..color = onDark ? HavenColors.sand : HavenColors.sandLight
          ..style = PaintingStyle.stroke
          ..strokeWidth = 6.5
          ..strokeCap = StrokeCap.round);
  }

  @override
  bool shouldRepaint(covariant _HavenEmblemPainter old) => old.onDark != onDark;
}

/// Profile image with initials fallback. [square] gives a rounded square,
/// used for professionals; the circle is used for people in general.
class Avatar extends StatelessWidget {
  final String? url;
  final String name;
  final double radius;
  final bool square;
  const Avatar(
      {super.key,
      this.url,
      required this.name,
      this.radius = 28,
      this.square = false});

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
    final hasUrl = url != null && url!.isNotEmpty;
    final size = radius * 2;
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: HavenColors.sandSoft,
        shape: square ? BoxShape.rectangle : BoxShape.circle,
        borderRadius: square ? BorderRadius.circular(radius * 0.55) : null,
        image: hasUrl
            ? DecorationImage(
                image: CachedNetworkImageProvider(url!), fit: BoxFit.cover)
            : null,
      ),
      alignment: Alignment.center,
      child: hasUrl
          ? null
          : Text(initials,
              style: TextStyle(
                  color: HavenColors.sageDark,
                  fontWeight: FontWeight.w800,
                  fontSize: radius * 0.62,
                  letterSpacing: 0.5)),
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
  Widget build(BuildContext context) =>
      Pill(labelFor(status), color: colorFor(status));
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
        padding: const EdgeInsets.fromLTRB(40, 32, 40, 48),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          IconBadge(icon, size: 72),
          const SizedBox(height: 18),
          Text(title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall),
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
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        IconBadge(icon, size: 34),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 2),
            Text(value,
                style: const TextStyle(fontWeight: FontWeight.w600, height: 1.35)),
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
  final Widget? trailing;
  const SoftBanner(
      {super.key,
      required this.icon,
      required this.text,
      this.color = HavenColors.sage,
      this.trailing});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Row(children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 12),
        Expanded(
            child: Text(text,
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w600,
                    fontSize: 13.5,
                    height: 1.4))),
        if (trailing != null) ...[const SizedBox(width: 8), trailing!],
      ]),
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
    String cancel = 'Not now',
    bool destructive = false,
    IconData? icon}) async {
  final color = destructive ? HavenColors.declined : HavenColors.sage;
  final r = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      icon: IconBadge(
          icon ?? (destructive ? Icons.warning_amber_rounded : Icons.help_outline_rounded),
          color: color,
          size: 52),
      title: Text(title, textAlign: TextAlign.center),
      content: Text(message, textAlign: TextAlign.center),
      actionsAlignment: MainAxisAlignment.center,
      actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      actions: [
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(c, false),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
              child: Text(cancel),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton(
              onPressed: () => Navigator.pop(c, true),
              style: FilledButton.styleFrom(
                  backgroundColor: color, minimumSize: const Size.fromHeight(46)),
              child: Text(confirm),
            ),
          ),
        ]),
      ],
    ),
  );
  return r ?? false;
}
