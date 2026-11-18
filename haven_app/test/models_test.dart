import 'package:flutter_test/flutter_test.dart';
import 'package:haven/models/agency.dart';
import 'package:haven/models/app_user.dart';
import 'package:haven/models/booking.dart';

void main() {
  test('event types and statuses are defined', () {
    expect(eventTypes, contains('Wedding'));
    expect(eventTypes, contains('Residence'));
    expect(BookingStatus.flow, [
      'pending',
      'accepted',
      'assigned',
      'ongoing',
      'completed',
    ]);
  });

  test('roles map to customer / agency / admin', () {
    expect(roleFrom('agency'), UserRole.agency);
    expect(roleFrom('admin'), UserRole.admin);
    expect(roleFrom('bouncer'), UserRole.customer);
  });

  test('price breakdown follows the schema formula', () {
    final p = PriceBreakdown.compute(
      hourlyRate: 500,
      hours: 4,
      personnelCount: 3,
      commissionPercent: 10,
      taxPercent: 18,
    );
    expect(p.subtotal, 6000);
    expect(p.platformFee, 600);
    expect(p.tax, 1188);
    expect(p.total, 7788);
  });

  test('agency parses services and helpers', () {
    final a = Agency.fromMap('a1', {
      'name': 'Shield Co',
      'city': 'Pune',
      'status': 'approved',
      'verified': true,
      'rating': 4.5,
      'services': {
        'bouncers': {'enabled': true, 'hourlyRate': 400, 'minHours': 4},
        'vip_squad': {'enabled': true, 'hourlyRate': 900, 'minHours': 0},
        'gun_squad': {'enabled': false, 'hourlyRate': 100},
      },
    });
    expect(a.offers('bouncers'), isTrue);
    expect(a.offers('gun_squad'), isFalse);
    expect(a.enabledServices.map((s) => s.key), ['vip_squad', 'bouncers']);
    expect(a.services['vip_squad']!.minHours, 1);
    expect(a.fromPrice, 400);
    expect(a.matches('pune'), isTrue);
    expect(a.matches('mumbai'), isFalse);
    expect(serviceLabel('gun_squad'), 'Armed Guards');
  });

  test('booking create map satisfies the create rule shape', () {
    final b = Booking(
      customerId: 'u',
      customerName: 'U',
      customerPhone: '1',
      agencyId: 'a',
      agencyName: 'A',
      service: 'bouncers',
      serviceLabel: 'Bouncers',
      eventType: 'Wedding',
      eventDate: DateTime(2030),
      hours: 4,
      location: 'Hall',
      guests: 100,
      personnelCount: 2,
      requirements: '',
      hourlyRate: 10,
      subtotal: 80,
      platformFee: 8,
      tax: 15.84,
      totalAmount: 103.84,
    );
    final m = b.toCreateMap();
    expect(m['status'], 'pending');
    expect(m['reviewed'], false);
    expect(m['paymentStatus'], 'unpaid');
    expect(m['assignedIds'], isEmpty);
  });
}
