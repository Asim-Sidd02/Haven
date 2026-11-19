import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

import '../models/app_user.dart';
import '../models/assignment.dart';
import '../models/personnel.dart';
import '../models/records.dart';

/// Thrown for business-rule failures with a message fit to show the user.
class BouncerException implements Exception {
  final String message;
  const BouncerException(this.message);
  @override
  String toString() => message;
}

/// A device position recorded at check-in / check-out.
class GeoFix {
  final double lat;
  final double lng;
  final double accuracy;
  const GeoFix(this.lat, this.lng, this.accuracy);
  Map<String, dynamic> toMap() => {
    'lat': lat,
    'lng': lng,
    'accuracy': accuracy,
  };
}

/// A public agency found by its join code.
class AgencyMatch {
  final String id;
  final String name;
  final String city;
  final String logoUrl;
  const AgencyMatch(this.id, this.name, this.city, this.logoUrl);
}

/// All Firestore access for the bouncer module. Every write is shaped to the
/// bouncer branches of `firebase/firestore.rules` (v3).
class BouncerService {
  BouncerService(this._db);

  static BouncerService instance = BouncerService(FirebaseFirestore.instance);

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> _c(String name) =>
      _db.collection(name);

  /// Fields a bouncer may still change once verified (rules).
  static const verifiedEditable = {
    'availability',
    'leaveUntil',
    'workDays',
    'shifts',
    'preferredAreas',
    'skills',
    'languages',
    'updatedAt',
  };

  // ---------- linking ----------
  /// Looks up an invite code. Returns null when it doesn't exist.
  Future<PersonnelInvite?> lookupInvite(String code) async {
    final snap = await _c(
      'personnelInvites',
    ).doc(code.trim().toUpperCase()).get();
    return snap.exists ? PersonnelInvite.fromDoc(snap) : null;
  }

  /// Redeems [invite]: invite {usedBy, usedAt}, personnel {userId, updatedAt},
  /// user {personnelId} — one batch, as the rules require.
  Future<void> redeemInvite(String uid, PersonnelInvite invite) async {
    if (invite.usedBy != null) {
      throw const BouncerException('This invite code has already been used.');
    }
    final batch = _db.batch();
    batch.update(_c('personnelInvites').doc(invite.code), {
      'usedBy': uid,
      'usedAt': FieldValue.serverTimestamp(),
    });
    batch.update(_c('personnel').doc(invite.personnelId), {
      'userId': uid,
      'updatedAt': FieldValue.serverTimestamp(),
    });
    batch.update(_c('users').doc(uid), {'personnelId': invite.personnelId});
    await batch.commit();
  }

