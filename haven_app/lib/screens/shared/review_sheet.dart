import 'package:flutter/material.dart';

import '../../models/booking.dart';
import '../../services/auth_service.dart';
import '../../services/db_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

Future<void> showReviewSheet(
  BuildContext context,
  Booking booking,
  String customerName,
) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: HavenColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _ReviewSheet(booking: booking, customerName: customerName),
  );
}

class _ReviewSheet extends StatefulWidget {
  final Booking booking;
  final String customerName;
  const _ReviewSheet({required this.booking, required this.customerName});
  @override
  State<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<_ReviewSheet> {
  int _rating = 5;
  final _comment = TextEditingController();
  bool _busy = false;

  static const _labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Wonderful'];

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await DbService.instance.submitReview(
        booking: widget.booking,
        customerName: widget.customerName,
        rating: _rating,
        comment: _comment.text,
      );
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(content: Text('Thank you for your review')),
      );
    } catch (e) {
      if (mounted) showMessage(context, AuthService.friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        24 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'How was ${widget.booking.bouncerName.split(' ').first}?',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 6),
          const Text(
            'Your honest words help others feel safe choosing.',
            textAlign: TextAlign.center,
            style: TextStyle(color: HavenColors.muted),
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 1; i <= 5; i++)
                IconButton(
                  iconSize: 38,
                  onPressed: () => setState(() => _rating = i),
                  icon: Icon(
                    i <= _rating
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    color: HavenColors.sand,
                  ),
                ),
            ],
          ),
          Text(
            _labels[_rating],
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: HavenColors.sageDark,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _comment,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'What stood out? (optional)',
            ),
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Share review'),
          ),
        ],
      ),
    );
  }
}
