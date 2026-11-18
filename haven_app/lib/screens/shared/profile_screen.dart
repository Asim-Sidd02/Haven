import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/app_user.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../services/storage_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

/// The client's account screen.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _uploading = false;

  Future<void> _changePhoto(AppUser user) async {
    setState(() => _uploading = true);
    try {
      final url = await StorageService().pickAndUploadAvatar(user.uid);
      if (url == null) return;
      await DbService.instance.updateUser(user.uid, photoUrl: url);
      if (mounted) showMessage(context, 'Photo updated');
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _edit(AppUser user) async {
    final name = TextEditingController(text: user.name);
    final phone = TextEditingController(text: user.phone);
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: HavenColors.surface,
        title: const Text('Edit details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Full name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text(
              'Save',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await DbService.instance.updateUser(
        user.uid,
        name: name.text.trim(),
        phone: phone.text.trim(),
      );
      if (mounted) showMessage(context, 'Details saved');
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final user = session.user!;
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Stack(
              children: [
                Avatar(url: user.photoUrl, name: user.name, radius: 48),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Material(
                    color: HavenColors.sage,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _uploading ? null : () => _changePhoto(user),
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: _uploading
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(
                                Icons.camera_alt_outlined,
                                size: 16,
                                color: Colors.white,
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              user.name,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ),
          Center(
            child: Text(
              'Haven member',
              style: const TextStyle(color: HavenColors.muted),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(
                    Icons.mail_outline,
                    color: HavenColors.sage,
                  ),
                  title: const Text('Email'),
                  subtitle: Text(user.email),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(
                    Icons.phone_outlined,
                    color: HavenColors.sage,
                  ),
                  title: const Text('Phone'),
                  subtitle: Text(user.phone.isEmpty ? '—' : user.phone),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(
                    Icons.edit_outlined,
                    color: HavenColors.sage,
                  ),
                  title: const Text('Edit details'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _edit(user),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (session.supportEmail.isNotEmpty ||
              session.supportPhone.isNotEmpty)
            Card(
              child: ListTile(
                leading: const Icon(
                  Icons.support_agent_rounded,
                  color: HavenColors.sage,
                ),
                title: const Text('Need help? We\'re here.'),
                subtitle: Text(
                  [
                    session.supportEmail,
                    session.supportPhone,
                  ].where((s) => s.isNotEmpty).join('  ·  '),
                ),
              ),
            ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out'),
            onPressed: () async {
              if (await confirmDialog(
                context,
                title: 'Sign out?',
                message: 'You can sign back in anytime.',
                confirm: 'Sign out',
              )) {
                if (context.mounted) {
                  await context.read<AuthService>().signOut();
                }
              }
            },
          ),
        ],
      ),
    );
  }
}
