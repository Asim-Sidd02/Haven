import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/bouncer.dart';
import '../../models/review.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import 'booking_form_screen.dart';

class BouncerDetailScreen extends StatelessWidget {
  final String bouncerId;
  const BouncerDetailScreen({super.key, required this.bouncerId});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    return StreamBuilder<Bouncer?>(
      stream: DbService.instance.bouncerStream(bouncerId),
      builder: (context, snap) {
        final b = snap.data;
        if (b == null) {
          return Scaffold(
            appBar: AppBar(),
            body: snap.connectionState == ConnectionState.waiting
                ? const Center(
                    child: CircularProgressIndicator(color: HavenColors.sage))
                : const EmptyState(
                    icon: Icons.person_off_outlined,
                    title: 'Profile unavailable',
                    message: 'This professional isn\'t taking bookings right now.'),
          );
        }
        return Scaffold(
          appBar: AppBar(title: const Text('Profile')),
          body: ListView(padding: const EdgeInsets.all(20), children: [
            Center(child: Avatar(url: b.photoUrl, name: b.name, radius: 52)),
            const SizedBox(height: 14),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Flexible(
                child: Text(b.name,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall),
              ),
              if (b.verified) ...[
                const SizedBox(width: 6),
                const Icon(Icons.verified_rounded, color: HavenColors.sage),
              ],
            ]),
            const SizedBox(height: 4),
            Center(
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                RatingStars(b.rating),
                const SizedBox(width: 6),
                Text(
                    b.reviewCount == 0
                        ? 'No reviews yet'
                        : '${b.rating.toStringAsFixed(1)} · ${b.reviewCount} reviews',
                    style: const TextStyle(color: HavenColors.muted)),
              ]),
            ),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(
                  child: StatCard(
                      label: 'Experience',
                      value: '${b.experienceYears} yrs',
                      icon: Icons.workspace_premium_outlined)),
              const SizedBox(width: 10),
              Expanded(
                  child: StatCard(
                      label: 'Height',
                      value: b.heightCm > 0 ? '${b.heightCm} cm' : '—',
                      icon: Icons.straighten_rounded)),
              const SizedBox(width: 10),
              Expanded(
                  child: StatCard(
                      label: 'Per hour',
                      value: session.money(b.hourlyRate),
                      icon: Icons.payments_outlined)),
            ]),
            const SizedBox(height: 20),
            _Section(
              title: 'About',
              child: Text(b.bio.isEmpty ? 'No bio yet.' : b.bio,
                  style: const TextStyle(height: 1.5)),
            ),
            if (b.city.isNotEmpty)
              InfoTile(
                  icon: Icons.location_on_outlined,
                  label: 'Based in',
                  value: b.city),
            if (b.languages.isNotEmpty)
              InfoTile(
                  icon: Icons.translate_rounded,
                  label: 'Languages',
                  value: b.languages.join(', ')),
            if (b.skills.isNotEmpty) ...[
              const SizedBox(height: 12),
              _Section(
                title: 'Skills',
                child: Wrap(spacing: 8, runSpacing: 8, children: [
                  for (final s in b.skills)
                    Chip(
                      label: Text(s),
                      backgroundColor: HavenColors.sageSoft,
                      side: BorderSide.none,
                    ),
                ]),
              ),
            ],
            const SizedBox(height: 20),
            Text('What clients say',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            _Reviews(bouncerId: b.uid),
            const SizedBox(height: 90),
          ]),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: FilledButton.icon(
                onPressed: b.available
                    ? () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => BookingFormScreen(bouncer: b)))
                    : null,
                icon: const Icon(Icons.event_available_outlined),
                label: Text(b.available
                    ? 'Request a booking'
                    : 'Not taking bookings right now'),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;
  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      child,
      const SizedBox(height: 8),
    ]);
  }
}

class _Reviews extends StatelessWidget {
  final String bouncerId;
  const _Reviews({required this.bouncerId});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Review>>(
      stream: DbService.instance.bouncerReviews(bouncerId),
      builder: (context, snap) {
        final reviews = snap.data ?? [];
        if (reviews.isEmpty) {
          return const Text('No reviews yet — be the first to share your experience.',
              style: TextStyle(color: HavenColors.muted));
        }
        return Column(children: [
          for (final r in reviews)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(
                            child: Text(r.customerName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700)),
                          ),
                          RatingStars(r.rating.toDouble(), size: 14),
                        ]),
                        if (r.createdAt != null)
                          Text(DateFormat.yMMMd().format(r.createdAt!),
                              style: const TextStyle(
                                  color: HavenColors.muted, fontSize: 12)),
                        if (r.comment.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(r.comment, style: const TextStyle(height: 1.4)),
                        ],
                      ]),
                ),
              ),
            ),
        ]);
      },
    );
  }
}
