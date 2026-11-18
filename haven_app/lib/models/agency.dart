import 'package:cloud_firestore/cloud_firestore.dart';

int _int(dynamic v) => v is num ? v.toInt() : 0;
double _double(dynamic v) => v is num ? v.toDouble() : 0;

/// Service keys in display order, with their customer-facing labels.
const serviceLabels = <String, String>{
  'vip_squad': 'VIP Squad',
  'bouncers': 'Bouncers',
  'gun_squad': 'Armed Guards',
  'personal_security': 'Personal Security',
  'home_security': 'Home Security',
  'bodyguards': 'Bodyguards',
  'corporate_security': 'Corporate Security',
  'gate_security': 'Gate Security',
};

String serviceLabel(String key) => serviceLabels[key] ?? key;

class AgencyService {
  final String key;
  final bool enabled;
  final String description;
  final double hourlyRate;
  final int minHours;
  final String requirements;
  final List<String> locations;

  const AgencyService({
    required this.key,
    this.enabled = false,
    this.description = '',
    this.hourlyRate = 0,
    this.minHours = 1,
    this.requirements = '',
    this.locations = const [],
  });

  String get label => serviceLabel(key);

  factory AgencyService.fromMap(String key, Map<String, dynamic> d) {
    final min = _int(d['minHours']);
    return AgencyService(
      key: key,
      enabled: d['enabled'] == true,
      description: d['description'] ?? '',
      hourlyRate: _double(d['hourlyRate']),
      minHours: min < 1 ? 1 : min,
      requirements: d['requirements'] ?? '',
      locations: List<String>.from(d['locations'] ?? const []),
    );
  }
}

class Agency {
  final String id;
  final String name;
  final String logoUrl;
  final String description;
  final String city;
  final String address;
  final String phone;
  final String email;
  final int yearsExperience;
  final List<String> areas;
  final String workingHours;
  final Map<String, AgencyService> services;
  final String status;
  final bool verified;
  final double rating;
  final int reviewCount;
  final int personnelCount;

  const Agency({
    required this.id,
    required this.name,
    this.logoUrl = '',
    this.description = '',
    this.city = '',
    this.address = '',
    this.phone = '',
    this.email = '',
    this.yearsExperience = 0,
    this.areas = const [],
    this.workingHours = '',
    this.services = const {},
    this.status = 'pending',
    this.verified = false,
    this.rating = 0,
    this.reviewCount = 0,
    this.personnelCount = 0,
  });

  /// Enabled services in the canonical display order.
  List<AgencyService> get enabledServices => [
    for (final k in serviceLabels.keys)
      if (services[k]?.enabled == true) services[k]!,
  ];

  bool offers(String key) => services[key]?.enabled == true;

  /// Lowest hourly rate across enabled services (0 if none).
  double get fromPrice {
    final rates = enabledServices
        .map((s) => s.hourlyRate)
        .where((r) => r > 0)
        .toList();
    if (rates.isEmpty) return 0;
    return rates.reduce((a, b) => a < b ? a : b);
  }

  bool matches(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return true;
    return name.toLowerCase().contains(q) ||
        city.toLowerCase().contains(q) ||
        areas.any((a) => a.toLowerCase().contains(q));
  }

  factory Agency.fromMap(String id, Map<String, dynamic> d) {
    final raw = d['services'];
    final services = <String, AgencyService>{};
    if (raw is Map) {
      raw.forEach((k, v) {
        if (v is Map) {
          services['$k'] = AgencyService.fromMap(
            '$k',
            Map<String, dynamic>.from(v),
          );
        }
      });
    }
    return Agency(
      id: id,
      name: d['name'] ?? '',
      logoUrl: d['logoUrl'] ?? '',
      description: d['description'] ?? '',
      city: d['city'] ?? '',
      address: d['address'] ?? '',
      phone: d['phone'] ?? '',
      email: d['email'] ?? '',
      yearsExperience: _int(d['yearsExperience']),
      areas: List<String>.from(d['areas'] ?? const []),
      workingHours: d['workingHours'] ?? '',
      services: services,
      status: d['status'] ?? 'pending',
      verified: d['verified'] == true,
      rating: _double(d['rating']),
      reviewCount: _int(d['reviewCount']),
      personnelCount: _int(d['personnelCount']),
    );
  }

  factory Agency.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) =>
      Agency.fromMap(doc.id, doc.data() ?? {});
}
