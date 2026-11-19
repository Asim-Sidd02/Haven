import 'package:cloud_firestore/cloud_firestore.dart';

int _int(dynamic v) => v is num ? v.toInt() : 0;
DateTime? _date(dynamic v) => v is Timestamp ? v.toDate() : null;
List<String> _list(dynamic v) => v is List ? List<String>.from(v) : <String>[];

class VerificationStatus {
  static const draft = 'draft';
  static const pending = 'pending';
  static const needsCorrection = 'needs_correction';
  static const verified = 'verified';
  static const rejected = 'rejected';
  static const expired = 'expired';
  static const suspended = 'suspended';

  /// Statuses from which the bouncer may (re)submit for review.
  static const submittable = [draft, rejected, needsCorrection, expired];

  static String label(String s) => switch (s) {
    draft => 'Profile incomplete',
    pending => 'Under review',
    needsCorrection => 'Needs correction',
    verified => 'Verified',
    rejected => 'Not approved',
    expired => 'Expired',
    suspended => 'Suspended',
    _ => s,
  };
}

const weekDays = {
  'mon': 'Mon',
  'tue': 'Tue',
  'wed': 'Wed',
  'thu': 'Thu',
  'fri': 'Fri',
  'sat': 'Sat',
  'sun': 'Sun',
};

const shiftLabels = {
  'morning': 'Morning',
  'evening': 'Evening',
  'night': 'Night',
};

const availabilityLabels = {
  'available': 'Available',
  'assigned': 'On assignment',
  'unavailable': 'Unavailable',
  'on_leave': 'On leave',
};

/// `personnel/{id}` as seen by the bouncer who owns it.
class Personnel {
  final String id;
  final String agencyId;
  final String? userId;
  final String source;
  final String code;
  final String name;
  final String phone;
  final String photoUrl;
  final String dob;
  final String gender;
  final String address;
  final int experienceYears;
  final int heightCm;
  final List<String> skills;
  final List<String> certifications;
  final List<String> languages;
  final String employmentType;
  final String verificationStatus;
  final String adminRemarks;
  final String availability;
  final String? leaveUntil;
  final List<String> workDays;
  final List<String> shifts;
  final List<String> preferredAreas;
  final bool active;
  final DateTime? consentAt;

  const Personnel({
    required this.id,
    required this.agencyId,
    this.userId,
    this.source = 'agency',
    this.code = '',
    this.name = '',
    this.phone = '',
    this.photoUrl = '',
    this.dob = '',
    this.gender = '',
    this.address = '',
    this.experienceYears = 0,
    this.heightCm = 0,
    this.skills = const [],
    this.certifications = const [],
    this.languages = const [],
    this.employmentType = '',
    this.verificationStatus = VerificationStatus.draft,
    this.adminRemarks = '',
    this.availability = 'available',
    this.leaveUntil,
    this.workDays = const [],
    this.shifts = const [],
    this.preferredAreas = const [],
    this.active = true,
    this.consentAt,
  });

  bool get isVerified => verificationStatus == VerificationStatus.verified;
  bool get inAgency => agencyId.isNotEmpty;
  bool get canSubmit =>
      VerificationStatus.submittable.contains(verificationStatus);

  /// Identity fields are frozen by the rules once verified.
  bool get identityLocked => isVerified;

  factory Personnel.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return Personnel(
      id: doc.id,
      agencyId: d['agencyId'] ?? '',
      userId: d['userId'],
      source: d['source'] ?? 'agency',
      code: d['code'] ?? '',
      name: d['name'] ?? '',
      phone: d['phone'] ?? '',
      photoUrl: d['photoUrl'] ?? '',
      dob: d['dob'] ?? '',
      gender: d['gender'] ?? '',
      address: d['address'] ?? '',
      experienceYears: _int(d['experienceYears']),
      heightCm: _int(d['heightCm']),
      skills: _list(d['skills']),
      certifications: _list(d['certifications']),
      languages: _list(d['languages']),
      employmentType: d['employmentType'] ?? '',
      verificationStatus: d['verificationStatus'] ?? VerificationStatus.draft,
      adminRemarks: d['adminRemarks'] ?? '',
      availability: d['availability'] ?? 'available',
      leaveUntil: d['leaveUntil'],
      workDays: _list(d['workDays']),
      shifts: _list(d['shifts']),
      preferredAreas: _list(d['preferredAreas']),
      active: d['active'] ?? true,
      consentAt: _date(d['consentAt']),
    );
  }
}

const personnelDocTypes = {
  'identity': 'Identity proof',
  'other': 'Address proof',
  'training': 'Training certificate',
  'background': 'Background check',
};

/// `documents/{id}` owned by a personnel record.
class PersonnelDocument {
  final String id;
  final String agencyId;
  final String type;
  final String name;
  final String fileUrl;
  final String status;
  final String remarks;
  final DateTime? uploadedAt;

  const PersonnelDocument({
    required this.id,
    required this.agencyId,
    required this.type,
    required this.name,
    required this.fileUrl,
    required this.status,
    required this.remarks,
    this.uploadedAt,
  });

  bool get isPdf => fileUrl.toLowerCase().contains('.pdf');

  factory PersonnelDocument.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final d = doc.data() ?? {};
    return PersonnelDocument(
      id: doc.id,
      agencyId: d['agencyId'] ?? '',
      type: d['type'] ?? 'other',
      name: d['name'] ?? '',
      fileUrl: d['fileUrl'] ?? '',
      status: d['status'] ?? 'pending',
      remarks: d['remarks'] ?? '',
      uploadedAt: _date(d['uploadedAt']),
    );
  }
}
