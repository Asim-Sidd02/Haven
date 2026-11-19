import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../state/session.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'assignments_screen.dart';
import 'availability_screen.dart';
import 'bouncer_home_screen.dart';
import 'bouncer_profile_screen.dart';
import 'get_started_screen.dart';

/// Entry point for bouncer accounts. Unlinked accounts see onboarding;
/// linked ones get the four-tab app.
class BouncerShell extends StatelessWidget {
  const BouncerShell({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<Session>().user!;
    final pid = user.personnelId;
    if (pid == null) return const GetStartedScreen();
    return _LinkedShell(key: ValueKey(pid), personnelId: pid);
  }
}

class _LinkedShell extends StatefulWidget {
  final String personnelId;
  const _LinkedShell({super.key, required this.personnelId});
  @override
  State<_LinkedShell> createState() => _LinkedShellState();
}

class _LinkedShellState extends State<_LinkedShell> {
  late final Stream<Personnel?> _personnel = BouncerService.instance
      .personnelStream(widget.personnelId);
  late final Stream<List<Assignment>> _assignments = BouncerService.instance
      .assignments(widget.personnelId);
  int _index = 0;
  String? _syncedAgency;

  void _maybeResync(Personnel p) {
    if (p.agencyId.isEmpty || _syncedAgency == p.agencyId) return;
    _syncedAgency = p.agencyId;
    BouncerService.instance.resyncDocuments(p).catchError((Object e) {
      debugPrint('resyncDocuments: $e');
    });
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Personnel?>(
      stream: _personnel,
      builder: (context, snap) {
        if (snap.hasError) {
          debugPrint('personnel stream: ${snap.error}');
          return const Scaffold(
            body: EmptyState(
              icon: Icons.cloud_off_outlined,
              title: 'We couldn\'t load your profile',
              message: 'Please check your connection and reopen the app.',
            ),
          );
        }
        if (!snap.hasData) {
          return const Scaffold(body: SafeArea(child: SkeletonList()));
        }
        final p = snap.data;
        if (p == null) {
          return const Scaffold(
            body: EmptyState(
              icon: Icons.person_off_outlined,
              title: 'Profile not found',
              message:
                  'Your personnel record was removed. Please contact your agency or Haven support.',
            ),
          );
        }
        _maybeResync(p);
        return StreamBuilder<List<Assignment>>(
          stream: _assignments,
          builder: (context, a) {
            if (a.hasError) debugPrint('assignments stream: ${a.error}');
            final list = a.data ?? const <Assignment>[];
            final loading = !a.hasData && !a.hasError;
            void go(int i) => setState(() => _index = i);
            return Scaffold(
              body: FadeIndexedStack(
                index: _index,
                children: [
                  BouncerHomeScreen(
                    personnel: p,
                    assignments: list,
                    loading: loading,
                    onGoToTab: go,
                  ),
                  AssignmentsScreen(
                    personnel: p,
                    assignments: list,
                    loading: loading,
                    error: a.hasError,
                  ),
                  AvailabilityScreen(personnel: p),
                  BouncerProfileScreen(personnel: p, assignments: list),
                ],
              ),
              bottomNavigationBar: NavigationBar(
                selectedIndex: _index,
                onDestinationSelected: go,
                destinations: [
                  const NavigationDestination(
                    icon: Icon(Icons.home_outlined),
                    selectedIcon: Icon(Icons.home_rounded),
                    label: 'Home',
                  ),
                  NavigationDestination(
                    icon: Badge(
                      isLabelVisible: list.any((x) => x.isOffered),
                      child: const Icon(Icons.work_outline_rounded),
                    ),
                    selectedIcon: const Icon(Icons.work_rounded),
                    label: 'Assignments',
                  ),
                  const NavigationDestination(
                    icon: Icon(Icons.event_available_outlined),
                    selectedIcon: Icon(Icons.event_available),
                    label: 'Availability',
                  ),
                  const NavigationDestination(
                    icon: Icon(Icons.person_outline),
                    selectedIcon: Icon(Icons.person),
                    label: 'Profile',
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
