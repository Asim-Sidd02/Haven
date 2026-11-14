import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Haven palette — calm, grounded, reassuring.
/// Sage = safety & calm, Sand = warmth & care, Cream = softness.
class HavenColors {
  static const sage = Color(0xFF5B7B6F);
  static const sageDark = Color(0xFF3F5A50);
  static const sageDeep = Color(0xFF2E443C);
  static const sageSoft = Color(0xFFE6EDE9);
  static const sand = Color(0xFFC9A98C);
  static const sandLight = Color(0xFFD2B496);
  static const sandSoft = Color(0xFFF4ECE4);
  static const cream = Color(0xFFF7F5F2);
  static const surface = Colors.white;
  static const ink = Color(0xFF2F3A36);
  static const muted = Color(0xFF7A847F);
  static const faint = Color(0xFFB4BBB7);
  static const border = Color(0xFFE4E1DC);

  static const pending = Color(0xFFB8923A);
  static const accepted = sage;
  static const declined = Color(0xFFB5726B);
  static const completed = Color(0xFF5E7891);

  /// Very soft elevation used on cards and floating elements.
  static List<BoxShadow> get softShadow => [
        BoxShadow(
            color: ink.withValues(alpha: 0.04),
            blurRadius: 2,
            offset: const Offset(0, 1)),
        BoxShadow(
            color: ink.withValues(alpha: 0.08),
            blurRadius: 24,
            spreadRadius: -12,
            offset: const Offset(0, 12)),
      ];
}

/// Spacing scale (8pt grid).
class Gap {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xxl = 28.0;
  static const page = 20.0;
}

