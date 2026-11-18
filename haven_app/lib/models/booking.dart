import 'package:cloud_firestore/cloud_firestore.dart';

int _int(dynamic v) => v is num ? v.toInt() : 0;
double _double(dynamic v) => v is num ? v.toDouble() : 0;
DateTime? _date(dynamic v) => v is Timestamp ? v.toDate() : null;

class BookingStatus {
  static const pending = 'pending';
  static const accepted = 'accepted';
  static const declined = 'declined';
  static const assigned = 'assigned';
  static const ongoing = 'ongoing';
  static const completed = 'completed';
  static const cancelled = 'cancelled';

  /// The happy path, in order.
  static const flow = [pending, accepted, assigned, ongoing, completed];

  /// Statuses from which the client may still cancel.
  static const cancellable = [pending, accepted, assigned];
}

class ClientApproval {
  static const none = 'none';
  static const pending = 'pending';
  static const approved = 'approved';
  static const changesRequested = 'changes_requested';
}

const eventTypes = [
  'Wedding',
  'Club night',
  'Corporate event',
  'Concert',
  'Private party',
  'Residence',
  'Other',
];

/// Itemised price shown before a booking is submitted.
class PriceBreakdown {
  final double subtotal;
  final double platformFee;
  final double tax;
  const PriceBreakdown(this.subtotal, this.platformFee, this.tax);

  double get total => _round(subtotal + platformFee + tax);

  static double _round(double v) => (v * 100).roundToDouble() / 100;

  factory PriceBreakdown.compute({
    required double hourlyRate,
    required int hours,
    required int personnelCount,
    required double commissionPercent,
    required double taxPercent,
  }) {
    final subtotal = _round(hourlyRate * hours * personnelCount);
    final fee = _round(subtotal * commissionPercent / 100);
    final tax = _round((subtotal + fee) * taxPercent / 100);
    return PriceBreakdown(subtotal, fee, tax);
  }
}

class AssignedPerson {
  final String personnelId;
  final String code;
  final String name;
  final String photoUrl;
  final List<String> skills;
  const AssignedPerson({
    required this.personnelId,
    this.code = '',
    required this.name,
    this.photoUrl = '',
    this.skills = const [],
  });

  factory AssignedPerson.fromMap(Map<String, dynamic> d) => AssignedPerson(
    personnelId: d['personnelId'] ?? '',
    code: d['code'] ?? '',
    name: d['name'] ?? '',
    photoUrl: d['photoUrl'] ?? '',
    skills: List<String>.from(d['skills'] ?? const []),
  );
}

class RescheduleRequest {
  final DateTime date;
  final String reason;
  final String by;
  const RescheduleRequest(this.date, this.reason, this.by);
}

class Booking {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String agencyId;
  final String agencyName;
  final String service;
  final String serviceLabel;
  final String eventType;
  final DateTime eventDate;
  final int hours;
  final String location;
  final int guests;
  final int personnelCount;
  final String requirements;
  final double hourlyRate;
  final double subtotal;
  final double platformFee;
  final double tax;
  final double totalAmount;
  final String status;
  final List<AssignedPerson> assigned;
  final String clientApproval;
  final String clientFeedback;
  final String agencyNote;
  final RescheduleRequest? rescheduleRequest;
  final String cancelReason;
  final String paymentStatus;
  final bool reviewed;
  final DateTime? createdAt;

  Booking({
    this.id = '',
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.agencyId,
    required this.agencyName,
    required this.service,
    required this.serviceLabel,
    required this.eventType,
    required this.eventDate,
    required this.hours,
    required this.location,
    required this.guests,
    required this.personnelCount,
    required this.requirements,
    required this.hourlyRate,
    required this.subtotal,
    required this.platformFee,
    required this.tax,
    required this.totalAmount,
    this.status = BookingStatus.pending,
    this.assigned = const [],
    this.clientApproval = ClientApproval.none,
    this.clientFeedback = '',
    this.agencyNote = '',
    this.rescheduleRequest,
    this.cancelReason = '',
    this.paymentStatus = 'unpaid',
    this.reviewed = false,
    this.createdAt,
  });

