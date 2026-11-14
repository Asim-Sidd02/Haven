import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Primary call-to-action with a built-in loading state.
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  const PrimaryButton(
      {super.key,
      required this.label,
      required this.onPressed,
      this.loading = false,
      this.icon});

  @override
  Widget build(BuildContext context) {
    final child = loading
        ? const SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
        : Row(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
            Text(label),
          ]);
    return FilledButton(onPressed: loading ? null : onPressed, child: child);
  }
}

class SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color? color;
  const SecondaryButton(
      {super.key,
      required this.label,
      required this.onPressed,
      this.icon,
      this.color});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: color == null
          ? null
          : OutlinedButton.styleFrom(
              foregroundColor: color,
              side: BorderSide(color: color!.withValues(alpha: 0.35))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
        Text(label),
      ]),
    );
  }
}

/// Large screen title with optional eyebrow and subtitle.
class PageTitle extends StatelessWidget {
  final String title;
  final String? eyebrow;
  final String? subtitle;
  final Widget? trailing;
  const PageTitle(
      {super.key,
      required this.title,
      this.eyebrow,
      this.subtitle,
      this.trailing});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (eyebrow != null) ...[
            Text(eyebrow!.toUpperCase(), style: t.labelSmall),
            const SizedBox(height: 6),
          ],
          Text(title, style: t.headlineMedium),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle!, style: t.bodyMedium?.copyWith(color: HavenColors.muted)),
          ],
        ]),
      ),
      if (trailing != null) trailing!,
    ]);
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  const SectionTitle(this.title, {super.key, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
        if (actionLabel != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap),
            child: Text(actionLabel!),
          ),
      ]),
    );
  }
}

/// White surface with border and the brand's soft shadow.
class Surface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color color;
  final double radius;
  const Surface(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(16),
      this.onTap,
      this.color = HavenColors.surface,
      this.radius = 18});

  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(radius);
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: r,
        border: Border.all(color: HavenColors.border),
        boxShadow: HavenColors.softShadow,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: r,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

/// Deep-sage gradient block used at the top of hero screens.
class HeroPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final BorderRadius? borderRadius;
  const HeroPanel(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(20),
      this.borderRadius});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [HavenColors.sageDark, HavenColors.sage],
        ),
      ),
      child: child,
    );
  }
}

/// Compact metric used on dashboards and profiles.
class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color tint;
  const StatTile(
      {super.key,
      required this.label,
      required this.value,
      required this.icon,
      this.tint = HavenColors.sage});

  @override
  Widget build(BuildContext context) {
    return Surface(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: tint),
        ),
        const SizedBox(height: 12),
        Text(value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
                fontSize: 20, fontWeight: FontWeight.w800, height: 1.1)),
        const SizedBox(height: 2),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ]),
    );
  }
}

/// Icon inside a tinted rounded square.
class IconBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  const IconBadge(this.icon,
      {super.key, this.color = HavenColors.sage, this.size = 40});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(size * 0.3)),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }
}

/// Label + value pair.
class Pill extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Color color;
  final bool filled;
  const Pill(this.text,
      {super.key, this.icon, this.color = HavenColors.sage, this.filled = false});

  @override
  Widget build(BuildContext context) {
    final fg = filled ? Colors.white : color;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: filled ? color : color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 4)],
        Text(text,
            style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

/// Soft pulsing placeholder shown while data loads.
class Skeleton extends StatefulWidget {
  final double height;
  final double? width;
  final double radius;
  const Skeleton({super.key, this.height = 16, this.width, this.radius = 8});

  /// A list-card shaped skeleton.
  static Widget card({double height = 110}) => Skeleton(height: height, radius: 18);

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 1100))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 0.45, end: 1.0).animate(_c),
      child: Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          color: HavenColors.border.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

class SkeletonList extends StatelessWidget {
  final int count;
  final double height;
  const SkeletonList({super.key, this.count = 4, this.height = 120});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(Gap.page),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, _) => Skeleton.card(height: height),
    );
  }
}

/// Horizontal progress of a booking: requested → confirmed → completed.
class StatusTimeline extends StatelessWidget {
  final int current; // 0..2; -1 for ended early (declined/cancelled)
  final Color color;
  const StatusTimeline({super.key, required this.current, required this.color});

  static const _steps = ['Requested', 'Confirmed', 'Completed'];

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      for (var i = 0; i < _steps.length; i++) ...[
        Expanded(
          child: Column(children: [
            Container(
              height: 6,
              decoration: BoxDecoration(
                color: i <= current ? color : HavenColors.border,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 8),
            Text(_steps[i],
                style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: i <= current ? color : HavenColors.faint)),
          ]),
        ),
        if (i < _steps.length - 1) const SizedBox(width: 6),
      ],
    ]);
  }
}

/// Small dotted divider used between groups inside a card.
class HairlineDivider extends StatelessWidget {
  final double vertical;
  const HairlineDivider({super.key, this.vertical = 12});
  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.symmetric(vertical: vertical),
        child: const Divider(height: 1),
      );
}
