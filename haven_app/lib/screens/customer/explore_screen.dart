import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/bouncer.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'bouncer_detail_screen.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});
  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  late final Stream<List<Bouncer>> _stream = DbService.instance
      .approvedBouncers();
  String _query = '';
  String? _city;
  bool _availableOnly = true;
  bool _verifiedOnly = false;

  List<Bouncer> _filter(List<Bouncer> all) {
    final q = _query.toLowerCase();
    return all.where((b) {
      if (_availableOnly && !b.available) return false;
      if (_verifiedOnly && !b.verified) return false;
      if (_city != null && b.city != _city) return false;
      if (q.isEmpty) return true;
      return b.name.toLowerCase().contains(q) ||
          b.city.toLowerCase().contains(q) ||
          b.skills.any((s) => s.toLowerCase().contains(q));
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final firstName = (session.user?.name ?? '').split(' ').first;

    return SafeArea(
      child: StreamBuilder<List<Bouncer>>(
        stream: _stream,
        builder: (context, snap) {
          final all = snap.data ?? [];
          final cities = {
            for (final b in all)
              if (b.city.isNotEmpty) b.city,
          }.toList()..sort();
          final list = _filter(all);

          return CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                sliver: SliverList.list(
                  children: [
                    FadeSlideIn(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hello${firstName.isEmpty ? '' : ', $firstName'}',
                            style: const TextStyle(color: HavenColors.muted),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Who would you like\nlooking out for you?',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    TextField(
                      onChanged: (v) => setState(() => _query = v),
                      decoration: const InputDecoration(
                        hintText: 'Search name, city or skill',
                        prefixIcon: Icon(Icons.search_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          FilterChip(
                            label: const Text('Available now'),
                            selected: _availableOnly,
                            onSelected: (v) =>
                                setState(() => _availableOnly = v),
                          ),
                          const SizedBox(width: 8),
                          FilterChip(
                            label: const Text('Verified'),
                            selected: _verifiedOnly,
                            onSelected: (v) =>
                                setState(() => _verifiedOnly = v),
                          ),
                          const SizedBox(width: 8),
                          for (final c in cities) ...[
                            ChoiceChip(
                              label: Text(c),
                              selected: _city == c,
                              onSelected: (v) =>
                                  setState(() => _city = v ? c : null),
                            ),
                            const SizedBox(width: 8),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (snap.connectionState == ConnectionState.waiting &&
                  !snap.hasData)
                const SliverFillRemaining(
                  child: Center(child: SkeletonList(count: 4, height: 96)),
                )
              else if (snap.hasError)
                const SliverFillRemaining(
                  child: EmptyState(
                    icon: Icons.cloud_off_outlined,
                    title: 'We couldn\'t load professionals',
                    message: 'Please check your connection and try again.',
                  ),
                )
              else if (list.isEmpty)
                const SliverFillRemaining(
                  child: EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'No one matches just yet',
                    message:
                        'Try loosening your filters or searching another city.',
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  sliver: SliverList.separated(
                    itemCount: list.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => FadeSlideIn(
                      key: ValueKey(list[i].uid),
                      index: i,
                      child: BouncerCard(bouncer: list[i]),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class BouncerCard extends StatelessWidget {
  final Bouncer bouncer;
  const BouncerCard({super.key, required this.bouncer});

  @override
  Widget build(BuildContext context) {
    final session = context.read<Session>();
    final b = bouncer;
    return Pressable(
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => BouncerDetailScreen(bouncerId: b.uid),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Avatar(url: b.photoUrl, name: b.name, radius: 32),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              b.name,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                          ),
                          if (b.verified) ...[
                            const SizedBox(width: 4),
                            const Icon(
                              Icons.verified_rounded,
                              size: 16,
                              color: HavenColors.sage,
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${b.city.isEmpty ? '—' : b.city} · ${b.experienceYears} yrs experience',
                        style: const TextStyle(
                          color: HavenColors.muted,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          RatingStars(b.rating, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            b.reviewCount == 0
                                ? 'New'
                                : '${b.rating.toStringAsFixed(1)} (${b.reviewCount})',
                            style: const TextStyle(
                              fontSize: 12,
                              color: HavenColors.muted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      session.money(b.hourlyRate),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: HavenColors.sageDark,
                      ),
                    ),
                    const Text(
                      'per hour',
                      style: TextStyle(fontSize: 11, color: HavenColors.muted),
                    ),
                    const SizedBox(height: 8),
                    if (!b.available)
                      const Text(
                        'Busy',
                        style: TextStyle(
                          fontSize: 11,
                          color: HavenColors.declined,
                          fontWeight: FontWeight.w700,
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
