import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../widgets/ui.dart';
import 'bouncer_widgets.dart';

class AvailabilityScreen extends StatefulWidget {
  final Personnel personnel;
  const AvailabilityScreen({super.key, required this.personnel});
  @override
  State<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends State<AvailabilityScreen> {
  late String _availability;
  String? _leaveUntil;
  late List<String> _days;
  late List<String> _shifts;
  late List<String> _areas;
  bool _dirty = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _reset();
  }

  @override
  void didUpdateWidget(covariant AvailabilityScreen old) {
    super.didUpdateWidget(old);
    if (!_dirty) _reset();
  }

  void _reset() {
    final p = widget.personnel;
    // 'assigned' is set by the agency; show it as available for editing.
    _availability = p.availability == 'assigned' ? 'available' : p.availability;
    _leaveUntil = p.leaveUntil;
    _days = [...p.workDays];
    _shifts = [...p.shifts];
    _areas = [...p.preferredAreas];
  }

  void _edit(VoidCallback f) => setState(() {
    f();
    _dirty = true;
  });

  Future<void> _pickLeave() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate:
          DateTime.tryParse(_leaveUntil ?? '') ??
          now.add(const Duration(days: 7)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      helpText: 'On leave until',
    );
    if (d != null) {
      _edit(() => _leaveUntil = DateFormat('yyyy-MM-dd').format(d));
    }
  }

  Future<void> _save() async {
    if (_availability == 'on_leave' && (_leaveUntil ?? '').isEmpty) {
      await _pickLeave();
      if ((_leaveUntil ?? '').isEmpty) return;
    }
    if (!mounted) return;
    setState(() => _busy = true);
    final ok = await runAction(
      context,
      () => BouncerService.instance.saveAvailability(
        widget.personnel,
        availability:
            widget.personnel.availability == 'assigned' &&
                _availability == 'available'
            ? 'assigned'
            : _availability,
        leaveUntil: _leaveUntil,
        workDays: _days,
        shifts: _shifts,
        preferredAreas: _areas,
      ),
      done: 'Availability saved',
    );
    if (mounted) {
      setState(() {
        _busy = false;
        if (ok) _dirty = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            const PageTitle(
              title: 'Availability',
              subtitle: 'Let your agency know when and where you can work.',
            ),
            const SizedBox(height: 20),
            const SectionTitle('Status'),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'available', label: Text('Available')),
                ButtonSegment(value: 'unavailable', label: Text('Unavailable')),
                ButtonSegment(value: 'on_leave', label: Text('On leave')),
              ],
              selected: {_availability},
              onSelectionChanged: (s) => _edit(() => _availability = s.first),
            ),
            if (_availability == 'on_leave') ...[
              const SizedBox(height: 10),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.event_outlined),
                title: Text(
                  _leaveUntil == null
                      ? 'Choose return date'
                      : 'On leave until $_leaveUntil',
                ),
                trailing: const Icon(Icons.edit_calendar_outlined),
                onTap: _pickLeave,
              ),
            ],
            const SizedBox(height: 22),
            const SectionTitle('Work days'),
            ChoiceChips(
              options: weekDays,
              selected: _days,
              onChanged: (v) => _edit(() => _days = v),
            ),
            const SizedBox(height: 22),
            const SectionTitle('Shifts'),
            ChoiceChips(
              options: shiftLabels,
              selected: _shifts,
              onChanged: (v) => _edit(() => _shifts = v),
            ),
            const SizedBox(height: 22),
            const SectionTitle('Preferred areas'),
            TagInput(
              label: 'Add an area',
              hint: 'e.g. Bandra, Andheri',
              values: _areas,
              onChanged: (v) => _edit(() => _areas = v),
            ),
            const SizedBox(height: 28),
            PrimaryButton(
              label: 'Save availability',
              loading: _busy,
              onPressed: _dirty ? _save : null,
            ),
          ],
        ),
      ),
    );
  }
}
