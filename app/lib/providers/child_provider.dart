import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/child.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

// 子ども一覧のプロバイダー
final childrenProvider = FutureProvider<List<Child>>((ref) async {
  final authState = ref.watch(authStateProvider);

  return authState.when(
    data: (user) async {
      if (user == null) return [];

      try {
        final apiService = ref.watch(apiServiceProvider);
        return await apiService.getChildren();
      } catch (e) {
        print('Failed to get children: $e');
        return [];
      }
    },
    loading: () => [],
    error: (_, __) => [],
  );
});

// 選択中の子どものIDを管理
final selectedChildIdProvider = StateProvider<String?>((ref) {
  final children = ref.watch(childrenProvider);
  return children.when(
    data: (list) => list.isNotEmpty ? list.first.id : null,
    loading: () => null,
    error: (_, __) => null,
  );
});

// 選択中の子どもを取得
final selectedChildProvider = Provider<Child?>((ref) {
  final childId = ref.watch(selectedChildIdProvider);
  if (childId == null) return null;

  final children = ref.watch(childrenProvider);
  return children.when(
    data: (list) => list.where((c) => c.id == childId).firstOrNull,
    loading: () => null,
    error: (_, __) => null,
  );
});

// 子ども管理コントローラー
final childControllerProvider =
    StateNotifierProvider<ChildController, AsyncValue<void>>((ref) {
  return ChildController(ref);
});

class ChildController extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  ChildController(this._ref) : super(const AsyncValue.data(null));

  Future<void> createChild({
    required String name,
    String? schoolName,
    int? grade,
    String? className,
    String? color,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final apiService = _ref.read(apiServiceProvider);
      await apiService.createChild(
        name: name,
        schoolName: schoolName,
        grade: grade,
        className: className,
        color: color,
      );
      // 子ども一覧を再取得
      _ref.invalidate(childrenProvider);
    });
  }

  Future<void> updateChild(
    String childId, {
    String? name,
    String? schoolName,
    int? grade,
    String? className,
    String? color,
    int? sortOrder,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final apiService = _ref.read(apiServiceProvider);
      await apiService.updateChild(
        childId,
        name: name,
        schoolName: schoolName,
        grade: grade,
        className: className,
        color: color,
        sortOrder: sortOrder,
      );
      // 子ども一覧を再取得
      _ref.invalidate(childrenProvider);
    });
  }

  Future<void> deleteChild(String childId) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final apiService = _ref.read(apiServiceProvider);
      await apiService.deleteChild(childId);
      // 子ども一覧を再取得
      _ref.invalidate(childrenProvider);
    });
  }
}
