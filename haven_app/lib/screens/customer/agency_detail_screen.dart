import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/agency.dart';
import '../../models/review.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'booking_form_screen.dart';

class AgencyDetailScreen extends StatefulWidget {
  final String agencyId;
  final String? initialService;
  const AgencyDetailScreen({
    super.key,
    required this.agencyId,
    this.initialService,
  });

  @override
  State<AgencyDetailScreen> createState() => _AgencyDetailScreenState();
}

class _AgencyDetailScreenState extends State<AgencyDetailScreen> {
  late final Stream<Agency?> _agency = DbService.instance.agencyStream(
    widget.agencyId,
  );
  late final Stream<List<Review>> _reviews = DbService.instance.agencyReviews(
    widget.agencyId,
  );

  void _book(Agency a, [String? service]) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BookingFormScreen(
          agency: a,
          initialService: service ?? widget.initialService,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    return StreamBuilder<Agency?>(
      stream: _agency,
      builder: (context, snap) {
        if (snap.hasError || (snap.hasData && snap.data == null)) {
          return Scaffold(
            appBar: AppBar(),
            body: const EmptyState(
              icon: Icons.storefront_outlined,
              title: 'This agency isn\'t available',
              message:
                  'It may be updating its profile. Please explore other agencies for now.',
            ),
          );
        }
        if (!snap.hasData) {
          return Scaffold(
            appBar: AppBar(),
            body: const SkeletonList(count: 3, height: 140),
          );
        }
        final a = snap.data!;
        final services = a.enabledServices;
        return Scaffold(
          appBar: AppBar(title: Text(a.name)),
          bottomNavigationBar: SafeArea(
            minimum: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: PrimaryButton(
              label: services.isEmpty ? 'Not taking bookings' : 'Book',
              icon: Icons.event_available_outlined,
              onPressed: services.isEmpty ? null : () => _book(a),
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              FadeSlideIn(
                child: Row(
                  children: [
                    Avatar(
                      url: a.logoUrl.isEmpty ? null : a.logoUrl,
                      name: a.name,
                      radius: 36,
                      square: true,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            a.name,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              RatingStars(a.rating, size: 15),
                              const SizedBox(width: 6),
                              Text(
                                a.reviewCount == 0
                                    ? 'No reviews yet'
                                    : '${a.rating.toStringAsFixed(1)} · ${a.reviewCount} reviews',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                          if (a.verified) ...[
                            const SizedBox(height: 8),
                            const Pill(
                              'Verified by Haven',
                              icon: Icons.verified_rounded,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (a.description.isNotEmpty) ...[
                const SizedBox(height: 18),
                FadeSlideIn(
                  index: 1,
                  child: Text(
                    a.description,
                    style: const TextStyle(height: 1.5),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              FadeSlideIn(
                index: 2,
                child: Surface(
                  child: Column(
                    children: [
                      if (a.yearsExperience > 0)
                        InfoTile(
                          icon: Icons.workspace_premium_outlined,
                          label: 'Experience',
                          value: '${a.yearsExperience} years',
                        ),
                      if (a.city.isNotEmpty || a.areas.isNotEmpty)
                        InfoTile(
                          icon: Icons.map_outlined,
                          label: 'Areas served',
                          value: a.areas.isNotEmpty
                              ? a.areas.join(', ')
                              : a.city,
                        ),
                      if (a.workingHours.isNotEmpty)
                        InfoTile(
                          icon: Icons.schedule_outlined,
                          label: 'Working hours',
                          value: a.workingHours,
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const SectionTitle('Services'),
              const SizedBox(height: 8),
              if (services.isEmpty)
                const Text(
                  'This agency hasn\'t listed any services yet.',
                  style: TextStyle(color: HavenColors.muted),
                ),
              for (var i = 0; i < services.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: FadeSlideIn(
                    index: i + 3,
                    child: _ServiceCard(
                      service: services[i],
                      price: session.money(services[i].hourlyRate),
                      highlighted: services[i].key == widget.initialService,
                      onBook: () => _book(a, services[i].key),
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              const SectionTitle('Reviews'),
              const SizedBox(height: 8),
              StreamBuilder<List<Review>>(
                stream: _reviews,
                builder: (context, rs) {
                  if (rs.hasError) {
                    return const Text(
                      'Reviews couldn\'t be loaded right now.',
                      style: TextStyle(color: HavenColors.muted),
                    );
                  }
                  if (!rs.hasData) return const SkeletonList(count: 2);
                  final list = rs.data!;
                  if (list.isEmpty) {
                    return const Text(
                      'No reviews yet — you could be the first.',
                      style: TextStyle(color: HavenColors.muted),
                    );
                  }
                  return Column(
                    children: [
                      for (final r in list)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _ReviewCard(review: r),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final AgencyService service;
  final String price;
  final bool highlighted;
  final VoidCallback onBook;
  const _ServiceCard({
    required this.service,
    required this.price,
    required this.highlighted,
    required this.onBook,
  });

  @override
  Widget build(BuildContext context) {
    final s = service;
    return AnimatedContainer(
      duration: Motion.medium,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: highlighted ? HavenColors.sage : Colors.transparent,
          width: 1.4,
        ),
      ),
      child: Surface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    s.label,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                Text(
                  '$price/h',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Minimum ${s.minHours} ${s.minHours == 1 ? 'hour' : 'hours'} · per person',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (s.description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(s.description, style: const TextStyle(height: 1.4)),
            ],
            if (s.requirements.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Good to know: ${s.requirements}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onBook,
                icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                label: Text('Book ${s.label}'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final Review review;
  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    final r = review;
    return Surface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  r.customerName.isEmpty ? 'Haven member' : r.customerName,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              RatingStars(r.rating.toDouble(), size: 14),
            ],
          ),
          if (r.createdAt != null)
            Text(
              DateFormat('d MMM yyyy').format(r.createdAt!),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          if (r.comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(r.comment, style: const TextStyle(height: 1.4)),
          ],
          if (r.reply.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: HavenColors.sageSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Agency reply: ${r.reply}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
