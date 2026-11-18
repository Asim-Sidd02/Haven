import 'package:cloud_firestore/cloud_firestore.dart';

double _double(dynamic v) => v is num ? v.toDouble() : 0;
DateTime? _date(dynamic v) => v is Timestamp ? v.toDate() : null;

/// `agreements/{id}` as visible to the client (never drafts).
class Agreement {
  final String id;
  final String agencyName;
  final String bookingId;
  final String title;
  final String terms;
  final double amount;
  final String startDate;
  final String endDate;
  final String status;
  final bool clientAccepted;

  const Agreement({
    required this.id,
    required this.agencyName,
    required this.bookingId,
    required this.title,
    required this.terms,
    required this.amount,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.clientAccepted,
  });

  bool get awaitingClient => status == 'sent';

  factory Agreement.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return Agreement(
      id: doc.id,
      agencyName: d['agencyName'] ?? '',
      bookingId: d['bookingId'] ?? '',
      title: d['title'] ?? 'Agreement',
      terms: d['terms'] ?? '',
      amount: _double(d['amount']),
      startDate: d['startDate'] ?? '',
      endDate: d['endDate'] ?? '',
      status: d['status'] ?? 'sent',
      clientAccepted: d['clientAccepted'] == true,
    );
  }
}

/// `attendance/{id}` — one person's shift on a booking.
class AttendanceRecord {
  final String id;
  final String bookingId;
  final String personnelName;
  final String date;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final String status;
  final bool clientConfirmed;

  const AttendanceRecord({
    required this.id,
    required this.bookingId,
    required this.personnelName,
    required this.date,
    this.checkIn,
    this.checkOut,
    required this.status,
    required this.clientConfirmed,
  });

  factory AttendanceRecord.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return AttendanceRecord(
      id: doc.id,
      bookingId: d['bookingId'] ?? '',
      personnelName: d['personnelName'] ?? '',
      date: d['date'] ?? '',
      checkIn: _date(d['checkIn']),
      checkOut: _date(d['checkOut']),
      status: d['status'] ?? 'present',
      clientConfirmed: d['clientConfirmed'] == true,
    );
  }
}

class TicketMessage {
  final String by;
  final String name;
  final String text;
  final DateTime? at;
  const TicketMessage(this.by, this.name, this.text, this.at);
}

const ticketCategories = {
  'complaint': 'Complaint',
  'support': 'Question / support',
  'incident': 'Incident',
};

const ticketPriorities = {
  'normal': 'Normal',
  'high': 'High',
  'emergency': 'Emergency',
};

/// `tickets/{id}` — a complaint or support request.
class Ticket {
  final String id;
  final String agencyId;
  final String bookingId;
  final String subject;
  final String category;
  final String priority;
  final String status;
  final List<TicketMessage> messages;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Ticket({
    required this.id,
    required this.agencyId,
    required this.bookingId,
    required this.subject,
    required this.category,
    required this.priority,
    required this.status,
    required this.messages,
    this.createdAt,
    this.updatedAt,
  });

  DateTime get sortKey =>
      updatedAt ?? createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);

  factory Ticket.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return Ticket(
      id: doc.id,
      agencyId: d['agencyId'] ?? '',
      bookingId: d['bookingId'] ?? '',
      subject: d['subject'] ?? '',
      category: d['category'] ?? 'support',
      priority: d['priority'] ?? 'normal',
      status: d['status'] ?? 'open',
      messages: [
        for (final m in (d['messages'] as List? ?? const []))
          if (m is Map)
            TicketMessage(
              m['by'] ?? '',
              m['name'] ?? '',
              m['text'] ?? '',
              _date(m['at']),
            ),
      ],
      createdAt: _date(d['createdAt']),
      updatedAt: _date(d['updatedAt']),
    );
  }
}