  bool get isActive => !const [
    BookingStatus.completed,
    BookingStatus.cancelled,
    BookingStatus.declined,
  ].contains(status);
  bool get canCancel => BookingStatus.cancellable.contains(status);
  bool get awaitingTeamApproval =>
      status == BookingStatus.assigned &&
      clientApproval == ClientApproval.pending;
  bool get canReview => status == BookingStatus.completed && !reviewed;

  factory Booking.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) =>
      Booking.fromMap(doc.id, doc.data() ?? {});

  factory Booking.fromMap(String id, Map<String, dynamic> d) {
    final rr = d['rescheduleRequest'];
    return Booking(
      id: id,
      customerId: d['customerId'] ?? '',
      customerName: d['customerName'] ?? '',
      customerPhone: d['customerPhone'] ?? '',
      agencyId: d['agencyId'] ?? '',
      agencyName: d['agencyName'] ?? '',
      service: d['service'] ?? '',
      serviceLabel: d['serviceLabel'] ?? '',
      eventType: d['eventType'] ?? 'Other',
      eventDate: _date(d['eventDate']) ?? DateTime.now(),
      hours: _int(d['hours']),
      location: d['location'] ?? '',
      guests: _int(d['guests']),
      personnelCount: _int(d['personnelCount']),
      requirements: d['requirements'] ?? '',
      hourlyRate: _double(d['hourlyRate']),
      subtotal: _double(d['subtotal']),
      platformFee: _double(d['platformFee']),
      tax: _double(d['tax']),
      totalAmount: _double(d['totalAmount']),
      status: d['status'] ?? BookingStatus.pending,
      assigned: [
        for (final a in (d['assigned'] as List? ?? const []))
          if (a is Map) AssignedPerson.fromMap(Map<String, dynamic>.from(a)),
      ],
      clientApproval: d['clientApproval'] ?? ClientApproval.none,
      clientFeedback: d['clientFeedback'] ?? '',
      agencyNote: d['agencyNote'] ?? '',
      rescheduleRequest: rr is Map && _date(rr['date']) != null
          ? RescheduleRequest(
              _date(rr['date'])!,
              rr['reason'] ?? '',
              rr['by'] ?? '',
            )
          : null,
      cancelReason: d['cancelReason'] ?? '',
      paymentStatus: d['paymentStatus'] ?? 'unpaid',
      reviewed: d['reviewed'] == true,
      createdAt: _date(d['createdAt']),
    );
  }

  /// New-booking document. Satisfies the create rule: status pending,
  /// reviewed false, paymentStatus unpaid, assignedIds empty.
  Map<String, dynamic> toCreateMap() => {
    'customerId': customerId,
    'customerName': customerName,
    'customerPhone': customerPhone,
    'agencyId': agencyId,
    'agencyName': agencyName,
    'service': service,
    'serviceLabel': serviceLabel,
    'eventType': eventType,
    'eventDate': Timestamp.fromDate(eventDate),
    'hours': hours,
    'location': location,
    'guests': guests,
    'personnelCount': personnelCount,
    'requirements': requirements,
    'hourlyRate': hourlyRate,
    'subtotal': subtotal,
    'platformFee': platformFee,
    'tax': tax,
    'totalAmount': totalAmount,
    'status': BookingStatus.pending,
    'assigned': <Map<String, dynamic>>[],
    'assignedIds': <String>[],
    'clientApproval': ClientApproval.none,
    'clientFeedback': '',
    'agencyNote': '',
    'rescheduleRequest': null,
    'cancelReason': '',
    'paymentStatus': 'unpaid',
    'reviewed': false,
    'createdAt': FieldValue.serverTimestamp(),
    'updatedAt': FieldValue.serverTimestamp(),
  };
}
