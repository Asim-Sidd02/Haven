import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/personnel.dart';
import '../../services/bouncer_service.dart';
import '../../services/storage_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';
import 'bouncer_widgets.dart';

/// Standalone documents page (from the profile tab).
class DocumentsScreen extends StatelessWidget {
  final Personnel personnel;
  const DocumentsScreen({super.key, required this.personnel});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [DocumentsSection(personnel: personnel)],
      ),
    );
  }
}

/// Upload / preview / replace the bouncer's documents. Used in the
/// enrolment wizard and on the documents page.
class DocumentsSection extends StatefulWidget {
  final Personnel personnel;
  const DocumentsSection({super.key, required this.personnel});
  @override
  State<DocumentsSection> createState() => _DocumentsSectionState();
}

class _DocumentsSectionState extends State<DocumentsSection> {
  late final Stream<List<PersonnelDocument>> _docs = BouncerService.instance
      .documents(widget.personnel.id);
  String? _busyType;

  Future<String?> _pickUpload() => StorageService().pickAndUploadDocument(
    'haven/personnel/${widget.personnel.id}',
  );

  Future<void> _add(String type) async {
    setState(() => _busyType = type);
    await runAction(context, () async {
      final url = await _pickUpload();
      if (url == null) return;
      await BouncerService.instance.addDocument(
        widget.personnel,
        type: type,
        name: personnelDocTypes[type] ?? 'Document',
        fileUrl: url,
      );
    });
    if (mounted) setState(() => _busyType = null);
  }

  Future<void> _replace(PersonnelDocument d) async {
    setState(() => _busyType = d.id);
    await runAction(context, () async {
      final url = await _pickUpload();
      if (url == null) return;
      await BouncerService.instance.replaceDocument(
        widget.personnel,
        d,
        fileUrl: url,
      );
    }, done: null);
    if (mounted) setState(() => _busyType = null);
  }

  Future<void> _delete(PersonnelDocument d) async {
    final ok = await confirmDialog(
      context,
      title: 'Remove this document?',
      message: 'You can upload it again later.',
      confirm: 'Remove',
      destructive: true,
    );
    if (ok && mounted) {
      await runAction(context, () => BouncerService.instance.deleteDocument(d));
    }
  }

  Future<void> _preview(PersonnelDocument d) async {
    if (d.isPdf) {
      final ok = await launchUrl(
        Uri.parse(d.fileUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!ok && mounted) showMessage(context, 'Couldn\'t open this file.');
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (c) => Dialog(
        clipBehavior: Clip.antiAlias,
        child: InteractiveViewer(child: Image.network(d.fileUrl)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<PersonnelDocument>>(
      stream: _docs,
      builder: (context, snap) {
        if (snap.hasError) {
          debugPrint('documents: ${snap.error}');
          return const EmptyState(
            icon: Icons.cloud_off_outlined,
            title: 'We couldn\'t load your documents',
            message: 'Please check your connection and try again.',
          );
        }
        if (!snap.hasData) return const SkeletonList(count: 2, height: 80);
        final docs = snap.data!;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SoftBanner(
              icon: Icons.info_outline,
              text:
                  'Upload clear photos or PDFs. An identity proof is required to submit your profile.',
            ),
            const SizedBox(height: 14),
            for (final type in personnelDocTypes.keys) ...[
              SectionTitle(
                '${personnelDocTypes[type]}${type == 'identity' ? ' *' : ''}',
                actionLabel: _busyType == type ? 'Uploading…' : 'Upload',
                onAction: _busyType == null ? () => _add(type) : null,
              ),
              ...docs.where((d) => d.type == type).map(_tile),
              if (!docs.any((d) => d.type == type))
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    'Nothing uploaded yet.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              const SizedBox(height: 6),
            ],
          ],
        );
      },
    );
  }

  Widget _tile(PersonnelDocument d) {
    final needsFix =
        d.status == 'rejected' ||
        d.status == 'needs_correction' ||
        d.status == 'expired';
    final (String label, Color color) = switch (d.status) {
      'verified' => ('Verified', HavenColors.accepted),
      'pending' => ('In review', HavenColors.pending),
      'needs_correction' => ('Needs correction', HavenColors.declined),
      'rejected' => ('Rejected', HavenColors.declined),
      'expired' => ('Expired', HavenColors.declined),
      _ => (d.status, HavenColors.muted),
    };
    final busy = _busyType == d.id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Surface(
        onTap: () => _preview(d),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconBadge(
                  d.isPdf
                      ? Icons.picture_as_pdf_outlined
                      : Icons.image_outlined,
                  size: 36,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        d.name,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      if (d.uploadedAt != null)
                        Text(
                          'Uploaded ${DateFormat('d MMM yyyy').format(d.uploadedAt!)}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
                Pill(label, color: color),
              ],
            ),
            if (d.remarks.isNotEmpty) ...[
              const SizedBox(height: 10),
              SoftBanner(
                icon: Icons.chat_bubble_outline,
                color: needsFix ? HavenColors.declined : HavenColors.sage,
                text: 'Reviewer: ${d.remarks}',
              ),
            ],
            if (d.status != 'verified') ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: busy
                        ? const Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : (needsFix
                              ? PrimaryButton(
                                  label: 'Replace file',
                                  icon: Icons.upload_file,
                                  onPressed: _busyType == null
                                      ? () => _replace(d)
                                      : null,
                                )
                              : SecondaryButton(
                                  label: 'Replace',
                                  icon: Icons.upload_file,
                                  onPressed: _busyType == null
                                      ? () => _replace(d)
                                      : null,
                                )),
                  ),
                  IconButton(
                    tooltip: 'Remove',
                    onPressed: () => _delete(d),
                    icon: const Icon(
                      Icons.delete_outline,
                      color: HavenColors.declined,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