class AppTheme {
  /// [useGoogleFonts] is turned off in widget tests, where network fonts
  /// are unavailable; the theme then uses the font families supplied there.
  static ThemeData light({bool useGoogleFonts = true}) {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: HavenColors.sage,
        primary: HavenColors.sage,
        onPrimary: Colors.white,
        secondary: HavenColors.sand,
        surface: HavenColors.surface,
        onSurface: HavenColors.ink,
        error: HavenColors.declined,
        outline: HavenColors.border,
      ),
      scaffoldBackgroundColor: HavenColors.cream,
      splashFactory: InkSparkle.splashFactory,
    );

    TextStyle serif(double size, {FontWeight weight = FontWeight.w600}) =>
        useGoogleFonts
            ? GoogleFonts.lora(
                fontSize: size,
                fontWeight: weight,
                color: HavenColors.ink,
                height: 1.2)
            : TextStyle(
                fontFamily: 'Lora',
                fontSize: size,
                fontWeight: weight,
                color: HavenColors.ink,
                height: 1.2);

    final body = (useGoogleFonts
            ? GoogleFonts.nunitoSansTextTheme(base.textTheme)
            : base.textTheme.apply(fontFamily: 'NunitoSans'))
        .apply(bodyColor: HavenColors.ink, displayColor: HavenColors.ink);

    final text = body.copyWith(
      displaySmall: serif(34),
      headlineMedium: serif(28),
      headlineSmall: serif(23),
      titleLarge: body.titleLarge
          ?.copyWith(fontSize: 19, fontWeight: FontWeight.w700),
      titleMedium: body.titleMedium
          ?.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
      titleSmall:
          body.titleSmall?.copyWith(fontSize: 14, fontWeight: FontWeight.w700),
      bodyLarge: body.bodyLarge?.copyWith(fontSize: 16, height: 1.5),
      bodyMedium: body.bodyMedium?.copyWith(fontSize: 14.5, height: 1.45),
      bodySmall: body.bodySmall
          ?.copyWith(fontSize: 12.5, color: HavenColors.muted, height: 1.4),
      labelLarge:
          body.labelLarge?.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
      labelSmall: body.labelSmall?.copyWith(
          fontSize: 11,
          letterSpacing: 1.2,
          fontWeight: FontWeight.w700,
          color: HavenColors.muted),
    );

    final r16 = BorderRadius.circular(16);
    OutlineInputBorder border(Color c, [double w = 1]) =>
        OutlineInputBorder(borderRadius: r16, borderSide: BorderSide(color: c, width: w));

    return base.copyWith(
      textTheme: text,
      pageTransitionsTheme: const PageTransitionsTheme(builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      }),
      appBarTheme: AppBarTheme(
        backgroundColor: HavenColors.cream,
        surfaceTintColor: Colors.transparent,
        foregroundColor: HavenColors.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleSpacing: 4,
        titleTextStyle: serif(21),
        iconTheme: const IconThemeData(color: HavenColors.ink, size: 22),
      ),
      cardTheme: CardThemeData(
        color: HavenColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: HavenColors.border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: HavenColors.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        border: border(HavenColors.border),
        enabledBorder: border(HavenColors.border),
        focusedBorder: border(HavenColors.sage, 1.6),
        errorBorder: border(HavenColors.declined),
        focusedErrorBorder: border(HavenColors.declined, 1.6),
        labelStyle: const TextStyle(color: HavenColors.muted),
        hintStyle: const TextStyle(color: HavenColors.faint),
        prefixIconColor: HavenColors.muted,
        suffixIconColor: HavenColors.muted,
        errorStyle: const TextStyle(color: HavenColors.declined, fontSize: 12),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: HavenColors.sage,
          foregroundColor: Colors.white,
          disabledBackgroundColor: HavenColors.sage.withValues(alpha: 0.45),
          disabledForegroundColor: Colors.white,
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(borderRadius: r16),
          textStyle: text.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: HavenColors.sageDark,
          backgroundColor: HavenColors.surface,
          minimumSize: const Size.fromHeight(54),
          side: const BorderSide(color: HavenColors.border),
          shape: RoundedRectangleBorder(borderRadius: r16),
          textStyle: text.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: HavenColors.sageDark,
          textStyle:
              const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: HavenColors.surface,
        selectedColor: HavenColors.sageDark,
        checkmarkColor: Colors.white,
        showCheckmark: false,
        side: const BorderSide(color: HavenColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        labelStyle: const TextStyle(
            color: HavenColors.ink, fontWeight: FontWeight.w600, fontSize: 13),
        secondaryLabelStyle: const TextStyle(
            color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: HavenColors.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: HavenColors.sageSoft,
        height: 68,
        elevation: 0,
        iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(
            size: 23,
            color: s.contains(WidgetState.selected)
                ? HavenColors.sageDark
                : HavenColors.muted)),
        labelTextStyle: WidgetStateProperty.resolveWith((s) => TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: s.contains(WidgetState.selected)
                ? HavenColors.sageDark
                : HavenColors.muted)),
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: HavenColors.sageDark,
        unselectedLabelColor: HavenColors.muted,
        indicatorColor: HavenColors.sage,
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: HavenColors.border,
        labelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        unselectedLabelStyle:
            TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: HavenColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        titleTextStyle: serif(21),
        contentTextStyle: text.bodyMedium?.copyWith(color: HavenColors.muted),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: HavenColors.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        dragHandleColor: HavenColors.border,
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: HavenColors.sageDeep,
        contentTextStyle:
            const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.all(Colors.white),
        trackColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected)
                ? HavenColors.sage
                : HavenColors.border),
        trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
      ),
      dividerTheme: const DividerThemeData(color: HavenColors.border, space: 1),
      listTileTheme: const ListTileThemeData(
        iconColor: HavenColors.sage,
        titleTextStyle: TextStyle(
            color: HavenColors.ink, fontWeight: FontWeight.w600, fontSize: 15),
        subtitleTextStyle: TextStyle(color: HavenColors.muted, fontSize: 13),
      ),
      progressIndicatorTheme:
          const ProgressIndicatorThemeData(color: HavenColors.sage),
      datePickerTheme: DatePickerThemeData(
        backgroundColor: HavenColors.surface,
        surfaceTintColor: Colors.transparent,
        headerBackgroundColor: HavenColors.sage,
        headerForegroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      ),
      timePickerTheme: TimePickerThemeData(
        backgroundColor: HavenColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      ),
    );
  }
}
