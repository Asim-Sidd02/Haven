import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import 'login_screen.dart';
import 'signup_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(children: [
            const Spacer(flex: 2),
            const HavenLogo(size: 84),
            const SizedBox(height: 28),
            Text(
              'Calm, trusted security for the moments that matter — from weddings to late nights out.',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodyLarge
                  ?.copyWith(color: HavenColors.muted, height: 1.5),
            ),
            const Spacer(flex: 3),
            const _Point(
                icon: Icons.verified_user_outlined,
                text: 'Every professional is reviewed by our team'),
            const _Point(
                icon: Icons.favorite_border,
                text: 'Honest ratings from real events'),
            const _Point(
                icon: Icons.event_available_outlined,
                text: 'Book in minutes, track every step'),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const SignupScreen())),
              child: const Text('Create an account'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const LoginScreen())),
              child: const Text('I already have an account'),
            ),
          ]),
        ),
      ),
    );
  }
}

class _Point extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Point({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Icon(icon, color: HavenColors.sage, size: 20),
        const SizedBox(width: 12),
        Expanded(child: Text(text)),
      ]),
    );
  }
}
