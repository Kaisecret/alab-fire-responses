import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';

import 'mobile_bfp_api.dart';
import 'road_routing_service.dart';

class MobileDispatchStore extends ChangeNotifier {
  MobileDispatchStore({required this.api, required this.session});

  final MobileBfpApi api;
  final MobileBfpSession session;
  final RoadRoutingService _routingService = RoadRoutingService();

  List<MobileDispatchAssignment> _assignments = const [];
  List<MobileDispatchAssignment> _resolvedAssignments = const [];
  String? _selectedDispatchId;
  bool _isLoading = true;
  String? _error;
  Timer? _timer;

  int _resolvedCount = 0;
  RoadRouteOption? _activeRoadRoute;
  bool _isComputingRoute = false;

  List<MobileDispatchAssignment> get assignments => _assignments;
  List<MobileDispatchAssignment> get resolvedAssignments => _resolvedAssignments;
  String? get selectedDispatchId => _selectedDispatchId;
  int get resolvedCount => _resolvedCount;
  RoadRouteOption? get activeRoadRoute => _activeRoadRoute;

  MobileDispatchAssignment? get activeAssignment {
    if (_assignments.isEmpty) return null;
    if (_selectedDispatchId != null) {
      final match = _assignments.where((a) => a.dispatchId == _selectedDispatchId);
      if (match.isNotEmpty) return match.first;
    }
    return _assignments.first;
  }

  void setActiveRoadRoute(RoadRouteOption? route) {
    _activeRoadRoute = route;
    notifyListeners();
  }

  void selectDispatch(String dispatchId) {
    _selectedDispatchId = dispatchId;
    _activeRoadRoute = null;
    notifyListeners();
    unawaited(updateRoadRoute());
  }

  Future<void> updateRoadRoute({LatLng? responderPosition}) async {
    final assignment = activeAssignment;
    if (assignment == null) {
      _activeRoadRoute = null;
      notifyListeners();
      return;
    }

    if (_isComputingRoute) return;
    _isComputingRoute = true;

    try {
      final origin = responderPosition;
      if (origin == null) return;

      final destination = LatLng(assignment.latitude, assignment.longitude);
      final routes = await _routingService.fetchRoadRoutes(
        from: origin,
        to: destination,
      );

      if (routes.isNotEmpty) {
        _activeRoadRoute = routes.first;
        notifyListeners();
      }
    } catch (_) {
    } finally {
      _isComputingRoute = false;
    }
  }

  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> start() async {
    await refresh();
    _timer ??= Timer.periodic(const Duration(seconds: 5), (_) => refresh());
  }

  Future<void> refresh() async {
    try {
      final payload = await api.fetchDispatchesPayload(session.token);
      _assignments = payload['assignments'] as List<MobileDispatchAssignment>;
      _resolvedCount = payload['resolvedCount'] as int? ?? 0;
      _error = null;
      if (_activeRoadRoute == null) {
        unawaited(updateRoadRoute());
      }
    } on MobileBfpApiException catch (error) {
      _error = error.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<MobileDispatchAssignment>> fetchResolvedAssignments() async {
    try {
      final list = await api.listResolvedAssignments(session.token);
      _resolvedAssignments = list;
      _resolvedCount = list.length;
      notifyListeners();
      return list;
    } catch (_) {
      return _resolvedAssignments;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
