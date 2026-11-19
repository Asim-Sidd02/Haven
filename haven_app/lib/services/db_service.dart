import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/agency.dart';
import '../models/app_user.dart';
import '../models/booking.dart';
import '../models/records.dart';
import '../models/review.dart';

/// All Firestore access for the client app. Every read/write here is shaped
/// to satisfy `firebase/firestore.rules` (v2) and only uses the composite
/// indexes declared in `firebase/firestore.indexes.json`.
class DbService {
  DbService(this._db);

  /// App-wide instance. Tests may replace it with one backed by a fake store.
  static DbService instance = DbService(FirebaseFirestore.instance);

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _users =>
      _db.collection('users');
  CollectionReference<Map<String, dynamic>> get _agencies =>
      _db.collection('agencies');
  CollectionReference<Map<String, dynamic>> get _bookings =>
      _db.collection('bookings');
  CollectionReference<Map<String, dynamic>> get _reviews =>
      _db.collection('reviews');
  CollectionReference<Map<String, dynamic>> get _notifications =>
      _db.collection('notifications');
  CollectionReference<Map<String, dynamic>> get _agreements =>
      _db.collection('agreements');
  CollectionReference<Map<String, dynamic>> get _attendance =>
      _db.collection('attendance');
  CollectionReference<Map<String, dynamic>> get _tickets =>
      _db.collection('tickets');

  // ---------- users ----------
  Stream<AppUser?> userStream(String uid) => _users
      .doc(uid)
      .snapshots()
      .map((d) => d.exists ? AppUser.fromDoc(d) : null);

  Future<void> updateUser(
    String uid, {
    String? name,
    String? phone,
    String? photoUrl,
  }) async {
    final data = <String, dynamic>{
      'name': ?name,
      'phone': ?phone,
      'photoUrl': ?photoUrl,
    };
    if (data.isEmpty) return;
    await _users.doc(uid).update(data);
  }

  // ---------- settings ----------
  Future<Map<String, dynamic>> appSettings() async {
    try {
      final d = await _db.collection('settings').doc('app').get();
      return d.data() ?? {};
    } catch (_) {
      return {};
    }
  }

  // ---------- agencies ----------
  /// Approved agencies, best rated first. Sorted on the device so the query
  /// works without a composite Firestore index.
  Stream<List<Agency>> approvedAgencies() => _agencies
      .where('status', isEqualTo: 'approved')
      .snapshots()
      .map(
        (s) =>
            s.docs.map(Agency.fromDoc).toList()
              ..sort((a, b) => b.rating.compareTo(a.rating)),
      );

  Stream<Agency?> agencyStream(String id) => _agencies
      .doc(id)
      .snapshots()
      .map((d) => d.exists ? Agency.fromDoc(d) : null);

