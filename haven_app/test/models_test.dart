import 'package:flutter_test/flutter_test.dart';
import 'package:haven/models/booking.dart';

void main() {
  test('event types are defined', () {
    expect(eventTypes, contains('Wedding'));
    expect(BookingStatus.pending, 'pending');
  });
}
