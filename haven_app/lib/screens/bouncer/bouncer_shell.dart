import 'package:flutter/material.dart';

import '../../widgets/ui.dart';

import '../shared/profile_screen.dart';
import 'bouncer_home_screen.dart';
import 'bouncer_requests_screen.dart';
import 'edit_profile_screen.dart';

class BouncerShell extends StatefulWidget {
  const BouncerShell({super.key});
  @override
  State<BouncerShell> createState() => _BouncerShellState();
}

class _BouncerShellState extends State<BouncerShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FadeIndexedStack(
        index: _index,
        children: [
          BouncerHomeScreen(onOpenTab: (i) => setState(() => _index = i)),
          const BouncerRequestsScreen(),
          const EditProfileScreen(),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.inbox_outlined),
            selectedIcon: Icon(Icons.inbox_rounded),
            label: 'Requests',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge_outlined),
            selectedIcon: Icon(Icons.badge),
            label: 'My profile',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
