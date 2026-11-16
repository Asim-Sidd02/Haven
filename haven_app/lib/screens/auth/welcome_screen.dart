import 'package:flutter/material.dart';

import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'login_screen.dart';
import 'signup_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      body: Column(
        children: [
          Expanded(
            child: HeroPanel(
              padding: EdgeInsets.zero,
              child: SafeArea(
                bottom: false,
                child: Stack(
                  children: [
                    // Soft decorative rings
                    Positioned(
                      right: -90,
                      top: -40,
                      child: _Ring(size: 280, opacity: 0.06),
                    ),
                    Positioned(
                      left: -120,
                      bottom: -20,
                      child: _Ring(size: 320, opacity: 0.05),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(28, 40, 28, 28),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const FadeSlideIn(
                            child: HavenLogo(
                              size: 64,
                              showName: false,
                              onDark: true,
                            ),
                          ),
                          const Spacer(),
                          FadeSlideIn(
                            delay: const Duration(milliseconds: 150),
                            child: Text(
                              'Haven',
                              style: t.displaySmall?.copyWith(
                                color: Colors.white,
                                fontSize: 44,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          FadeSlideIn(
                            delay: const Duration(milliseconds: 260),
                            child: Text(
                              'Calm, trusted security for the moments that matter — from weddings to late nights out.',
                              style: t.bodyLarge?.copyWith(
                                color: Colors.white.withValues(alpha: 0.82),
                                height: 1.55,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 26, 24, 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const FadeSlideIn(
                      index: 4,
                      child: _Point(
                        icon: Icons.verified_user_outlined,
                        title: 'Reviewed professionals',
                        text:
                            'Every profile is checked by our team before it goes live.',
                      ),
                    ),
                    const FadeSlideIn(
                      index: 5,
                      child: _Point(
                        icon: Icons.star_outline_rounded,
                        title: 'Honest ratings',
                        text:
                            'Reviews come only from real, completed bookings.',
                      ),
                    ),
                    const FadeSlideIn(
                      index: 6,
                      child: _Point(
                        icon: Icons.event_available_outlined,
                        title: 'Book in minutes',
                        text:
                            'Send a request and follow every step in the app.',
                      ),
                    ),
                    const SizedBox(height: 22),
                    FadeSlideIn(
                      index: 7,
                      child: Pressable(
                        child: PrimaryButton(
                          label: 'Create an account',
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const SignupScreen(),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    FadeSlideIn(
                      index: 8,
                      child: Pressable(
                        child: SecondaryButton(
                          label: 'I already have an account',
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const LoginScreen(),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Ring extends StatelessWidget {
  final double size;
  final double opacity;
  const _Ring({required this.size, required this.opacity});
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(
        color: Colors.white.withValues(alpha: opacity),
        width: 40,
      ),
    ),
  );
}

class _Point extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  const _Point({required this.icon, required this.title, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBadge(icon, size: 40),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 2),
                Text(text, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
