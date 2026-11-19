import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/agency.dart';
import '../../models/booking.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';

class BookingFormScreen extends StatefulWidget {
  final Agency agency;
  final String? initialService;
  const BookingFormScreen({
    super.key,
    required this.agency,
    this.initialService,
  });

  @override
  State<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends State<BookingFormScreen> {
  final _form = GlobalKey<FormState>();
  final _location = TextEditingController();
  final _guests = TextEditingController();
  final _requirements = TextEditingController();
  late AgencyService _service;
  String _eventType = eventTypes.first;
  DateTime? _date;
  TimeOfDay? _time;
  int _hours = 4;
  int _people = 2;
  bool _busy = false;
  bool _triedSubmit = false;

  @override
  void initState() {
    super.initState();
    final services = widget.agency.enabledServices;
    _service = services.firstWhere(
      (s) => s.key == widget.initialService,
      orElse: () => services.first,
    );
    _hours = _hours < _service.minHours ? _service.minHours : _hours;
  }

  @override
  void dispose() {
    _location.dispose();
    _guests.dispose();
    _requirements.dispose();
    super.dispose();
  }

  DateTime? get _start => (_date == null || _time == null)
      ? null
      : DateTime(
          _date!.year,
          _date!.month,
          _date!.day,
          _time!.hour,
          _time!.minute,
        );

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _date ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (d != null) setState(() => _date = d);
  }

  Future<void> _pickTime() async {
    final t = await showTimePicker(
      context: context,
      initialTime: _time ?? const TimeOfDay(hour: 20, minute: 0),
    );
    if (t != null) setState(() => _time = t);
  }

