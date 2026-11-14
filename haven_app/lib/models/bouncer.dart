import 'package:cloud_firestore/cloud_firestore.dart';

int _int(dynamic v) => v is num ? v.toInt() : 0;
double _double(dynamic v) => v is num ? v.toDouble() : 0;

class Bouncer {
  final String uid;
  final String name;
  final String? photoUrl;
  final String bio;
  final String city;
  final int experienceYears;
  final double hourlyRate;
  final int heightCm;
  final List<String> skills;
  final List<String> languages;
  final bool available;
  final String status; // pending | approved | rejected | suspended
  final bool verified;
  final double rating;
  final int reviewCount;
  final int ratingTotal;

  Bouncer({
    required this.uid,
    required this.name,
    this.photoUrl,
    this.bio = '',
    this.city = '',
    this.experienceYears = 0,
    this.hourlyRate = 0,
    this.heightCm = 0,
    this.skills = const [],
    this.languages = const [],
    this.available = true,
    this.status = 'pending',
    this.verified = false,
    this.rating = 0,
    this.reviewCount = 0,
    this.ratingTotal = 0,
  });

  bool get isApproved => status == 'approved';
  bool get isProfileComplete =>
      bio.isNotEmpty && city.isNotEmpty && hourlyRate > 0;

  factory Bouncer.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return Bouncer(
      uid: doc.id,
      name: d['name'] ?? '',
      photoUrl: d['photoUrl'],
      bio: d['bio'] ?? '',
      city: d['city'] ?? '',
      experienceYears: _int(d['experienceYears']),
      hourlyRate: _double(d['hourlyRate']),
      heightCm: _int(d['heightCm']),
      skills: List<String>.from(d['skills'] ?? const []),
      languages: List<String>.from(d['languages'] ?? const []),
      available: d['available'] ?? true,
      status: d['status'] ?? 'pending',
      verified: d['verified'] ?? false,
      rating: _double(d['rating']),
      reviewCount: _int(d['reviewCount']),
      ratingTotal: _int(d['ratingTotal']),
    );
  }

  /// Initial document written at sign-up (must satisfy security rules).
  static Map<String, dynamic> initialMap(String uid, String name) => {
        'uid': uid,
        'name': name,
        'photoUrl': null,
        'bio': '',
        'city': '',
        'experienceYears': 0,
        'hourlyRate': 0,
        'heightCm': 0,
        'skills': <String>[],
        'languages': <String>[],
        'available': true,
        'status': 'pending',
        'verified': false,
        'rating': 0,
        'reviewCount': 0,
        'ratingTotal': 0,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  /// Fields a bouncer is allowed to edit themselves.
  Map<String, dynamic> toEditableMap() => {
        'name': name,
        'photoUrl': photoUrl,
        'bio': bio,
        'city': city,
        'experienceYears': experienceYears,
        'hourlyRate': hourlyRate,
        'heightCm': heightCm,
        'skills': skills,
        'languages': languages,
        'available': available,
        'updatedAt': FieldValue.serverTimestamp(),
      };
}
