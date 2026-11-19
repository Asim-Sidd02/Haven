import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../services/storage_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'bouncer_widgets.dart';
import 'documents_screen.dart';

const _stepTitles = [
  'Personal',
  'Professional',
  'Physical',
  'Documents',
  'Review',
];
const _genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
const _declaration =
    'I declare that the information and documents I have provided are true and my own. '
    'I consent to Haven and my agency verifying them, including background checks, '
    'and to my location being recorded when I check in or out of a shift.';

/// Profile / enrolment wizard. Every "Save" stores a draft.
class EnrolmentScreen extends StatefulWidget {
  final String personnelId;
  const EnrolmentScreen({super.key, required this.personnelId});
  @override
  State<EnrolmentScreen> createState() => _EnrolmentScreenState();
}

class _EnrolmentScreenState extends State<EnrolmentScreen> {
  late final Stream<Personnel?> _stream = BouncerService.instance
      .personnelStream(widget.personnelId);
  late final Stream<List<PersonnelDocument>> _docs = BouncerService.instance
      .documents(widget.personnelId);

  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _experience = TextEditingController();
  final _height = TextEditingController();
  String _dob = '';
  String _gender = '';
  List<String> _skills = [];
  List<String> _languages = [];
  List<String> _certs = [];
  bool _loaded = false;
  int _step = 0;
  bool _busy = false;
  bool _consent = false;

  @override
  void dispose() {
    for (final c in [_name, _phone, _address, _experience, _height]) {
      c.dispose();
    }
    super.dispose();
  }

  void _load(Personnel p) {
    if (_loaded) return;
    _loaded = true;
    _name.text = p.name;
    _phone.text = p.phone;
    _address.text = p.address;
    _experience.text = p.experienceYears == 0 ? '' : '${p.experienceYears}';
    _height.text = p.heightCm == 0 ? '' : '${p.heightCm}';
    _dob = p.dob;
    _gender = p.gender;
    _skills = [...p.skills];
    _languages = [...p.languages];
    _certs = [...p.certifications];
  }

  Map<String, dynamic> _stepData(int step) => switch (step) {
    0 => {
      'name': _name.text.trim(),
      'phone': _phone.text.trim(),
      'address': _address.text.trim(),
      'dob': _dob,
      'gender': _gender,
    },
    1 => {
      'experienceYears': int.tryParse(_experience.text.trim()) ?? 0,
      'skills': _skills,
      'languages': _languages,
      'certifications': _certs,
    },
    2 => {'heightCm': int.tryParse(_height.text.trim()) ?? 0},
    _ => {},
  };

  Future<bool> _save(Personnel p, {bool quiet = false}) async {
    final data = _stepData(_step);
    if (data.isEmpty) return true;
    setState(() => _busy = true);
    final ok = await runAction(
      context,
      () => BouncerService.instance.saveProfile(p, data),
      done: quiet ? null : 'Saved',
    );
    if (mounted) setState(() => _busy = false);
    return ok;
  }

  Future<void> _next(Personnel p) async {
    if (await _save(p, quiet: true) &&
        mounted &&
        _step < _stepTitles.length - 1) {
      setState(() => _step++);
    }
  }

