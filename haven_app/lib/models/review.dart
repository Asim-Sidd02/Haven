import 'package:cloud_firestore/cloud_firestore.dart';

class Review {
  final String id;
  final String bookingId;
  final String agencyId;
  final String customerId;
  final String customerName;
  final int rating;
  final String comment;
  final String personnelFeedback;
  final String reply;
  final DateTime? createdAt;

  Review({
    required this.id,
    required this.bookingId,
    required this.agencyId,
    required this.customerId,
    required this.customerName,
    required this.rating,
    required this.comment,
    this.personnelFeedback = '',
    this.reply = '',
    this.createdAt,
  });

  factory Review.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final r = d['rating'];
    return Review(
      id: doc.id,
      bookingId: d['bookingId'] ?? doc.id,
      agencyId: d['agencyId'] ?? '',
      customerId: d['customerId'] ?? '',
      customerName: d['customerName'] ?? '',
      rating: r is num ? r.toInt() : 0,
      comment: d['comment'] ?? '',
      personnelFeedback: d['personnelFeedback'] ?? '',
      reply: d['reply'] ?? '',
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}
