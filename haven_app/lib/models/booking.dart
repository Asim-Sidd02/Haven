import 'package:cloud_firestore/cloud_firestore.dart';

int _int(dynamic v) => v is num ? v.toInt() : 0;
double _double(dynamic v) => v is num ? v.toDouble() : 0;

class BookingStatus {
  static const pending = 'pending';
  static const accepted = 'accepted';
  static const declined = 'declined';
  static const completed = 'completed';
  static const cancelled = 'cancelled';
}

const eventTypes = [
  'Private party',
  'Wedding',
  'Club night',
  'Corporate event',
  'Concert',
  'Other',
];

class Booking {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String bouncerId;
  final String bouncerName;
  final String? bouncerPhotoUrl;
  final String eventType;
  final DateTime eventDate;
  final int hours;
  final String location;
  final int guests;
  final String notes;
  final double hourlyRate;
  final double totalAmount;
  final String status;
  final String bouncerNote;
  final bool reviewed;
  final DateTime? createdAt;

  Booking({
    this.id = '',
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.bouncerId,
    required this.bouncerName,
    this.bouncerPhotoUrl,
    required this.eventType,
    required this.eventDate,
    required this.hours,
    required this.location,
    required this.guests,
    required this.notes,
    required this.hourlyRate,
    required this.totalAmount,
    this.status = BookingStatus.pending,
    this.bouncerNote = '',
    this.reviewed = false,
    this.createdAt,
  });

  bool get isUpcoming =>
      status == BookingStatus.pending || status == BookingStatus.accepted;

  factory Booking.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return Booking(
      id: doc.id,
      customerId: d['customerId'] ?? '',
      customerName: d['customerName'] ?? '',
      customerPhone: d['customerPhone'] ?? '',
      bouncerId: d['bouncerId'] ?? '',
      bouncerName: d['bouncerName'] ?? '',
      bouncerPhotoUrl: d['bouncerPhotoUrl'],
      eventType: d['eventType'] ?? 'Other',
      eventDate: (d['eventDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
      hours: _int(d['hours']),
      location: d['location'] ?? '',
      guests: _int(d['guests']),
      notes: d['notes'] ?? '',
      hourlyRate: _double(d['hourlyRate']),
      totalAmount: _double(d['totalAmount']),
      status: d['status'] ?? BookingStatus.pending,
      bouncerNote: d['bouncerNote'] ?? '',
      reviewed: d['reviewed'] ?? false,
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toCreateMap() => {
    'customerId': customerId,
    'customerName': customerName,
    'customerPhone': customerPhone,
    'bouncerId': bouncerId,
    'bouncerName': bouncerName,
    'bouncerPhotoUrl': bouncerPhotoUrl,
    'eventType': eventType,
    'eventDate': Timestamp.fromDate(eventDate),
    'hours': hours,
    'location': location,
    'guests': guests,
    'notes': notes,
    'hourlyRate': hourlyRate,
    'totalAmount': totalAmount,
    'status': BookingStatus.pending,
    'bouncerNote': '',
    'reviewed': false,
    'createdAt': FieldValue.serverTimestamp(),
    'updatedAt': FieldValue.serverTimestamp(),
  };
}
