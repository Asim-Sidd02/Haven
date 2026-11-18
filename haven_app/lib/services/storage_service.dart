import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

/// Cloudinary settings. Fill these in from cloudinary.com:
/// Dashboard → Cloud name, and Settings → Upload → an *unsigned* upload preset.
const cloudinaryCloudName = 'b6uzhvxr';
const cloudinaryUploadPreset = 'haven';

class StorageService {
  final _picker = ImagePicker();

  /// Lets the user pick a photo and uploads it as their avatar.
  /// Returns the image URL, or null if cancelled.
  Future<String?> pickAndUploadAvatar(String uid) async {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 900,
      imageQuality: 80,
    );
    if (file == null) return null;
    if (cloudinaryCloudName.isEmpty || cloudinaryUploadPreset.isEmpty) {
      throw Exception('Uploads are not configured (Cloudinary settings missing).');
    }
    final req = http.MultipartRequest(
      'POST',
      Uri.parse('https://api.cloudinary.com/v1_1/$cloudinaryCloudName/image/upload'),
    )
      ..fields['upload_preset'] = cloudinaryUploadPreset
      ..fields['folder'] = 'haven/users/$uid'
      ..files.add(await http.MultipartFile.fromPath('file', file.path));
    final res = await http.Response.fromStream(await req.send());
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw Exception('Upload failed: ${body['error']?['message'] ?? res.statusCode}');
    }
    return body['secure_url'] as String;
  }
}
