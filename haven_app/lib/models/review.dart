import 'package:cloud_firestore/cloud_firestore.dart';

class Review {
  final String id;
  final String bookingId;
  final String bouncerId;
  final String customerId;
  final String customerName;
  final int rating;
  final String comment;
  final DateTime? createdAt;

  Review({
    required this.id,
    required this.bookingId,
    required this.bouncerId,
    required this.customerId,
    required this.customerName,
    required this.rating,
    required this.comment,
    this.createdAt,
  });

  factory Review.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    final r = d['rating'];
    return Review(
      id: doc.id,
      bookingId: d['bookingId'] ?? doc.id,
      bouncerId: d['bouncerId'] ?? '',
      customerId: d['customerId'] ?? '',
      customerName: d['customerName'] ?? '',
      rating: r is num ? r.toInt() : 0,
      comment: d['comment'] ?? '',
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
    );
  }
}