  /// Creates `personnel/{uid}` for an independent bouncer and links it.
  Future<void> registerIndependent(AppUser u) async {
    final ref = _c('personnel').doc(u.uid);
    final batch = _db.batch();
    batch.set(ref, {
      'agencyId': '',
      'userId': u.uid,
      'source': 'independent',
      'inviteCode': null,
      'code':
          'HV-${u.uid.substring(0, u.uid.length < 6 ? u.uid.length : 6).toUpperCase()}',
      'name': u.name,
      'phone': u.phone,
      'photoUrl': u.photoUrl ?? '',
      'dob': '',
      'gender': '',
      'address': '',
      'experienceYears': 0,
      'heightCm': 0,
      'skills': <String>[],
      'certifications': <String>[],
      'languages': <String>[],
      'employmentType': '',
      'dailyWage': 0,
      'verificationStatus': VerificationStatus.draft,
      'adminRemarks': '',
      'availability': 'available',
      'leaveUntil': null,
      'workDays': <String>[],
      'shifts': <String>[],
      'preferredAreas': <String>[],
      'active': true,
      'removalRequested': false,
      'consentAt': null,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    batch.update(_c('users').doc(u.uid), {'personnelId': u.uid});
    await batch.commit();
  }

  // ---------- personnel ----------
  Stream<Personnel?> personnelStream(String id) => _c(
    'personnel',
  ).doc(id).snapshots().map((d) => d.exists ? Personnel.fromDoc(d) : null);

  /// Saves profile fields (a draft step). When verified, only the work
  /// preference fields are sent, matching the rules.
  Future<void> saveProfile(Personnel p, Map<String, dynamic> data) {
    final map = {...data, 'updatedAt': FieldValue.serverTimestamp()};
    if (p.isVerified) {
      map.removeWhere((k, _) => !verifiedEditable.contains(k));
    }
    return _c('personnel').doc(p.id).update(map);
  }

  /// Submits the profile for admin review.
  Future<void> submitForReview(Personnel p) async {
    if (!p.canSubmit) {
      throw const BouncerException(
        'Your profile can\'t be submitted right now.',
      );
    }
    await _c('personnel').doc(p.id).update({
      'verificationStatus': VerificationStatus.pending,
      'consentAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> saveAvailability(
    Personnel p, {
    required String availability,
    required String? leaveUntil,
    required List<String> workDays,
    required List<String> shifts,
    required List<String> preferredAreas,
  }) => _c('personnel').doc(p.id).update({
    'availability': availability,
    'leaveUntil': availability == 'on_leave' ? leaveUntil : null,
    'workDays': workDays,
    'shifts': shifts,
    'preferredAreas': preferredAreas,
    'updatedAt': FieldValue.serverTimestamp(),
  });

  /// Best-effort agency name. Bouncers may only read approved agencies.
  Future<String?> agencyName(String agencyId) async {
    if (agencyId.isEmpty) return null;
    try {
      final d = await _c('agencies').doc(agencyId).get();
      return d.data()?['name'] as String?;
    } catch (e) {
      debugPrint('agencyName($agencyId): $e');
      return null;
    }
  }

  // ---------- documents ----------
  Stream<List<PersonnelDocument>> documents(String personnelId) =>
      _c('documents')
          .where('personnelId', isEqualTo: personnelId)
          .where('ownerType', isEqualTo: 'personnel')
          .snapshots()
          .map(
            (s) => s.docs.map(PersonnelDocument.fromDoc).toList()
              ..sort(
                (a, b) => (b.uploadedAt ?? DateTime(2100)).compareTo(
                  a.uploadedAt ?? DateTime(2100),
                ),
              ),
          );

  Future<void> addDocument(
    Personnel p, {
    required String type,
    required String name,
    required String fileUrl,
  }) => _c('documents').add({
    'agencyId': p.agencyId,
    'ownerType': 'personnel',
    'personnelId': p.id,
    'personnelName': p.name,
    'type': type,
    'name': name,
    'fileUrl': fileUrl,
    'expiresAt': null,
    'status': 'pending',
    'remarks': '',
    'uploadedAt': FieldValue.serverTimestamp(),
    'reviewedBy': null,
    'reviewedAt': null,
  });

  Future<void> replaceDocument(
    Personnel p,
    PersonnelDocument d, {
    required String fileUrl,
  }) => _c('documents').doc(d.id).update({
    'fileUrl': fileUrl,
    'status': 'pending',
    'uploadedAt': FieldValue.serverTimestamp(),
    'agencyId': p.agencyId,
  });

  Future<void> deleteDocument(PersonnelDocument d) =>
      _c('documents').doc(d.id).delete();

  /// After joining an agency, moves the bouncer's pending documents onto it.
  /// Rejected / verified documents are left alone (a rejected one picks up
  /// the agency when it is replaced).
  Future<void> resyncDocuments(Personnel p) async {
    if (p.agencyId.isEmpty) return;
    final snap = await _c('documents')
        .where('personnelId', isEqualTo: p.id)
        .where('ownerType', isEqualTo: 'personnel')
        .get();
    final batch = _db.batch();
    var n = 0;
    for (final d in snap.docs) {
      final data = d.data();
      if (data['status'] == 'pending' && data['agencyId'] != p.agencyId) {
        batch.update(d.reference, {
          'agencyId': p.agencyId,
          'status': 'pending',
        });
        n++;
      }
    }
    if (n > 0) await batch.commit();
  }

  // ---------- agencies & join requests ----------
  Future<List<AgencyMatch>> findAgency(String code) async {
    final s = await _c('agencies')
        .where('joinCode', isEqualTo: code.trim().toUpperCase())
        .where('status', isEqualTo: 'approved')
        .get();
    return [
      for (final d in s.docs)
        AgencyMatch(
          d.id,
          d.data()['name'] ?? 'Agency',
          d.data()['city'] ?? '',
          d.data()['logoUrl'] ?? '',
        ),
    ];
  }

  Stream<JoinRequest?> joinRequest(String uid) => _c('joinRequests')
      .where('userId', isEqualTo: uid)
      .snapshots()
      .map((s) => s.docs.isEmpty ? null : JoinRequest.fromDoc(s.docs.first));

  Future<void> sendJoinRequest(Personnel p, String uid, AgencyMatch a) async {
    final batch = _db.batch();
    batch.set(_c('joinRequests').doc(p.id), {
      'personnelId': p.id,
      'userId': uid,
      'agencyId': a.id,
      'agencyName': a.name,
      'name': p.name,
      'phone': p.phone,
      'photoUrl': p.photoUrl,
      'experienceYears': p.experienceYears,
      'skills': p.skills,
      'status': 'pending',
      'createdAt': FieldValue.serverTimestamp(),
      'respondedAt': null,
    });
    batch.set(
      _c('notifications').doc(),
      _note(
        recipientId: a.id,
        type: 'message',
        title: 'New join request',
        body: '${p.name} asked to join your agency.',
        link: '/personnel',
      ),
    );
    await batch.commit();
  }

  Future<void> cancelJoinRequest(String personnelId) =>
      _c('joinRequests').doc(personnelId).delete();

  // ---------- assignments ----------
  Stream<List<Assignment>> assignments(String personnelId) => _c('assignments')
      .where('personnelId', isEqualTo: personnelId)
      .snapshots()
      .map(
        (s) =>
            s.docs.map(Assignment.fromDoc).toList()
              ..sort((a, b) => a.eventDate.compareTo(b.eventDate)),
      );

  Stream<Assignment?> assignmentStream(String id) => _c(
    'assignments',
  ).doc(id).snapshots().map((d) => d.exists ? Assignment.fromDoc(d) : null);

  /// Accepts an offer. Returns true if this acceptance confirmed the booking.
  Future<bool> accept(Assignment a, Personnel me, List<Assignment> mine) async {
    if (!me.isVerified) {
      throw const BouncerException(
        'Only verified personnel can accept work. Finish your profile and wait for verification first.',
      );
    }
    final clash = mine.where(
      (o) => o.id != a.id && o.isAccepted && o.overlaps(a),
    );
    if (clash.isNotEmpty) {
      final o = clash.first;
      throw BouncerException(
        'This overlaps your accepted job "${o.serviceLabel}" on '
        '${DateFormat('EEE d MMM, h:mm a').format(o.eventDate)} '
        '(we keep a 2-hour gap between jobs).',
      );
    }
    final bookingRef = _c('bookings').doc(a.bookingId);
    var confirmed = false;
    String customerId = '';
    await _db.runTransaction((tx) async {
      final snap = await tx.get(bookingRef);
      final b = snap.data();
      if (b == null) {
        throw const BouncerException('This booking no longer exists.');
      }
      customerId = b['customerId'] ?? '';
      final assigned = List<String>.from(b['assignedIds'] ?? const []);
      final accepted = {
        ...List<String>.from(b['acceptedIds'] ?? const []),
        me.id,
      };
      final declined = List<String>.from(b['declinedIds'] ?? const [])
        ..remove(me.id);
      confirmed = b['status'] == 'assigned' && accepted.containsAll(assigned);
      tx.update(_c('assignments').doc(a.id), {
        'status': AssignmentStatus.accepted,
        'respondedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      tx.update(bookingRef, {
        'acceptedIds': accepted.toList(),
        'declinedIds': declined,
        if (confirmed) 'status': 'confirmed',
        'updatedAt': FieldValue.serverTimestamp(),
      });
    });
    await _safeNotify(
      _note(
        recipientId: a.agencyId,
        type: 'assignment',
        title: 'Assignment accepted',
        body: '${me.name} accepted ${a.serviceLabel} on ${_day(a.eventDate)}.',
        link: '/bookings/${a.bookingId}',
      ),
    );
    if (confirmed && customerId.isNotEmpty) {
      await _safeNotify(
        _note(
          recipientId: customerId,
          type: 'booking',
          title: 'Your booking is confirmed',
          body:
              'Your ${a.serviceLabel} team for ${_day(a.eventDate)} is confirmed.',
          link: '/bookings/${a.bookingId}',
        ),
      );
    }
    return confirmed;
  }

  Future<void> decline(Assignment a, Personnel me, String reason) async {
    final bookingRef = _c('bookings').doc(a.bookingId);
    await _db.runTransaction((tx) async {
      final snap = await tx.get(bookingRef);
      final b = snap.data();
      if (b == null) {
        throw const BouncerException('This booking no longer exists.');
      }
      final declined = {
        ...List<String>.from(b['declinedIds'] ?? const []),
        me.id,
      };
      final accepted = List<String>.from(b['acceptedIds'] ?? const [])
        ..remove(me.id);
      tx.update(_c('assignments').doc(a.id), {
        'status': AssignmentStatus.declined,
        'declineReason': reason.trim(),
        'respondedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      tx.update(bookingRef, {
        'acceptedIds': accepted,
        'declinedIds': declined.toList(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    });
    await _safeNotify(
      _note(
        recipientId: a.agencyId,
        type: 'assignment',
        title: 'Assignment declined',
        body:
            '${me.name} declined ${a.serviceLabel} on ${_day(a.eventDate)}: ${reason.trim()}',
        link: '/bookings/${a.bookingId}',
      ),
    );
  }

  // ---------- attendance ----------
  Future<void> checkIn(Assignment a, Personnel me, GeoFix fix) async {
    final bookingRef = _c('bookings').doc(a.bookingId);
    final b = (await bookingRef.get()).data();
    if (b == null) {
      throw const BouncerException('This booking no longer exists.');
    }
    final late = DateTime.now().isAfter(
      a.eventDate.add(const Duration(minutes: 15)),
    );
    final batch = _db.batch();
    batch.set(_c('attendance').doc('${a.bookingId}_${me.id}'), {
      'agencyId': b['agencyId'] ?? a.agencyId,
      'bookingId': a.bookingId,
      'personnelId': me.id,
      'personnelName': me.name,
      'customerId': b['customerId'] ?? '',
      'date': DateFormat('yyyy-MM-dd').format(a.eventDate),
      'scheduledStart': Timestamp.fromDate(a.eventDate),
      'checkIn': FieldValue.serverTimestamp(),
      'checkOut': null,
      'status': late ? 'late' : 'present',
      'overtimeHours': 0,
      'clientConfirmed': false,
      'correction': null,
      'source': 'app',
      'checkInLocation': fix.toMap(),
      'checkOutLocation': null,
    });
    batch.update(_c('assignments').doc(a.id), {
      'checkIn': {'at': FieldValue.serverTimestamp(), ...fix.toMap()},
      'updatedAt': FieldValue.serverTimestamp(),
    });
    if (b['status'] == 'confirmed') {
      batch.update(bookingRef, {
        'status': 'ongoing',
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  Future<void> checkOut(Assignment a, Personnel me, GeoFix fix) async {
    final batch = _db.batch();
    batch.update(_c('attendance').doc('${a.bookingId}_${me.id}'), {
      'checkOut': FieldValue.serverTimestamp(),
      'checkOutLocation': fix.toMap(),
    });
    batch.update(_c('assignments').doc(a.id), {
      'checkOut': {'at': FieldValue.serverTimestamp(), ...fix.toMap()},
      'updatedAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  // ---------- payroll ----------
  Stream<List<PayrollEntry>> payroll(String personnelId) => _c('payroll')
      .where('personnelId', isEqualTo: personnelId)
      .snapshots()
      .map(
        (s) =>
            s.docs.map(PayrollEntry.fromDoc).toList()
              ..sort((a, b) => b.month.compareTo(a.month)),
      );

  // ---------- notifications ----------
  Stream<List<AppNotification>> notifications(String uid) => _c('notifications')
      .where('recipientId', isEqualTo: uid)
      .snapshots()
      .map(
        (s) => s.docs.map(AppNotification.fromDoc).toList()
          ..sort(
            (a, b) => (b.createdAt ?? DateTime(2100)).compareTo(
              a.createdAt ?? DateTime(2100),
            ),
          ),
      );

  Future<void> markRead(String id) =>
      _c('notifications').doc(id).update({'read': true});

  // ---------- tickets ----------
  Stream<List<Ticket>> tickets(String uid) => _c('tickets')
      .where('reporterId', isEqualTo: uid)
      .snapshots()
      .map(
        (s) =>
            s.docs.map(Ticket.fromDoc).toList()
              ..sort((a, b) => b.sortKey.compareTo(a.sortKey)),
      );

  Future<void> createTicket({
    required Personnel me,
    required String uid,
    required String reporterName,
    required String? bookingId,
    required String subject,
    required String category,
    required String priority,
    required String message,
  }) async {
    final batch = _db.batch();
    batch.set(_c('tickets').doc(), {
      'agencyId': me.agencyId,
      'customerId': null,
      'customerName': '',
      'reporterId': uid,
      'reporterName': reporterName,
      'bookingId': bookingId,
      'subject': subject.trim(),
      'category': category,
      'priority': priority,
      'status': 'open',
      'messages': [
        {
          'by': 'bouncer',
          'name': reporterName,
          'text': message.trim(),
          'at': Timestamp.now(),
        },
      ],
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    if (priority == 'emergency' && me.agencyId.isNotEmpty) {
      batch.set(
        _c('notifications').doc(),
        _note(
          recipientId: me.agencyId,
          type: 'emergency',
          title: 'Emergency reported by $reporterName',
          body: subject.trim(),
          link: '/support',
        ),
      );
    }
    await batch.commit();
  }

  // ---------- helpers ----------
  Map<String, dynamic> _note({
    required String recipientId,
    required String type,
    required String title,
    required String body,
    required String link,
  }) => {
    'recipientId': recipientId,
    'type': type,
    'title': title,
    'body': body,
    'link': link,
    'read': false,
    'createdAt': FieldValue.serverTimestamp(),
  };

  Future<void> _safeNotify(Map<String, dynamic> data) async {
    try {
      await _c('notifications').add(data);
    } catch (e) {
      debugPrint('notify failed: $e');
    }
  }

  static String _day(DateTime d) => DateFormat('EEE d MMM').format(d);
}
