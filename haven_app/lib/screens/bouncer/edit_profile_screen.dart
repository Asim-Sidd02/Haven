import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/bouncer.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../services/storage_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

const presetSkills = [
  'Crowd control',
  'Door supervision',
  'VIP protection',
  'Event security',
  'First aid',
  'Conflict de-escalation',
  'CCTV monitoring',
  'Licensed / certified',
];

/// Where bouncers post and maintain their public profile.
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});
  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _bio = TextEditingController();
  final _city = TextEditingController();
  final _experience = TextEditingController();
  final _rate = TextEditingController();
  final _height = TextEditingController();
  final _languages = TextEditingController();
  final _customSkill = TextEditingController();
  Set<String> _skills = {};
  String? _photoUrl;
  bool _available = true;
  Bouncer? _loaded;
  bool _busy = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = context.read<Session>().user!.uid;
    final b = await DbService.instance.bouncerStream(uid).first;
    if (!mounted || b == null) return;
    setState(() {
      _loaded = b;
      _name.text = b.name;
      _bio.text = b.bio;
      _city.text = b.city;
      _experience.text = b.experienceYears == 0 ? '' : '${b.experienceYears}';
      _rate.text = b.hourlyRate == 0
          ? ''
          : (b.hourlyRate % 1 == 0
                ? '${b.hourlyRate.toInt()}'
                : '${b.hourlyRate}');
      _height.text = b.heightCm == 0 ? '' : '${b.heightCm}';
      _languages.text = b.languages.join(', ');
      _skills = b.skills.toSet();
      _photoUrl = b.photoUrl;
      _available = b.available;
    });
  }

  @override
  void dispose() {
    for (final c in [
      _name,
      _bio,
      _city,
      _experience,
      _rate,
      _height,
      _languages,
      _customSkill,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    setState(() => _uploading = true);
    try {
      final url = await StorageService().pickAndUploadAvatar(
        context.read<Session>().user!.uid,
      );
      if (url != null) setState(() => _photoUrl = url);
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final base = _loaded!;
    setState(() => _busy = true);
    try {
      await DbService.instance.saveBouncerProfile(
        Bouncer(
          uid: base.uid,
          name: _name.text.trim(),
          photoUrl: _photoUrl,
          bio: _bio.text.trim(),
          city: _city.text.trim(),
          experienceYears: int.tryParse(_experience.text) ?? 0,
          hourlyRate: double.tryParse(_rate.text) ?? 0,
          heightCm: int.tryParse(_height.text) ?? 0,
          skills: _skills.toList(),
          languages: _languages.text
              .split(',')
              .map((s) => s.trim())
              .where((s) => s.isNotEmpty)
              .toList(),
          available: _available,
        ),
      );
      if (mounted) showMessage(context, 'Profile saved');
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loaded == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('My profile')),
        body: const Center(
          child: CircularProgressIndicator(color: HavenColors.sage),
        ),
      );
    }
    final allSkills = {...presetSkills, ..._skills}.toList();
    return Scaffold(
      appBar: AppBar(title: const Text('My profile')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'This is what customers see. Be warm and honest — trust starts here.',
              style: TextStyle(color: HavenColors.muted),
            ),
            const SizedBox(height: 18),
            Center(
              child: GestureDetector(
                onTap: _uploading ? null : _pickPhoto,
                child: Stack(
                  children: [
                    Avatar(url: _photoUrl, name: _name.text, radius: 50),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: CircleAvatar(
                        radius: 16,
                        backgroundColor: HavenColors.sage,
                        child: _uploading
                            ? const SizedBox(
                                width: 14,
                                height: 14,
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
                  ],
                ),
              ),
            ),
            const SizedBox(height: 6),
            const Center(
              child: Text(
                'A clear, friendly photo helps',
                style: TextStyle(color: HavenColors.muted, fontSize: 12),
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Display name'),
              validator: (v) =>
                  (v == null || v.trim().length < 2) ? 'Enter your name' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _bio,
              maxLines: 5,
              maxLength: 600,
              decoration: const InputDecoration(
                labelText: 'About you',
                hintText:
                    'Your background, the events you\'ve worked, how you keep guests calm and safe…',
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().length < 30)
                  ? 'Please write at least a few sentences (30+ characters)'
                  : null,
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _city,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'City',
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Enter your city' : null,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _rate,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: InputDecoration(
                      labelText: 'Hourly rate',
                      suffixText: context.watch<Session>().currency,
                    ),
                    validator: (v) => ((double.tryParse(v ?? '') ?? 0) <= 0)
                        ? 'Enter a rate'
                        : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _experience,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Experience',
                      suffixText: 'yrs',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _height,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Height',
                      suffixText: 'cm',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _languages,
                    decoration: const InputDecoration(
                      labelText: 'Languages',
                      hintText: 'English, Urdu',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Skills',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final s in allSkills)
                  FilterChip(
                    label: Text(s),
                    selected: _skills.contains(s),
                    onSelected: (v) =>
                        setState(() => v ? _skills.add(s) : _skills.remove(s)),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _customSkill,
                    decoration: const InputDecoration(
                      hintText: 'Add another skill',
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle, color: HavenColors.sage),
                  onPressed: () {
                    final s = _customSkill.text.trim();
                    if (s.isEmpty) return;
                    setState(() {
                      _skills.add(s);
                      _customSkill.clear();
                    });
                  },
                ),
              ],
            ),
            const SizedBox(height: 14),
            Card(
              child: SwitchListTile(
                activeThumbColor: HavenColors.sage,
                title: const Text('Taking bookings'),
                value: _available,
                onChanged: (v) => setState(() => _available = v),
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: _busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Save profile'),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
