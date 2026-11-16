import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../models/app_user.dart';
import '../services/auth_service.dart';
import '../services/db_service.dart';

enum SessionState { loading, signedOut, signedIn }

/// Holds the signed-in user's profile and app-wide settings.
class Session extends ChangeNotifier {
  final AuthService auth;
  StreamSubscription<User?>? _authSub;
  StreamSubscription<AppUser?>? _userSub;

  SessionState state = SessionState.loading;
  AppUser? user;
  String currency = 'USD';
  String supportEmail = '';
  String supportPhone = '';

  Session(this.auth) {
    _authSub = auth.authChanges().listen(_onAuth);
  }

  /// A signed-in session with a fixed user and no Firebase listeners.
  /// Used by previews and widget tests.
  Session.preview(this.auth, AppUser previewUser, {this.currency = 'USD'}) {
    user = previewUser;
    state = SessionState.signedIn;
  }

  void _onAuth(User? fbUser) {
    _userSub?.cancel();
    if (fbUser == null) {
      user = null;
      state = SessionState.signedOut;
      notifyListeners();
      return;
    }
    state = SessionState.loading;
    notifyListeners();
    _loadSettings();
    _userSub = DbService.instance
        .userStream(fbUser.uid)
        .listen(
          (u) {
            user = u;
            state = SessionState.signedIn;
            notifyListeners();
          },
          onError: (_) {
            user = null;
            state = SessionState.signedIn;
            notifyListeners();
          },
        );
  }

  Future<void> _loadSettings() async {
    final s = await DbService.instance.appSettings();
    currency = (s['currency'] as String?)?.trim().isNotEmpty == true
        ? s['currency']
        : 'USD';
    supportEmail = s['supportEmail'] ?? '';
    supportPhone = s['supportPhone'] ?? '';
    notifyListeners();
  }

  String money(num v) =>
      '$currency ${v % 1 == 0 ? v.toInt() : v.toStringAsFixed(2)}';

  @override
  void dispose() {
    _authSub?.cancel();
    _userSub?.cancel();
    super.dispose();
  }
}