  Future<void> _submit(PriceBreakdown price) async {
    setState(() => _triedSubmit = true);
    final valid = _form.currentState!.validate();
    final start = _start;
    if (!valid || start == null) {
      if (start == null) showMessage(context, 'Please choose a date and time.');
      return;
    }
    if (start.isBefore(DateTime.now())) {
      showMessage(context, 'That time has already passed — pick a later one.');
      return;
    }
    final session = context.read<Session>();
    final user = session.user!;
    final ok = await confirmDialog(
      context,
      title: 'Send booking request?',
      message:
          '${widget.agency.name} will review your request for $_people × ${_service.label}. '
          'Estimated total ${session.money(price.total)}. You can cancel any time before the event.',
      confirm: 'Send request',
      icon: Icons.send_outlined,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      await DbService.instance.createBooking(
        Booking(
          customerId: user.uid,
          customerName: user.name,
          customerPhone: user.phone,
          agencyId: widget.agency.id,
          agencyName: widget.agency.name,
          service: _service.key,
          serviceLabel: _service.label,
          eventType: _eventType,
          eventDate: start,
          hours: _hours,
          location: _location.text.trim(),
          guests: int.tryParse(_guests.text.trim()) ?? 0,
          personnelCount: _people,
          requirements: _requirements.text.trim(),
          hourlyRate: _service.hourlyRate,
          subtotal: price.subtotal,
          platformFee: price.platformFee,
          tax: price.tax,
          totalAmount: price.total,
        ),
      );
      if (!mounted) return;
      Navigator.pop(context);
      showMessage(
        context,
        'Request sent. We\'ll let you know as soon as ${widget.agency.name} replies.',
      );
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final services = widget.agency.enabledServices;
    final price = PriceBreakdown.compute(
      hourlyRate: _service.hourlyRate,
      hours: _hours,
      personnelCount: _people,
      commissionPercent: session.commissionPercent,
      taxPercent: session.taxPercent,
    );
    final start = _start;
    return Scaffold(
      appBar: AppBar(title: Text('Book ${widget.agency.name}')),
      body: Form(
        key: _form,
        autovalidateMode: _triedSubmit
            ? AutovalidateMode.onUserInteraction
            : AutovalidateMode.disabled,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            const SectionTitle('Service'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final s in services)
                  ChoiceChip(
                    label: Text(s.label),
                    selected: s.key == _service.key,
                    onSelected: (_) => setState(() {
                      _service = s;
                      if (_hours < s.minHours) _hours = s.minHours;
                    }),
                  ),
              ],
            ),
            if (_service.requirements.isNotEmpty) ...[
              const SizedBox(height: 10),
              SoftBanner(icon: Icons.info_outline, text: _service.requirements),
            ],
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue: _eventType,
              decoration: const InputDecoration(
                labelText: 'Event type',
                prefixIcon: Icon(Icons.celebration_outlined),
              ),
              items: [
                for (final e in eventTypes)
                  DropdownMenuItem(value: e, child: Text(e)),
              ],
              onChanged: (v) => setState(() => _eventType = v ?? _eventType),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _PickerField(
                    icon: Icons.calendar_today_outlined,
                    label: 'Date',
                    value: _date == null
                        ? null
                        : DateFormat('EEE d MMM').format(_date!),
                    error: _triedSubmit && _date == null,
                    onTap: _pickDate,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _PickerField(
                    icon: Icons.schedule_outlined,
                    label: 'Start time',
                    value: _time?.format(context),
                    error: _triedSubmit && _time == null,
                    onTap: _pickTime,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _Stepper(
              label: 'Hours per shift',
              hint: 'Minimum ${_service.minHours}',
              value: _hours,
              min: _service.minHours,
              max: 24,
              onChanged: (v) => setState(() => _hours = v),
            ),
            const SizedBox(height: 10),
            _Stepper(
              label: 'Personnel needed',
              value: _people,
              min: 1,
              max: 50,
              onChanged: (v) => setState(() => _people = v),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _guests,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Expected guests',
                prefixIcon: Icon(Icons.groups_outlined),
              ),
              validator: (v) {
                final t = v?.trim() ?? '';
                if (t.isEmpty) return null;
                final n = int.tryParse(t);
                return (n == null || n < 0) ? 'Enter a whole number' : null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _location,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Location',
                hintText: 'Venue name and address',
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
              validator: (v) => (v == null || v.trim().length < 4)
                  ? 'Please tell us where the team should go'
                  : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _requirements,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Requirements (optional)',
                hintText: 'Dress code, languages, anything we should know',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 24),
            Surface(
              child: Column(
                children: [
                  _PriceRow(
                    '${session.money(_service.hourlyRate)} × $_hours h × $_people',
                    session.money(price.subtotal),
                  ),
                  _PriceRow(
                    'Platform fee (${_pct(session.commissionPercent)}%)',
                    session.money(price.platformFee),
                  ),
                  _PriceRow(
                    'Tax (${_pct(session.taxPercent)}%)',
                    session.money(price.tax),
                  ),
                  const HairlineDivider(),
                  _PriceRow('Total', session.money(price.total), bold: true),
                  if (start != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Starts ${DateFormat('EEE d MMM · h:mm a').format(start)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Nothing is charged in the app — you pay the agency directly. Your booking is confirmed only once the agency accepts and every assigned team member confirms.',
              style: TextStyle(color: HavenColors.muted, fontSize: 12.5),
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Send request',
              icon: Icons.send_outlined,
              loading: _busy,
              onPressed: () => _submit(price),
            ),
          ],
        ),
      ),
    );
  }

  static String _pct(double v) =>
      v % 1 == 0 ? v.toInt().toString() : v.toStringAsFixed(1);
}

class _PickerField extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;
  final bool error;
  final VoidCallback onTap;
  const _PickerField({
    required this.icon,
    required this.label,
    required this.value,
    required this.error,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          errorText: error ? 'Required' : null,
        ),
        child: Text(
          value ?? 'Choose',
          style: TextStyle(
            color: value == null ? HavenColors.faint : HavenColors.ink,
          ),
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  final String label;
  final String? hint;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;
  const _Stepper({
    required this.label,
    this.hint,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              if (hint != null)
                Text(hint!, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        IconButton.outlined(
          tooltip: 'Less',
          onPressed: value > min ? () => onChanged(value - 1) : null,
          icon: const Icon(Icons.remove_rounded),
        ),
        SizedBox(
          width: 44,
          child: AnimatedSwitcher(
            duration: Motion.fast,
            child: Text(
              '$value',
              key: ValueKey(value),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        IconButton.outlined(
          tooltip: 'More',
          onPressed: value < max ? () => onChanged(value + 1) : null,
          icon: const Icon(Icons.add_rounded),
        ),
      ],
    );
  }
}

class _PriceRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _PriceRow(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
      fontSize: bold ? 16 : 14,
      color: bold ? HavenColors.ink : HavenColors.muted,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}
