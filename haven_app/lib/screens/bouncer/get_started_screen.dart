import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/assignment.dart';
import '../../services/auth_service.dart';
import '../../services/bouncer_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'bouncer_widgets.dart';

/// First screen for a bouncer account with no personnel record yet.
class GetStartedScreen extends StatefulWidget {
  const GetStartedScreen({super.key});
  @override
  State<GetStartedScreen> createState() => _GetStartedScreenState();
}

class _GetStartedScreenState extends State<GetStartedScreen> {
  bool _busy = false;

  Future<void> _independent() async {
    final ok = await confirmDialog(
      context,
      title: 'Register independently?',
      message:
          'We\'ll create your Haven profile. You can complete it, get verified and later ask an agency to take you on.',
      confirm: 'Create profile',
      icon: Icons.badge_outlined,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    final user = context.read<Session>().user!;
    await runAction(
      context,
      () => BouncerService.instance.registerIndependent(user),
      done: 'Profile created. Let\'s complete it.',
    );
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _invite() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const _InviteCodeScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final first = context.watch<Session>().user?.name.split(' ').first ?? '';
    return Scaffold(
      body: SafeArea(
        child: AbsorbPointer(
          absorbing: _busy,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
            children: [
              FadeSlideIn(
                child: PageTitle(
                  eyebrow: first.isEmpty ? 'Welcome' : 'Welcome, $first',
                  title: 'Let\'s get you set up',
                  subtitle:
                      'Link your account to an agency that invited you, or create your own profile.',
                ),
              ),
              const SizedBox(height: 24),
              FadeSlideIn(
                index: 1,
                child: _OptionCard(
                  icon: Icons.vpn_key_outlined,
                  title: 'I have an invite code',
                  body:
                      'Your agency added you to Haven and gave you an 8-character code.',
                  onTap: _invite,
                ),
              ),
              const SizedBox(height: 12),
              FadeSlideIn(
                index: 2,
                child: _OptionCard(
                  icon: Icons.person_add_alt_outlined,
                  title: 'Register independently',
                  body:
                      'Create your profile now, get verified, then request to join an agency with its agency code.',
                  onTap: _independent,
                  loading: _busy,
                ),
              ),
              const SizedBox(height: 32),
              Center(
                child: TextButton(
                  onPressed: () => context.read<AuthService>().signOut(),
                  child: const Text('Sign out'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OptionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;
  final VoidCallback onTap;
  final bool loading;
  const _OptionCard({
    required this.icon,
    required this.title,
    required this.body,
    required this.onTap,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Surface(
      onTap: onTap,
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          IconBadge(icon, size: 48),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(body, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          loading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.chevron_right, color: HavenColors.faint),
        ],
      ),
    );
  }
}

class _InviteCodeScreen extends StatefulWidget {
  const _InviteCodeScreen();
  @override
  State<_InviteCodeScreen> createState() => _InviteCodeScreenState();
}

class _InviteCodeScreenState extends State<_InviteCodeScreen> {
  final _code = TextEditingController();
  PersonnelInvite? _invite;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  static const _hint = 'Ask your agency for a new code.';

  Future<void> _lookup() async {
    final code = _code.text.trim().toUpperCase();
    if (code.length != 8) {
      setState(() => _error = 'Invite codes have 8 characters.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _invite = null;
    });
    try {
      final inv = await BouncerService.instance.lookupInvite(code);
      if (!mounted) return;
      setState(() {
        if (inv == null) {
          _error =
              'We couldn\'t find that code. Check it and try again. $_hint';
        } else if (inv.usedBy != null) {
          _error = 'This code has already been used. $_hint';
        } else {
          _invite = inv;
        }
      });
    } catch (e) {
      debugPrint('lookupInvite: $e');
      if (mounted) setState(() => _error = bouncerError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _redeem() async {
    final inv = _invite!;
    setState(() => _busy = true);
    final uid = context.read<Session>().user!.uid;
    final ok = await runAction(
      context,
      () => BouncerService.instance.redeemInvite(uid, inv),
      done: 'You\'re linked to ${inv.agencyName}.',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      Navigator.of(context).popUntil((r) => r.isFirst);
    } else {
      setState(
        () => _error =
            'We couldn\'t link this code. It may have been used or revoked. $_hint',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final inv = _invite;
    return Scaffold(
      appBar: AppBar(title: const Text('Invite code')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          const PageTitle(
            title: 'Enter your invite code',
            subtitle: 'You\'ll find it in the message from your agency.',
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _code,
            textCapitalization: TextCapitalization.characters,
            maxLength: 8,
            onChanged: (_) {
              if (_invite != null || _error != null) {
                setState(() {
                  _invite = null;
                  _error = null;
                });
              }
            },
            onSubmitted: (_) => _lookup(),
            decoration: const InputDecoration(
              labelText: 'Invite code',
              hintText: 'e.g. K7Q2M9XA',
              prefixIcon: Icon(Icons.vpn_key_outlined),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            SoftBanner(
              icon: Icons.error_outline,
              color: HavenColors.declined,
              text: _error!,
            ),
          ],
          const SizedBox(height: 16),
          if (inv == null)
            PrimaryButton(
              label: 'Check code',
              loading: _busy,
              onPressed: _lookup,
            )
          else ...[
            Surface(
              child: Column(
                children: [
                  InfoTile(
                    icon: Icons.business_outlined,
                    label: 'Agency',
                    value: inv.agencyName.isEmpty
                        ? 'Your agency'
                        : inv.agencyName,
                  ),
                  InfoTile(
                    icon: Icons.person_outline,
                    label: 'Invited person',
                    value: inv.name,
                  ),
                  if (inv.phone.isNotEmpty)
                    InfoTile(
                      icon: Icons.phone_outlined,
                      label: 'Phone',
                      value: inv.phone,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const SoftBanner(
              icon: Icons.info_outline,
              text:
                  'Only continue if this is you. Your account will be linked to this record permanently.',
            ),
            const SizedBox(height: 16),
            PrimaryButton(
              label: 'Yes, this is me',
              loading: _busy,
              onPressed: _redeem,
            ),
          ],
        ],
      ),
    );
  }
}
