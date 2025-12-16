import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../config/constants.dart';
import '../models/user.dart' as app_user;
import '../models/child.dart';
import '../models/timetable.dart';
import '../models/item.dart';
import '../models/event.dart';
import '../models/print_doc.dart';

class ApiService {
  final Dio _dio;
  final FirebaseAuth _auth;

  ApiService({Dio? dio, FirebaseAuth? auth})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: Constants.apiBaseUrl)),
        _auth = auth ?? FirebaseAuth.instance {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Firebase ID Tokenを取得してAuthorizationヘッダーに追加
        final user = _auth.currentUser;
        if (user != null) {
          final token = await user.getIdToken();
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        print('API Error: ${error.response?.statusCode} - ${error.message}');
        return handler.next(error);
      },
    ));
  }

  // ========== 認証 ==========

  Future<app_user.User> register({String? displayName}) async {
    final response = await _dio.post('/api/auth/register', data: {
      if (displayName != null) 'display_name': displayName,
    });
    return app_user.User.fromJson(response.data['data']);
  }

  // ========== ユーザー ==========

  Future<app_user.User> getUserMe() async {
    final response = await _dio.get('/api/users/me');
    return app_user.User.fromJson(response.data['data']);
  }

  Future<app_user.User> updateUser({String? displayName}) async {
    final response = await _dio.put('/api/users/me', data: {
      if (displayName != null) 'display_name': displayName,
    });
    return app_user.User.fromJson(response.data['data']);
  }

  // ========== 子ども ==========

  Future<List<Child>> getChildren() async {
    final response = await _dio.get('/api/children');
    final children = (response.data['data']['children'] as List)
        .map((json) => Child.fromJson(json))
        .toList();
    return children;
  }

  Future<Child> createChild({
    required String name,
    String? schoolName,
    int? grade,
    String? className,
    String? color,
  }) async {
    final response = await _dio.post('/api/children', data: {
      'name': name,
      if (schoolName != null) 'school_name': schoolName,
      if (grade != null) 'grade': grade,
      if (className != null) 'class_name': className,
      if (color != null) 'color': color,
    });
    return Child.fromJson(response.data['data']);
  }

  Future<Child> updateChild(
    String childId, {
    String? name,
    String? schoolName,
    int? grade,
    String? className,
    String? color,
    int? sortOrder,
  }) async {
    final response = await _dio.put('/api/children/$childId', data: {
      if (name != null) 'name': name,
      if (schoolName != null) 'school_name': schoolName,
      if (grade != null) 'grade': grade,
      if (className != null) 'class_name': className,
      if (color != null) 'color': color,
      if (sortOrder != null) 'sort_order': sortOrder,
    });
    return Child.fromJson(response.data['data']);
  }

  Future<void> deleteChild(String childId) async {
    await _dio.delete('/api/children/$childId');
  }

  // ========== 時間割 ==========

  Future<List<Timetable>> getTimetable(String childId) async {
    final response = await _dio.get('/api/children/$childId/timetable');
    final timetable = (response.data['data']['timetable'] as List)
        .map((json) => Timetable.fromJson(json))
        .toList();
    return timetable;
  }

  Future<void> updateTimetable(
    String childId,
    List<Map<String, dynamic>> timetable,
  ) async {
    await _dio.put('/api/children/$childId/timetable', data: {
      'timetable': timetable,
    });
  }

  // ========== 持ち物 ==========

  Future<List<Item>> getItems(
    String childId, {
    String? date,
    String? startDate,
    String? endDate,
  }) async {
    final response = await _dio.get('/api/children/$childId/items', queryParameters: {
      if (date != null) 'date': date,
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
    });
    final items = (response.data['data']['items'] as List)
        .map((json) => Item.fromJson(json))
        .toList();
    return items;
  }

  Future<Item> createItem({
    required String childId,
    required String date,
    required String name,
    String? notes,
  }) async {
    final response = await _dio.post('/api/items', data: {
      'child_id': childId,
      'date': date,
      'name': name,
      if (notes != null) 'notes': notes,
    });
    return Item.fromJson(response.data['data']);
  }

  Future<Item> updateItem(
    String itemId, {
    String? name,
    bool? isChecked,
    String? notes,
  }) async {
    final response = await _dio.put('/api/items/$itemId', data: {
      if (name != null) 'name': name,
      if (isChecked != null) 'is_checked': isChecked,
      if (notes != null) 'notes': notes,
    });
    return Item.fromJson(response.data['data']);
  }

  Future<void> deleteItem(String itemId) async {
    await _dio.delete('/api/items/$itemId');
  }

  // ========== 行事 ==========

  Future<List<Event>> getEvents(
    String childId, {
    String? startDate,
    String? endDate,
  }) async {
    final response = await _dio.get('/api/children/$childId/events', queryParameters: {
      if (startDate != null) 'start_date': startDate,
      if (endDate != null) 'end_date': endDate,
    });
    final events = (response.data['data']['events'] as List)
        .map((json) => Event.fromJson(json))
        .toList();
    return events;
  }

  Future<Event> createEvent({
    required String childId,
    required String title,
    required String date,
    String? endDate,
    String? eventType,
    String? description,
    bool? isAllDay,
    String? startTime,
    String? endTime,
  }) async {
    final response = await _dio.post('/api/events', data: {
      'child_id': childId,
      'title': title,
      'date': date,
      if (endDate != null) 'end_date': endDate,
      if (eventType != null) 'event_type': eventType,
      if (description != null) 'description': description,
      if (isAllDay != null) 'is_all_day': isAllDay,
      if (startTime != null) 'start_time': startTime,
      if (endTime != null) 'end_time': endTime,
    });
    return Event.fromJson(response.data['data']);
  }

  Future<Event> updateEvent(
    String eventId, {
    String? title,
    String? date,
    String? endDate,
    String? eventType,
    String? description,
    bool? isAllDay,
    String? startTime,
    String? endTime,
  }) async {
    final response = await _dio.put('/api/events/$eventId', data: {
      if (title != null) 'title': title,
      if (date != null) 'date': date,
      if (endDate != null) 'end_date': endDate,
      if (eventType != null) 'event_type': eventType,
      if (description != null) 'description': description,
      if (isAllDay != null) 'is_all_day': isAllDay,
      if (startTime != null) 'start_time': startTime,
      if (endTime != null) 'end_time': endTime,
    });
    return Event.fromJson(response.data['data']);
  }

  Future<void> deleteEvent(String eventId) async {
    await _dio.delete('/api/events/$eventId');
  }

  // ========== プリント ==========

  Future<List<PrintDoc>> getPrints(
    String childId, {
    String? category,
    bool? isArchived,
  }) async {
    final response = await _dio.get('/api/children/$childId/prints', queryParameters: {
      if (category != null) 'category': category,
      if (isArchived != null) 'is_archived': isArchived ? '1' : '0',
    });
    final prints = (response.data['data']['prints'] as List)
        .map((json) => PrintDoc.fromJson(json))
        .toList();
    return prints;
  }

  Future<PrintDoc> createPrint({
    required String childId,
    required String title,
    required String category,
    required String imageUrl,
    String? thumbnailUrl,
    String? capturedAt,
    String? deadline,
    String? notes,
  }) async {
    final response = await _dio.post('/api/prints', data: {
      'child_id': childId,
      'title': title,
      'category': category,
      'image_url': imageUrl,
      if (thumbnailUrl != null) 'thumbnail_url': thumbnailUrl,
      if (capturedAt != null) 'captured_at': capturedAt,
      if (deadline != null) 'deadline': deadline,
      if (notes != null) 'notes': notes,
    });
    return PrintDoc.fromJson(response.data['data']);
  }

  Future<PrintDoc> updatePrint(
    String printId, {
    String? title,
    String? category,
    String? deadline,
    bool? isArchived,
    String? notes,
  }) async {
    final response = await _dio.put('/api/prints/$printId', data: {
      if (title != null) 'title': title,
      if (category != null) 'category': category,
      if (deadline != null) 'deadline': deadline,
      if (isArchived != null) 'is_archived': isArchived,
      if (notes != null) 'notes': notes,
    });
    return PrintDoc.fromJson(response.data['data']);
  }

  Future<void> deletePrint(String printId) async {
    await _dio.delete('/api/prints/$printId');
  }

  // ========== 画像アップロード ==========

  Future<Map<String, String>> uploadImage(String filePath) async {
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(filePath),
    });

    final response = await _dio.post('/api/upload/image', data: formData);
    return {
      'image_url': response.data['data']['image_url'] as String,
      'thumbnail_url': response.data['data']['thumbnail_url'] as String,
    };
  }
}
