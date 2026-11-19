import 'package:cloud_firestore/cloud_firestore.dart';

int _int(dynamic v) => v is num ? v.toInt() : 0;
double _double(dynamic v) => v is num ? v.toDouble() : 0;
DateTime? _date(dynamic v) => v is Timestamp ? v.toDate() : null;

/// A check-in / check-out stamp with the device position.
class GeoStamp {
  final DateTime? at;
  final double lat;
  final double lng;
  final double accuracy;
  const GeoStamp({this.at, required this.lat, required this.lng, required this.accuracy});

  static GeoStamp? fromMap(dynamic v) => v is Map
      ? GeoStamp(
          at: _date(v['at']),
          lat: _double(v['lat']),
          lng: _double(v['lng']),
          accuracy: _double(v['accuracy']),
        )
      : null;
}

class AssignmentStatus {
  static const offered = 'offered';
  static const accepted = 'accepted';
  static const declined = 'declined';
  static const withdrawn = 'withdrawn';
}

/// `assignments/{bookingId}_{personnelId}` — one job offer.
class Assignment {
  final String id;
  final String bookingId;
  final String agencyId;
  final String agencyName;
  final String agencyPhone;
  final String personnelId;
  final String personnelName;
  final String status;
  final String declineReason;
  final DateTime? respondBy;
  final DateTime? respondedAt;
  final String serviceLabel;
  final String eventType;
  final DateTime eventDate;
  final int hours;
  final String location;
  final String requirements;
  final String agencyNote;
  final String customerName;
  final GeoStamp? checkIn;
  final GeoStamp? checkOut;

  const Assignment({
    required this.id,
    required this.bookingId,
    required this.agencyId,
    required this.agencyName,
    required this.agencyPhone,
    required this.personnelId,
    required this.personnelName,
    required this.status,
    required this.declineReason,
    required this.respondBy,
    required this.respondedAt,
    required this.serviceLabel,
    required this.eventType,
    required this.eventDate,
    required this.hours,
    required this.location,
    required this.requirements,
    required this.agencyNote,
    required this.customerName,
    this.checkIn,
    this.checkOut,
  });

  DateTime get endsAt => eventDate.add(Duration(hours: hours));
  bool get isOffered => status == AssignmentStatus.offered;
  bool get isAccepted => status == AssignmentStatus.accepted;
  bool get isPast => endsAt.isBefore(DateTime.now());

  /// Check-in window: from 1 h before the start until the end.
  bool get inCheckInWindow {
    final now = DateTime.now();
    return now.isAfter(eventDate.subtract(const Duration(hours: 1))) &&
        now.isBefore(endsAt);
  }

  bool get canCheckIn => isAccepted && checkIn == null && inCheckInWindow;
  bool get canCheckOut => isAccepted && checkIn != null && checkOut == null;

  /// True when this job and [other] overlap, with a 2 h buffer either side.
  bool overlaps(Assignment other) {
    const buffer = Duration(hours: 2);
    return eventDate.isBefore(other.endsAt.add(buffer)) &&
        other.eventDate.isBefore(endsAt.add(buffer));
  }

  factory Assignment.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return Assignment(
      id: doc.id,
      bookingId: d['bookingId'] ?? '',
      agencyId: d['agencyId'] ?? '',
      agencyName: d['agencyName'] ?? '',
      agencyPhone: d['agencyPhone'] ?? '',
      personnelId: d['personnelId'] ?? '',
      personnelName: d['personnelName'] ?? '',
      status: d['status'] ?? AssignmentStatus.offered,
      declineReason: d['declineReason'] ?? '',
      respondBy: _date(d['respondBy']),
      respondedAt: _date(d['respondedAt']),
      serviceLabel: d['serviceLabel'] ?? '',
      eventType: d['eventType'] ?? '',
      eventDate: _date(d['eventDate']) ?? DateTime.now(),
      hours: _int(d['hours']),
      location: d['location'] ?? '',
      requirements: d['requirements'] ?? '',
      agencyNote: d['agencyNote'] ?? '',
      customerName: d['customerName'] ?? '',
      checkIn: GeoStamp.fromMap(d['checkIn']),
      checkOut: GeoStamp.fromMap(d['checkOut']),
    );
  }
}

/// `joinRequests/{personnelId}`.
class JoinRequest {
  final String id;
  final String agencyId;
  final String agencyName;
  final String status;
  final DateTime? createdAt;
  const JoinRequest({
    required this.id,
    required this.agencyId,
    required this.agencyName,
    required this.status,
    this.createdAt,
  });

  factory JoinRequest.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return JoinRequest(
      id: doc.id,
      agencyId: d['agencyId'] ?? '',
      agencyName: d['agencyName'] ?? '',
      status: d['status'] ?? 'pending',
      createdAt: _date(d['createdAt']),
    );
  }
}

/// `personnelInvites/{code}`.
class PersonnelInvite {
  final String code;
  final String personnelId;
  final String agencyId;
  final String agencyName;
  final String name;
  final String phone;
  final String? usedBy;
  const PersonnelInvite({
    required this.code,
    required this.personnelId,
    required this.agencyId,
    required this.agencyName,
    required this.name,
    required this.phone,
    this.usedBy,
  });

  factory PersonnelInvite.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return PersonnelInvite(
      code: doc.id,
      personnelId: d['personnelId'] ?? '',
      agencyId: d['agencyId'] ?? '',
      agencyName: d['agencyName'] ?? '',
      name: d['name'] ?? '',
      phone: d['phone'] ?? '',
      usedBy: d['usedBy'],
    );
  }
}

/// `payroll/{id}` — monthly pay slip.
class PayrollEntry {
  final String id;
  final String month;
  final int daysWorked;
  final double net;
  final String status;
  const PayrollEntry({
    required this.id,
    required this.month,
    required this.daysWorked,
    required this.net,
    required this.status,
  });

  factory PayrollEntry.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return PayrollEntry(
      id: doc.id,
      month: d['month'] ?? '',
      daysWorked: _int(d['daysWorked']),
      net: _double(d['net']),
      status: d['status'] ?? 'pending',
    );
  }
}

/// `notifications/{id}`.
class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final bool read;
  final DateTime? createdAt;
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    this.createdAt,
  });

  factory AppNotification.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return AppNotification(
      id: doc.id,
      type: d['type'] ?? '',
      title: d['title'] ?? '',
      body: d['body'] ?? '',
      read: d['read'] == true,
      createdAt: _date(d['createdAt']),
    );
  }
}
