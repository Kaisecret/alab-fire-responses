import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'widgets/liquid_bottom_nav.dart';
import 'screens/fire_truck_onboarding_screen.dart';
import 'screens/home_dashboard_screen.dart';
import 'screens/incidents_screen.dart';
import 'screens/login_screen.dart';
import 'screens/map_screen.dart';
import 'widgets/map_layer_tabs.dart';
import 'screens/reports_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/change_temporary_password_screen.dart';
import 'services/mobile_bfp_api.dart';
import 'services/mobile_app_launch_store.dart';
import 'services/mobile_bfp_session_store.dart';
import 'services/mobile_dispatch_store.dart';
import 'services/dispatch_notification_service.dart';

typedef StartupSessionRestorer = Future<MobileBfpSession?> Function();
typedef OnboardingStatusReader = Future<bool> Function();

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  await DispatchNotificationService.initialize();
  final notificationSettings = await FirebaseMessaging.instance.requestPermission();
  debugPrint('BFP notification permission: ${notificationSettings.authorizationStatus.name}');

  // Set crisp transparent status bar with dark icons
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const AlabBfpResponderApp());
}

class AlabBfpResponderApp extends StatelessWidget {
  const AlabBfpResponderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ALAB BFP RESPONDER',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const AppStartupScreen(),
    );
  }
}

class AppStartupScreen extends StatefulWidget {
  const AppStartupScreen({
    super.key,
    this.sessionRestorer,
    this.hasCompletedOnboarding,
  });

  final StartupSessionRestorer? sessionRestorer;
  final OnboardingStatusReader? hasCompletedOnboarding;

  @override
  State<AppStartupScreen> createState() => _AppStartupScreenState();
}

class _AppStartupScreenState extends State<AppStartupScreen> {
  Widget? _destination;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    if (widget.sessionRestorer != null) {
      final session = await widget.sessionRestorer!();
      if (session == null) {
        await _showSignedOutDestination();
      } else {
        _showDestination(
          session.mustChangePassword
              ? ChangeTemporaryPasswordScreen(session: session)
              : MainNavigationShell(session: session),
        );
      }
      return;
    }