  Future<void> _photo(Personnel p) async {
    setState(() => _busy = true);
    await runAction(context, () async {
      final url = await StorageService().pickAndUploadImage(
        'haven/personnel/${p.id}',
      );
      if (url == null) return;
      await BouncerService.instance.saveProfile(p, {'photoUrl': url});
    }, done: null);
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_dob) ?? DateTime(now.year - 25),
      firstDate: DateTime(now.year - 80),
      lastDate: DateTime(now.year - 18, now.month, now.day),
      helpText: 'Date of birth',
    );
    if (d != null) setState(() => _dob = DateFormat('yyyy-MM-dd').format(d));
  }

  List<String> _missing(Personnel p, List<PersonnelDocument> docs) => [
    if (p.name.trim().isEmpty) 'Full name',
    if (p.dob.isEmpty) 'Date of birth',
    if (p.photoUrl.isEmpty) 'Profile photo',
    if (p.phone.trim().isEmpty) 'Phone number',
    if (!docs.any((d) => d.type == 'identity' && d.status != 'rejected'))
      'Identity document',
  ];

  Future<void> _submit(Personnel p) async {
    setState(() => _busy = true);
    final ok = await runAction(
      context,
      () => BouncerService.instance.submitForReview(p),
      done: 'Submitted for verification. We\'ll let you know.',
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Personnel?>(
      stream: _stream,
      builder: (context, snap) {
        if (snap.hasError || (snap.hasData && snap.data == null)) {
          if (snap.hasError) debugPrint('enrolment: ${snap.error}');
          return Scaffold(
            appBar: AppBar(),
            body: const EmptyState(
              icon: Icons.cloud_off_outlined,
              title: 'We couldn\'t load your profile',
              message: 'Please check your connection and try again.',
            ),
          );
        }
        if (!snap.hasData) {
          return Scaffold(appBar: AppBar(), body: const SkeletonList());
        }
        final p = snap.data!;
        _load(p);
        final locked = p.identityLocked;
        return Scaffold(
          appBar: AppBar(title: const Text('My profile')),
          body: AbsorbPointer(
            absorbing: _busy,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                  child: StatusTimeline(
                    current: _step,
                    color: HavenColors.sage,
                    steps: _stepTitles,
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                    children: [
                      if (locked)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 14),
                          child: SoftBanner(
                            icon: Icons.lock_outline,
                            text:
                                'You\'re verified, so your identity details are locked. Contact your agency to change them.',
                          ),
                        ),
                      if (p.verificationStatus == VerificationStatus.pending)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 14),
                          child: SoftBanner(
                            icon: Icons.hourglass_top_rounded,
                            text:
                                'Your profile is under review. Changes you save now will be seen by the reviewer.',
                          ),
                        ),
                      ..._stepBody(p, locked),
                    ],
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: Row(
                      children: [
                        if (_step > 0)
                          Expanded(
                            child: SecondaryButton(
                              label: 'Back',
                              onPressed: () => setState(() => _step--),
                            ),
                          ),
                        if (_step > 0) const SizedBox(width: 10),
                        if (_step < _stepTitles.length - 1)
                          Expanded(
                            child: PrimaryButton(
                              label: _stepData(_step).isEmpty
                                  ? 'Next'
                                  : 'Save & continue',
                              loading: _busy,
                              onPressed: () => _next(p),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  List<Widget> _stepBody(Personnel p, bool locked) {
    const gap = SizedBox(height: 14);
    switch (_step) {
      case 0:
        return [
          Center(
            child: Column(
              children: [
                Avatar(
                  url: p.photoUrl.isEmpty ? null : p.photoUrl,
                  name: p.name,
                  radius: 46,
                ),
                if (!locked)
                  TextButton.icon(
                    onPressed: () => _photo(p),
                    icon: const Icon(Icons.photo_camera_outlined),
                    label: Text(
                      p.photoUrl.isEmpty ? 'Add photo *' : 'Change photo',
                    ),
                  ),
              ],
            ),
          ),
          gap,
          TextField(
            controller: _name,
            enabled: !locked,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Full name *',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          gap,
          InkWell(
            onTap: locked ? null : _pickDob,
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: 'Date of birth *',
                prefixIcon: const Icon(Icons.cake_outlined),
                enabled: !locked,
              ),
              child: Text(_dob.isEmpty ? 'Select' : _dob),
            ),
          ),
          gap,
          DropdownButtonFormField<String>(
            initialValue: _genders.contains(_gender) ? _gender : null,
            decoration: const InputDecoration(
              labelText: 'Gender',
              prefixIcon: Icon(Icons.wc_outlined),
            ),
            items: [
              for (final g in _genders)
                DropdownMenuItem(value: g, child: Text(g)),
            ],
            onChanged: locked ? null : (v) => setState(() => _gender = v ?? ''),
          ),
          gap,
          TextField(
            controller: _phone,
            enabled: !locked,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Phone *',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
          ),
          gap,
          TextField(
            controller: _address,
            enabled: !locked,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Address',
              prefixIcon: Icon(Icons.home_outlined),
            ),
          ),
        ];
      case 1:
        return [
          TextField(
            controller: _experience,
            enabled: !locked,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Years of experience',
              prefixIcon: Icon(Icons.timeline_outlined),
            ),
          ),
          gap,
          TagInput(
            label: 'Skills',
            hint: 'e.g. Crowd control, First aid',
            values: _skills,
            onChanged: (v) => setState(() => _skills = v),
          ),
          gap,
          TagInput(
            label: 'Languages',
            hint: 'e.g. English, Hindi',
            values: _languages,
            onChanged: (v) => setState(() => _languages = v),
          ),
          gap,
          TagInput(
            label: 'Certifications / training',
            hint: 'e.g. PSARA training',
            values: _certs,
            onChanged: locked ? null : (v) => setState(() => _certs = v),
          ),
        ];
      case 2:
        return [
          TextField(
            controller: _height,
            enabled: !locked,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Height (cm)',
              prefixIcon: Icon(Icons.height_rounded),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Some clients ask for a minimum height for door and VIP work.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ];
      case 3:
        return [DocumentsSection(personnel: p)];
      default:
        return [
          StreamBuilder<List<PersonnelDocument>>(
            stream: _docs,
            builder: (context, s) {
              if (s.hasError) debugPrint('docs: ${s.error}');
              final missing = _missing(p, s.data ?? const []);
              final canSubmit =
                  p.canSubmit && missing.isEmpty && _consent && s.hasData;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Surface(
                    child: Column(
                      children: [
                        InfoTile(
                          icon: Icons.person_outline,
                          label: 'Name',
                          value: p.name.isEmpty ? '—' : p.name,
                        ),
                        InfoTile(
                          icon: Icons.cake_outlined,
                          label: 'Date of birth',
                          value: p.dob.isEmpty ? '—' : p.dob,
                        ),
                        InfoTile(
                          icon: Icons.phone_outlined,
                          label: 'Phone',
                          value: p.phone.isEmpty ? '—' : p.phone,
                        ),
                        InfoTile(
                          icon: Icons.timeline_outlined,
                          label: 'Experience',
                          value: '${p.experienceYears} years',
                        ),
                        InfoTile(
                          icon: Icons.star_outline,
                          label: 'Skills',
                          value: p.skills.isEmpty ? '—' : p.skills.join(', '),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (!p.canSubmit)
                    SoftBanner(
                      icon: Icons.info_outline,
                      text:
                          'Status: ${VerificationStatus.label(p.verificationStatus)}. There\'s nothing to submit right now.',
                    )
                  else ...[
                    if (missing.isNotEmpty)
                      SoftBanner(
                        icon: Icons.error_outline,
                        color: HavenColors.declined,
                        text: 'Still needed: ${missing.join(', ')}.',
                      ),
                    const SizedBox(height: 10),
                    CheckboxListTile(
                      value: _consent,
                      onChanged: (v) => setState(() => _consent = v ?? false),
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        _declaration,
                        style: TextStyle(fontSize: 13.5, height: 1.4),
                      ),
                    ),
                    const SizedBox(height: 10),
                    PrimaryButton(
                      label: p.verificationStatus == VerificationStatus.draft
                          ? 'Submit for verification'
                          : 'Resubmit for verification',
                      loading: _busy,
                      onPressed: canSubmit ? () => _submit(p) : null,
                    ),
                  ],
                ],
              );
            },
          ),
        ];
    }
  }
}
