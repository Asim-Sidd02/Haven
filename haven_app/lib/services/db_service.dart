import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/app_user.dart';
import '../models/booking.dart';
import '../models/bouncer.dart';
import '../models/review.dart';

class DbService {
  DbService(this._db);

  /// App-wide instance. Tests may replace it with one backed by a fake store.
  static DbService instance = DbService(FirebaseFirestore.instance);

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get _users =>
      _db.collection('users');
  CollectionReference<Map<String, dynamic>> get _bouncers =>
      _db.collection('bouncers');
  CollectionReference<Map<String, dynamic>> get _bookings =>
      _db.collection('bookings');
  CollectionReference<Map<String, dynamic>> get _reviews =>
      _db.collection('reviews');

  // ---------- users ----------
  Stream<AppUser?> userStream(String uid) => _users
      .doc(uid)
      .snapshots()
      .map((d) => d.exists ? AppUser.fromDoc(d) : null);

  Future<void> updateUser(String uid,
      {String? name, String? phone, String? photoUrl, bool isBouncer = false}) async {
    final data = <String, dynamic>{
      'name': ?name,
      'phone': ?phone,
      'photoUrl': ?photoUrl,
    };
    if (data.isEmpty) return;
    final batch = _db.batch();
    batch.update(_users.doc(uid), data);
    if (isBouncer && (name != null || photoUrl != null)) {
      // Keep the public profile in sync with the account.
      batch.update(_bouncers.doc(uid), {
        'name': ?name,
        'photoUrl': ?photoUrl,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
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

  // ---------- bouncers ----------
  Stream<List<Bouncer>> approvedBouncers() => _bouncers
      .where('status', isEqualTo: 'approved')
      .orderBy('rating', descending: true)
      .snapshots()
      .map((s) => s.docs.map(Bouncer.fromDoc).toList());

  Stream<Bouncer?> bouncerStream(String uid) => _bouncers
      .doc(uid)
      .snapshots()
      .map((d) => d.exists ? Bouncer.fromDoc(d) : null);

  Future<void> saveBouncerProfile(Bouncer b) async {
    await _bouncers.doc(b.uid).update(b.toEditableMap());
    // Keep the account name/photo in sync with the public profile.
    await _users.doc(b.uid).update({'name': b.name, 'photoUrl': b.photoUrl});
  }

  Future<void> setAvailability(String uid, bool available) => _bouncers
      .doc(uid)
      .update({'available': available, 'updatedAt': FieldValue.serverTimestamp()});

  // ---------- bookings ----------
  Future<void> createBooking(Booking b) => _bookings.add(b.toCreateMap());

  Stream<List<Booking>> customerBookings(String uid) => _bookings
      .where('customerId', isEqualTo: uid)
      .orderBy('createdAt', descending: true)
      .snapshots()
      .map((s) => s.docs.map(Booking.fromDoc).toList());

  Stream<List<Booking>> bouncerBookings(String uid) => _bookings
      .where('bouncerId', isEqualTo: uid)
      .orderBy('createdAt', descending: true)
      .snapshots()
      .map((s) => s.docs.map(Booking.fromDoc).toList());

  Stream<Booking?> bookingStream(String id) => _bookings
      .doc(id)
      .snapshots()
      .map((d) => d.exists ? Booking.fromDoc(d) : null);

  Future<void> setBookingStatus(String id, String status, {String? note}) =>
      _bookings.doc(id).update({
        'status': status,
        'bouncerNote': ?note,
        'updatedAt': FieldValue.serverTimestamp(),
      });

  // ---------- reviews ----------
  Stream<List<Review>> bouncerReviews(String bouncerId) => _reviews
      .where('bouncerId', isEqualTo: bouncerId)
      .orderBy('createdAt', descending: true)
      .limit(30)
      .snapshots()
      .map((s) => s.docs.map(Review.fromDoc).toList());

  /// Writes the review, marks the booking reviewed and updates the bouncer's
  /// aggregate rating — atomically.
  Future<void> submitReview({
    required Booking booking,
    required String customerName,
    required int rating,
    required String comment,
  }) async {
    final bouncerRef = _bouncers.doc(booking.bouncerId);
    await _db.runTransaction((tx) async {
      final snap = await tx.get(bouncerRef);
      final d = snap.data() ?? {};
      final count = ((d['reviewCount'] ?? 0) as num).toInt() + 1;
      final total = ((d['ratingTotal'] ?? 0) as num).toInt() + rating;

      tx.set(_reviews.doc(booking.id), {
        'bookingId': booking.id,
        'bouncerId': booking.bouncerId,
        'customerId': booking.customerId,
        'customerName': customerName,
        'rating': rating,
        'comment': comment.trim(),
        'createdAt': FieldValue.serverTimestamp(),
      });
      tx.update(_bookings.doc(booking.id), {
        'reviewed': true,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      tx.update(bouncerRef, {
        'reviewCount': count,
        'ratingTotal': total,
        'rating': total / count,
        'lastReviewId': booking.id,
      });
    });
  }
}