  // ---------- bookings ----------
  /// Creates the booking and lets the agency know about it.
  Future<String> createBooking(Booking b) async {
    final ref = _bookings.doc();
    final batch = _db.batch();
    batch.set(ref, b.toCreateMap());
    batch.set(_notifications.doc(), {
      'recipientId': b.agencyId,
      'type': 'booking',
      'title': 'New booking request',
      'body':
          '${b.customerName} requested ${b.personnelCount} × ${b.serviceLabel} '
          'for ${b.eventType}.',
      'link': '/bookings/${ref.id}',
      'read': false,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return ref.id;
  }

  Stream<List<Booking>> customerBookings(String uid) => _bookings
      .where('customerId', isEqualTo: uid)
      .snapshots()
      .map((s) => s.docs.map(Booking.fromDoc).toList()
        ..sort((a, b) => (b.createdAt ?? DateTime.now())
            .compareTo(a.createdAt ?? DateTime.now())));

  Stream<Booking?> bookingStream(String id) => _bookings
      .doc(id)
      .snapshots()
      .map((d) => d.exists ? Booking.fromDoc(d) : null);

  Future<void> _notifyAgency(
    Booking b,
    String title,
    String body, {
    String type = 'booking',
  }) => _notifications.add({
    'recipientId': b.agencyId,
    'type': type,
    'title': title,
    'body': body,
    'link': '/bookings/${b.id}',
    'read': false,
    'createdAt': FieldValue.serverTimestamp(),
  });

  Future<void> cancelBooking(Booking b, String reason) async {
    await _bookings.doc(b.id).update({
      'status': BookingStatus.cancelled,
      'cancelReason': reason.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await _notifyAgency(
      b,
      'Booking cancelled',
      '${b.customerName} cancelled the ${b.serviceLabel} booking.',
    );
  }

  Future<void> requestTeamChanges(Booking b, String feedback) async {
    await _bookings.doc(b.id).update({
      'clientApproval': ClientApproval.changesRequested,
      'clientFeedback': feedback.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await _notifyAgency(
      b,
      'Changes requested',
      '${b.customerName} asked for changes to the team: ${feedback.trim()}',
      type: 'assignment',
    );
  }

  Future<void> requestReschedule(
    Booking b,
    DateTime date,
    String reason,
  ) async {
    await _bookings.doc(b.id).update({
      'rescheduleRequest': {
        'date': Timestamp.fromDate(date),
        'reason': reason.trim(),
        'by': 'customer',
      },
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await _notifyAgency(
      b,
      'Reschedule requested',
      '${b.customerName} asked to move the ${b.serviceLabel} booking.',
    );
  }

  // ---------- reviews ----------
  Stream<List<Review>> agencyReviews(String agencyId) => _reviews
      .where('agencyId', isEqualTo: agencyId)
      .snapshots()
      .map((s) => (s.docs.map(Review.fromDoc).toList()
            ..sort((a, b) => (b.createdAt ?? DateTime.now())
                .compareTo(a.createdAt ?? DateTime.now())))
          .take(30)
          .toList());

  /// Writes the review, marks the booking reviewed and updates the agency's
  /// aggregate rating — atomically, exactly as the rules require.
  Future<void> submitReview({
    required Booking booking,
    required String customerName,
    required int rating,
    required String comment,
    String personnelFeedback = '',
  }) async {
    final agencyRef = _agencies.doc(booking.agencyId);
    await _db.runTransaction((tx) async {
      final snap = await tx.get(agencyRef);
      final d = snap.data() ?? {};
      final count = ((d['reviewCount'] ?? 0) as num).toInt() + 1;
      final total = ((d['ratingTotal'] ?? 0) as num).toInt() + rating;

      tx.set(_reviews.doc(booking.id), {
        'bookingId': booking.id,
        'agencyId': booking.agencyId,
        'customerId': booking.customerId,
        'customerName': customerName,
        'rating': rating,
        'comment': comment.trim(),
        'personnelFeedback': personnelFeedback.trim(),
        'reply': '',
        'replyAt': null,
        'reported': false,
        'createdAt': FieldValue.serverTimestamp(),
      });
      tx.update(_bookings.doc(booking.id), {
        'reviewed': true,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      tx.update(agencyRef, {
        'reviewCount': count,
        'ratingTotal': total,
        'rating': total / count,
        'lastReviewId': booking.id,
      });
    });
  }

  // ---------- agreements ----------
  /// The client's agreements (drafts are excluded so the query satisfies the
  /// read rule). Filtered to [bookingId] client-side.
  Stream<List<Agreement>> bookingAgreements(String uid, String bookingId) =>
      _agreements
          .where('customerId', isEqualTo: uid)
          .where('status', whereIn: ['sent', 'accepted', 'declined'])
          .snapshots()
          .map(
            (s) =>
                s.docs
                    .map(Agreement.fromDoc)
                    .where((a) => a.bookingId == bookingId)
                    .toList()
                  ..sort((a, b) => a.title.compareTo(b.title)),
          );

  Future<void> respondToAgreement(
    Agreement a, {
    required bool accept,
    required String customerName,
  }) => _agreements.doc(a.id).update({
    'clientAccepted': accept,
    'status': accept ? 'accepted' : 'declined',
    'history': FieldValue.arrayUnion([
      {
        'at': Timestamp.now(),
        'by': customerName,
        'action': accept ? 'client_accepted' : 'client_declined',
      },
    ]),
    'updatedAt': FieldValue.serverTimestamp(),
  });

  // ---------- attendance ----------
  /// Single equality filter (no composite index); booking + sort client-side.
  Stream<List<AttendanceRecord>> bookingAttendance(
    String uid,
    String bookingId,
  ) => _attendance
      .where('customerId', isEqualTo: uid)
      .snapshots()
      .map(
        (s) =>
            s.docs
                .map(AttendanceRecord.fromDoc)
                .where((r) => r.bookingId == bookingId)
                .toList()
              ..sort((a, b) {
                final c = a.date.compareTo(b.date);
                return c != 0 ? c : a.personnelName.compareTo(b.personnelName);
              }),
      );

  Future<void> confirmAttendance(String id) =>
      _attendance.doc(id).update({'clientConfirmed': true});

  // ---------- tickets ----------
  Stream<List<Ticket>> customerTickets(String uid) => _tickets
      .where('customerId', isEqualTo: uid)
      .snapshots()
      .map(
        (s) =>
            s.docs.map(Ticket.fromDoc).toList()
              ..sort((a, b) => b.sortKey.compareTo(a.sortKey)),
      );

  Stream<Ticket?> ticketStream(String id) => _tickets
      .doc(id)
      .snapshots()
      .map((d) => d.exists ? Ticket.fromDoc(d) : null);

  Future<void> createTicket({
    required String customerId,
    required String customerName,
    required Booking booking,
    required String subject,
    required String category,
    required String priority,
    required String message,
  }) async {
    final batch = _db.batch();
    batch.set(_tickets.doc(), {
      'agencyId': booking.agencyId,
      'customerId': customerId,
      'customerName': customerName,
      'bookingId': booking.id,
      'subject': subject.trim(),
      'category': category,
      'priority': priority,
      'status': 'open',
      'messages': [
        {
          'by': 'customer',
          'name': customerName,
          'text': message.trim(),
          'at': Timestamp.now(),
        },
      ],
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    batch.set(_notifications.doc(), {
      'recipientId': booking.agencyId,
      'type': priority == 'emergency' ? 'emergency' : 'message',
      'title': priority == 'emergency'
          ? 'Emergency reported by a client'
          : 'New ${ticketCategories[category]?.toLowerCase() ?? 'ticket'}',
      'body': '$customerName: ${subject.trim()}',
      'link': '/support',
      'read': false,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  Future<void> replyToTicket(
    String id,
    String name,
    String text, {
    String by = 'customer',
  }) => _tickets.doc(id).update({
    'messages': FieldValue.arrayUnion([
      {'by': by, 'name': name, 'text': text.trim(), 'at': Timestamp.now()},
    ]),
    'updatedAt': FieldValue.serverTimestamp(),
  });
}