    final store = MobileBfpSessionStore();
    try {
      final token = await store.readToken();
      if (token == null || token.isEmpty) {
        await _showSignedOutDestination();
        return;
      }

      final session = await MobileBfpApi().restoreSession(token);
      await store.saveSession(session);
      _showDestination(
        session.mustChangePassword
            ? ChangeTemporaryPasswordScreen(session: session)
            : MainNavigationShell(session: session),
      );
    } on MobileBfpApiException catch (error) {
      if (error.statusCode == null || error.statusCode! >= 500) {
        final token = await store.readToken();
        final cached = token == null ? null : await store.readCachedSession(token);
        if (cached != null) {
          _showDestination(MainNavigationShell(session: cached));
          return;
        }
      } else if (error.statusCode == 401 || error.statusCode == 403) {
        await store.clear();
      }
      _showDestination(LoginScreen());
    } catch (_) {
      _showDestination(LoginScreen());
    }
  }

  Future<void> _showSignedOutDestination() async {
    final hasCompletedOnboarding =
        await (widget.hasCompletedOnboarding ??
            MobileAppLaunchStore().hasCompletedOnboarding)();
    _showDestination(
      hasCompletedOnboarding
          ? LoginScreen()
          : const FireTruckOnboardingScreen(),
    );
  }

  void _showDestination(Widget destination) {
    if (mounted) setState(() => _destination = destination);
  }

  @override
  Widget build(BuildContext context) {
    if (_destination != null) return _destination!;
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 220,
                height: 126,
                child: Image.asset(
                  'assets/images/logo_alab.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(
                    Icons.local_fire_department_rounded,
                    color: AppColors.primaryRed,
                    size: 52,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(
                  color: AppColors.primaryRed,
                  strokeWidth: 2.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key, required this.session});

  final MobileBfpSession session;

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentTabIndex = 0;
  int _mapRequestId = 0;
  MapLayerMode _requestedMapMode = MapLayerMode.incidents;
  late MobileBfpSession _session;
  late MobileDispatchStore _dispatchStore;
  StreamSubscription<String>? _tokenRefresh;
  StreamSubscription<RemoteMessage>? _foregroundMessages;

  @override
  void initState() {
    super.initState();
    _session = widget.session;
    _dispatchStore = MobileDispatchStore(api: MobileBfpApi(), session: _session);
    unawaited(_dispatchStore.start());
    if (Firebase.apps.isNotEmpty) {
      unawaited(_registerDevice());
      _tokenRefresh = FirebaseMessaging.instance.onTokenRefresh.listen((token) => _registerDevice(token));
      _foregroundMessages = FirebaseMessaging.onMessage.listen((message) {
        unawaited(DispatchNotificationService.showForegroundMessage(message));
        unawaited(_dispatchStore.refresh());
      });
    }
  }

  Future<void> _registerDevice([String? token]) async {
    final resolvedToken = token ?? await FirebaseMessaging.instance.getToken();
    if (resolvedToken == null || resolvedToken.length < 20) return;
    final installationId = '${_session.identity.userId}-${resolvedToken.substring(0, min(96, resolvedToken.length))}';
    try {
      await MobileBfpApi().registerDevice(token: _session.token, installationId: installationId, fcmToken: resolvedToken);
      debugPrint('BFP device registered for emergency dispatch notifications.');
    } catch (error) {
      debugPrint('BFP device registration failed: $error');
    }
  }

  @override
  void dispose() {
    _tokenRefresh?.cancel();
    _foregroundMessages?.cancel();
    _dispatchStore.dispose();
    super.dispose();
  }

  void _onTabSelected(int index) {
    setState(() {
      if (index == 2 || index == 5) {
        _requestedMapMode = index == 5 ? MapLayerMode.waterSources : MapLayerMode.incidents;
        _mapRequestId++;
        _currentTabIndex = 2;
      } else {
        _currentTabIndex = index;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      extendBody:
          true, // Allows content to float behind liquid glass bottom nav
      body: Stack(
        children: [
          // Background ambient soft warm glows for liquid glass feel
          Positioned(
            top: -60,
            left: -40,
            width: 250,
            height: 250,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFECEB).withValues(alpha: 0.7),
              ),
            ),
          ),
          Positioned(
            top: 280,
            right: -60,
            width: 220,
            height: 220,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF1F5F9).withValues(alpha: 0.6),
              ),
            ),
          ),
          Positioned(
            bottom: 80,
            left: -30,
            width: 200,
            height: 200,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFFFECEB).withValues(alpha: 0.5),
              ),
            ),
          ),

          // Main Screen Pages
          Positioned.fill(
            child: IndexedStack(
              index: _currentTabIndex,
              children: [
                SafeArea(bottom: false, child: HomeDashboardScreen(session: _session, onNavigateTab: _onTabSelected, dispatchStore: _dispatchStore)),
                SafeArea(bottom: false, child: IncidentsScreen(session: _session, dispatchStore: _dispatchStore, onNavigateTab: _onTabSelected)),
                MapScreen(
                  dispatchStore: _dispatchStore,
                  onNavigateTab: _onTabSelected,
                  requestedMode: _requestedMapMode,
                  requestId: _mapRequestId,
                ),
                const SafeArea(bottom: false, child: ReportsScreen()),
                SafeArea(
                  bottom: false,
                  child: ProfileScreen(
                    session: _session,
                    onSessionChanged: (session) =>
                        setState(() => _session = session),
                  ),
                ),
              ],
            ),
          ),

          // Floating Liquid Glass Bottom Navigation Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: LiquidBottomNavBar(
              currentIndex: _currentTabIndex,
              onTap: _onTabSelected,
            ),
          ),
        ],
      ),
    );
  }
}
