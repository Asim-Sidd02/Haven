import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole { customer, agency, admin, bouncer }

UserRole roleFrom(String? v) => UserRole.values.firstWhere(
  (r) => r.name == v,
  orElse: () => UserRole.customer,
);

class AppUser {
  final String uid;
  final String name;
  final String email;
  final String phone;
  final String? photoUrl;
  final UserRole role;
  final bool isActive;
  final DateTime? createdAt;

  /// Bouncer accounts only: linked `personnel` doc id (null until linked).
  final String? personnelId;

  AppUser({
    required this.uid,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.photoUrl,
    this.isActive = true,
    this.createdAt,
    this.personnelId,
  });

  factory AppUser.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return AppUser(
      uid: doc.id,
      name: d['name'] ?? '',
      email: d['email'] ?? '',
      phone: d['phone'] ?? '',
      photoUrl: d['photoUrl'],
      role: roleFrom(d['role']),
      isActive: d['isActive'] ?? true,
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
      personnelId: (d['personnelId'] as String?)?.isEmpty == true
          ? null
          : d['personnelId'] as String?,
    );
  }

  Map<String, dynamic> toCreateMap() => {
    'uid': uid,
    'name': name,
    'email': email,
    'phone': phone,
    'photoUrl': photoUrl,
    'role': role.name,
    'isActive': true,
    // Bouncers are linked to a personnel record later (rules require null).
    if (role == UserRole.bouncer) 'personnelId': null,
    'createdAt': FieldValue.serverTimestamp(),
  };
}
