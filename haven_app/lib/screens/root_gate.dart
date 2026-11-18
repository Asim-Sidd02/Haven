import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/app_user.dart';
import '../services/auth_service.dart';
import '../state/session.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'auth/welcome_screen.dart';
import 'customer/customer_shell.dart';

/// Routes the user to the right module based on auth state and role.
class RootGate extends StatelessWidget {
  const RootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();

    switch (session.state) {
      case SessionState.loading:
        return const _Splash();
      case SessionState.signedOut:
        return const WelcomeScreen();
      case SessionState.signedIn:
        final user = session.user;
        if (user == null) {
          return const _Notice(
            icon: Icons.hourglass_top_rounded,
            title: 'Setting up your space',
            message: 'Just a moment while we prepare your account.',
            showSpinner: true,
          );
        }
        if (!user.isActive) {
          return const _Notice(
            icon: Icons.pause_circle_outline,
            title: 'Your account is paused',
            message:
                'Our team has temporarily paused this account. If you think this is a mistake, please reach out to support — we\'re happy to help.',
          );
        }
        return switch (user.role) {
          UserRole.customer => const CustomerShell(),
          UserRole.agency || UserRole.admin => const _Notice(
            icon: Icons.desktop_windows_outlined,
            title: 'Use the web dashboard',
            message:
                'Agency and admin accounts use the Haven web dashboard. This app is for booking security — sign out here and head to the dashboard to manage your work.',
          ),
        };
    }
  }
}

class _Splash extends StatelessWidget {
  const _Splash();
  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: HavenLogo(size: 72)));
}

class _Notice extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final bool showSpinner;
  const _Notice({
    required this.icon,
    required this.title,
    required this.message,
    this.showSpinner = false,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Expanded(
                child: EmptyState(icon: icon, title: title, message: message),
              ),
              if (showSpinner)
                const Padding(
                  padding: EdgeInsets.only(bottom: 24),
                  child: CircularProgressIndicator(color: HavenColors.sage),
                ),
              OutlinedButton(
                onPressed: () => context.read<AuthService>().signOut(),
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
