import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Shows emergency dispatch messages while the responder app is open.
/// Android displays background notification payloads itself, but foreground
/// messages need an explicit local notification.
class DispatchNotificationService {
  static const _channel = AndroidNotificationChannel(
    'incident_dispatches',
    'Emergency dispatches',
    description: 'Urgent BFP incident assignments',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  static final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await _plugin.initialize(settings);
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);
    _initialized = true;
  }

  static Future<void> showForegroundMessage(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await initialize();
    await _plugin.show(
      message.messageId?.hashCode ?? DateTime.now().microsecondsSinceEpoch.remainder(1 << 31),
      notification.title ?? 'Emergency dispatch assigned',
      notification.body ?? 'Open ALAB BFP for the incident details.',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'incident_dispatches',
          'Emergency dispatches',
          channelDescription: 'Urgent BFP incident assignments',
          importance: Importance.max,
          priority: Priority.max,
          playSound: true,
          enableVibration: true,
        ),
      ),
      payload: message.data['dispatchId'],
    );
  }
}
