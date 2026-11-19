import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/agency.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'agency_detail_screen.dart';

const serviceIcons = <String, IconData>{
  'vip_squad': Icons.star_border_rounded,
  'bouncers': Icons.door_front_door_outlined,
  'gun_squad': Icons.gpp_good_outlined,
  'personal_security': Icons.person_pin_outlined,
  'home_security': Icons.home_outlined,
  'bodyguards': Icons.shield_outlined,
  'corporate_security': Icons.business_outlined,
  'gate_security': Icons.fence_outlined,
};

/// Pick a service, then browse approved agencies that offer it.
class ExploreScreen extends StatefulWidget {
  /// Service to preselect, e.g. when looking for another agency.
  final String? initialService;
  const ExploreScreen({super.key, this.initialService});
  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  late final Stream<List<Agency>> _stream = DbService.instance
      .approvedAgencies();
  late String _service = serviceLabels.containsKey(widget.initialService)
      ? widget.initialService!
      : serviceLabels.keys.first;
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final first = session.user?.name.split(' ').first ?? '';
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: FadeSlideIn(
                  child: PageTitle(
                    eyebrow: first.isEmpty ? 'Welcome' : 'Hi, $first',
                    title: 'What do you need covered?',
                    subtitle:
                        'Choose a service and we\'ll show trusted agencies ready to help.',
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 92,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  scrollDirection: Axis.horizontal,
                  itemCount: serviceLabels.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (_, i) {
                    final key = serviceLabels.keys.elementAt(i);
                    return FadeSlideIn(
                      index: i,
                      child: _ServiceChip(
                        icon: serviceIcons[key]!,
                        label: serviceLabels[key]!,
                        selected: key == _service,
                        onTap: () => setState(() => _service = key),
                      ),
                    );
                  },
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                child: TextField(
                  onChanged: (v) => setState(() => _query = v),
                  decoration: const InputDecoration(
                    hintText: 'Search by agency name or city',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
              ),
            ),
            StreamBuilder<List<Agency>>(
              stream: _stream,
              builder: (context, snap) {
                if (snap.hasError) {
                  debugPrint('Explore: failed to load agencies: ${snap.error}');
                  return const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: Icons.cloud_off_outlined,
                      title: 'We couldn\'t load agencies',
                      message:
                          'Please check your connection and try again in a moment.',
                    ),
                  );
                }
                if (!snap.hasData) {
                  return const SliverToBoxAdapter(
                    child: SkeletonList(count: 3, height: 130),
                  );
                }
                final list = snap.data!
                    .where((a) => a.offers(_service) && a.matches(_query))
                    .toList();
                if (list.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: serviceIcons[_service]!,
                      title: _query.isEmpty
                          ? 'No agencies for ${serviceLabel(_service)} yet'
                          : 'No matches for "$_query"',
                      message: _query.isEmpty
                          ? 'New agencies join Haven regularly. Try another service in the meantime.'
                          : 'Try a different name or city.',
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  sliver: SliverList.separated(
                    itemCount: list.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => FadeSlideIn(
                      key: ValueKey('${_service}_${list[i].id}'),
                      index: i,
                      child: AgencyCard(agency: list[i], service: _service),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ServiceChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ServiceChip({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      child: AnimatedContainer(
        duration: Motion.medium,
        curve: Motion.curve,
        width: 96,
        decoration: BoxDecoration(
          color: selected ? HavenColors.sage : HavenColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? HavenColors.sage : HavenColors.border,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    icon,
                    color: selected ? Colors.white : HavenColors.sage,
                    size: 24,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    label,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    style: TextStyle(
                      fontSize: 11.5,
                      height: 1.2,
                      fontWeight: FontWeight.w600,
                      color: selected ? Colors.white : HavenColors.ink,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AgencyCard extends StatelessWidget {
  final Agency agency;
  final String service;
  const AgencyCard({super.key, required this.agency, required this.service});

  @override
  Widget build(BuildContext context) {
    final session = context.read<Session>();
    final a = agency;
    final s = a.services[service];
    return Pressable(
      child: Surface(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                AgencyDetailScreen(agencyId: a.id, initialService: service),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Avatar(
              url: a.logoUrl.isEmpty ? null : a.logoUrl,
              name: a.name,
              radius: 28,
              square: true,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          a.name,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ),
                      if (a.verified) ...[
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
                    [
                      if (a.city.isNotEmpty) a.city,
                      if (a.yearsExperience > 0) '${a.yearsExperience} yrs',
                    ].join(' · '),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      RatingStars(a.rating, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        a.reviewCount == 0
                            ? 'New'
                            : '${a.rating.toStringAsFixed(1)} (${a.reviewCount})',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const Spacer(),
                      if (s != null && s.hourlyRate > 0)
                        Text(
                          'from ${session.money(s.hourlyRate)}/h',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
