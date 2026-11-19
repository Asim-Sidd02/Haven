import 'dart:convert';

import 'package:file_picker/file_picker.dart';
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
  Future<String?> pickAndUploadAvatar(String uid) =>
      pickAndUploadImage('haven/users/$uid');

  /// Picks a photo from the gallery and uploads it into [folder].
  Future<String?> pickAndUploadImage(String folder) async {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 900,
      imageQuality: 80,
    );
    if (file == null) return null;
    return _upload(
      kind: 'image',
      folder: folder,
      file: await http.MultipartFile.fromPath('file', file.path),
    );
  }

  /// Picks a document (PDF or image) and uploads it into [folder] using
  /// Cloudinary's `auto` resource type so PDFs are accepted.
  Future<String?> pickAndUploadDocument(String folder) async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png'],
    );
    if (files.isEmpty) return null;
    final f = files.first;
    final bytes = await f.xFile.readAsBytes();
    return _upload(
      kind: 'auto',
      folder: folder,
      file: http.MultipartFile.fromBytes('file', bytes, filename: f.name),
    );
  }

  Future<String> _upload({
    required String kind,
    required String folder,
    required http.MultipartFile file,
  }) async {
    if (cloudinaryCloudName.isEmpty || cloudinaryUploadPreset.isEmpty) {
      throw Exception('Uploads are not configured (Cloudinary settings missing).');
    }
    final req = http.MultipartRequest(
      'POST',
      Uri.parse('https://api.cloudinary.com/v1_1/$cloudinaryCloudName/$kind/upload'),
    )
      ..fields['upload_preset'] = cloudinaryUploadPreset
      ..fields['folder'] = folder
      ..files.add(file);
    final res = await http.Response.fromStream(await req.send());
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw Exception('Upload failed: ${body['error']?['message'] ?? res.statusCode}');
    }
    return body['secure_url'] as String;
  }
}
