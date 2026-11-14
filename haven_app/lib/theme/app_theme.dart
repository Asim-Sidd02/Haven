import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Haven palette — calm, grounded, reassuring.
/// Sage = safety & calm, Sand = warmth & care, Cream = softness.
class HavenColors {
  static const sage = Color(0xFF5B7B6F);
  static const sageDark = Color(0xFF3F5A50);
  static const sageSoft = Color(0xFFE6EDE9);
  static const sand = Color(0xFFC9A98C);
  static const sandSoft = Color(0xFFF4ECE4);
  static const cream = Color(0xFFF7F5F2);
  static const surface = Colors.white;
  static const ink = Color(0xFF2F3A36);
  static const muted = Color(0xFF7A847F);
  static const border = Color(0xFFE4E1DC);

  static const pending = Color(0xFFB8923A);
  static const accepted = sage;
  static const declined = Color(0xFFB5726B);
  static const completed = Color(0xFF5E7891);
}

class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: HavenColors.sage,
        primary: HavenColors.sage,
        secondary: HavenColors.sand,
        surface: HavenColors.surface,
        error: HavenColors.declined,
      ),
      scaffoldBackgroundColor: HavenColors.cream,
    );
    final text = GoogleFonts.nunitoSansTextTheme(base.textTheme).apply(
      bodyColor: HavenColors.ink,
      displayColor: HavenColors.ink,
    );
    final radius = BorderRadius.circular(16);

    return base.copyWith(
      textTheme: text.copyWith(
        headlineMedium: GoogleFonts.lora(
            fontSize: 28, fontWeight: FontWeight.w600, color: HavenColors.ink),
        headlineSmall: GoogleFonts.lora(
            fontSize: 22, fontWeight: FontWeight.w600, color: HavenColors.ink),
        titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: HavenColors.cream,
        foregroundColor: HavenColors.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.lora(
            fontSize: 20, fontWeight: FontWeight.w600, color: HavenColors.ink),
      ),
      cardTheme: CardThemeData(
        color: HavenColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: const BorderSide(color: HavenColors.border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: HavenColors.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(color: HavenColors.border)),
        enabledBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(color: HavenColors.border)),
        focusedBorder: OutlineInputBorder(
            borderRadius: radius,
            borderSide: const BorderSide(color: HavenColors.sage, width: 1.5)),
        labelStyle: const TextStyle(color: HavenColors.muted),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: HavenColors.sage,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle:
              const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: HavenColors.sageDark,
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: HavenColors.border),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle:
              const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: HavenColors.surface,
        selectedColor: HavenColors.sageSoft,
        side: const BorderSide(color: HavenColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        labelStyle: const TextStyle(color: HavenColors.ink),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: HavenColors.surface,
        indicatorColor: HavenColors.sageSoft,
        elevation: 0,
        labelTextStyle: WidgetStateProperty.all(
            const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: HavenColors.sageDark,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      dividerTheme: const DividerThemeData(color: HavenColors.border),
    );
  }
}
