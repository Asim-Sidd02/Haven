import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/booking.dart';
import '../../models/bouncer.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../state/session.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

class BookingFormScreen extends StatefulWidget {
  final Bouncer bouncer;
  const BookingFormScreen({super.key, required this.bouncer});
  @override
  State<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends State<BookingFormScreen> {
  final _form = GlobalKey<FormState>();
  final _location = TextEditingController();
  final _guests = TextEditingController(text: '50');
  final _notes = TextEditingController();
  String _eventType = eventTypes.first;
  DateTime? _date;
  TimeOfDay _time = const TimeOfDay(hour: 20, minute: 0);
  int _hours = 4;
  bool _busy = false;

  @override
  void dispose() {
    _location.dispose();
    _guests.dispose();
    _notes.dispose();
    super.dispose();
  }

  DateTime? get _start => _date == null
      ? null
      : DateTime(_date!.year, _date!.month, _date!.day, _time.hour, _time.minute);

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
    final t = await showTimePicker(context: context, initialTime: _time);
    if (t != null) setState(() => _time = t);
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (_start == null) {
      showMessage(context, 'Please choose a date for your event.');
      return;
    }
    final session = context.read<Session>();
    final user = session.user!;
    final b = widget.bouncer;
    setState(() => _busy = true);
    try {
      await DbService.instance.createBooking(Booking(
        customerId: user.uid,
        customerName: user.name,
        customerPhone: user.phone,
        bouncerId: b.uid,
        bouncerName: b.name,
        bouncerPhotoUrl: b.photoUrl,
        eventType: _eventType,
        eventDate: _start!,
        hours: _hours,
        location: _location.text.trim(),
        guests: int.tryParse(_guests.text) ?? 0,
        notes: _notes.text.trim(),
        hourlyRate: b.hourlyRate,
        totalAmount: b.hourlyRate * _hours,
      ));
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (c) => AlertDialog(
          backgroundColor: HavenColors.surface,
          icon: const Icon(Icons.favorite_rounded, color: HavenColors.sand),
          title: const Text('Request sent'),
          content: Text(
              '${b.name.split(' ').first} will review your request shortly. You can follow its progress in Bookings.'),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(c), child: const Text('Got it')),
          ],
        ),
      );
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<Session>();
    final b = widget.bouncer;
    return Scaffold(
      appBar: AppBar(title: const Text('Request a booking')),
      body: Form(
        key: _form,
        child: ListView(padding: const EdgeInsets.all(20), children: [
          Card(
            child: ListTile(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              leading: Avatar(url: b.photoUrl, name: b.name),
              title: Text(b.name,
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text('${session.money(b.hourlyRate)} per hour'),
            ),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            initialValue: _eventType,
            decoration: const InputDecoration(
                labelText: 'Type of event',
                prefixIcon: Icon(Icons.celebration_outlined)),
            items: [
              for (final t in eventTypes)
                DropdownMenuItem(value: t, child: Text(t)),
            ],
            onChanged: (v) => setState(() => _eventType = v ?? _eventType),
          ),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(
              child: _PickerField(
                icon: Icons.calendar_today_outlined,
                label: 'Date',
                value: _date == null
                    ? 'Choose'
                    : DateFormat('EEE, d MMM').format(_date!),
                onTap: _pickDate,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _PickerField(
                icon: Icons.schedule_rounded,
                label: 'Start time',
                value: _time.format(context),
                onTap: _pickTime,
              ),
            ),
          ]),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Row(children: [
                const Icon(Icons.timelapse_rounded, color: HavenColors.sage),
                const SizedBox(width: 12),
                const Expanded(
                    child: Text('Duration',
                        style: TextStyle(fontWeight: FontWeight.w600))),
                IconButton(
                  onPressed: _hours > 1 ? () => setState(() => _hours--) : null,
                  icon: const Icon(Icons.remove_circle_outline),
                ),
                Text('$_hours h',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 16)),
                IconButton(
                  onPressed:
                      _hours < 24 ? () => setState(() => _hours++) : null,
                  icon: const Icon(Icons.add_circle_outline),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _location,
            decoration: const InputDecoration(
                labelText: 'Venue / address',
                prefixIcon: Icon(Icons.location_on_outlined)),
            validator: (v) => (v == null || v.trim().length < 3)
                ? 'Where will the event be?'
                : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _guests,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
                labelText: 'Expected guests',
                prefixIcon: Icon(Icons.groups_outlined)),
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _notes,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Anything they should know?',
              hintText: 'Dress code, entry points, special concerns…',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: HavenColors.sandSoft,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(children: [
              const Text('Estimated total',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const Spacer(),
              Text(session.money(b.hourlyRate * _hours),
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      color: HavenColors.sageDark)),
            ]),
          ),
          const SizedBox(height: 8),
          const Text(
              'You won\'t be charged now. Payment is arranged once your booking is confirmed.',
              style: TextStyle(color: HavenColors.muted, fontSize: 12)),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Text('Send request'),
          ),
        ]),
      ),
    );
  }
}

class _PickerField extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  const _PickerField(
      {required this.icon,
      required this.label,
      required this.value,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Icon(icon, color: HavenColors.sage, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: const TextStyle(
                            color: HavenColors.muted, fontSize: 12)),
                    Text(value,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ]),
            ),
          ]),
        ),
      ),
    );
  }
}
