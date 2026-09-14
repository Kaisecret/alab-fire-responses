import 'package:shared_preferences/shared_preferences.dart';

class MobileAppLaunchStore {
  static const _onboardingCompleteKey = 'alab_bfp_onboarding_complete';

  Future<bool> hasCompletedOnboarding() async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getBool(_onboardingCompleteKey) ?? false;
  }

  Future<void> markOnboardingComplete() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_onboardingCompleteKey, true);
  }
}
