import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/user.dart' as app_user;

// AuthServiceのプロバイダー
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

// ApiServiceのプロバイダー
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

// Firebase認証状態のプロバイダー
final authStateProvider = StreamProvider<User?>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.authStateChanges;
});

// アプリユーザー情報のプロバイダー
final appUserProvider = FutureProvider<app_user.User?>((ref) async {
  final authState = ref.watch(authStateProvider);

  return authState.when(
    data: (user) async {
      if (user == null) return null;

      try {
        final apiService = ref.watch(apiServiceProvider);
        return await apiService.getUserMe();
      } catch (e) {
        print('Failed to get user data: $e');
        return null;
      }
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

// ログイン処理を管理するプロバイダー
final loginControllerProvider =
    StateNotifierProvider<LoginController, AsyncValue<void>>((ref) {
  return LoginController(ref);
});

class LoginController extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  LoginController(this._ref) : super(const AsyncValue.data(null));

  Future<void> signInWithEmail(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authService = _ref.read(authServiceProvider);
      await authService.signInWithEmail(email: email, password: password);
    });
  }

  Future<void> signInWithGoogle() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authService = _ref.read(authServiceProvider);
      await authService.signInWithGoogle();
    });
  }

  Future<void> signInWithApple() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authService = _ref.read(authServiceProvider);
      await authService.signInWithApple();
    });
  }

  Future<void> signOut() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authService = _ref.read(authServiceProvider);
      await authService.signOut();
    });
  }
}

// 登録処理を管理するプロバイダー
final registerControllerProvider =
    StateNotifierProvider<RegisterController, AsyncValue<void>>((ref) {
  return RegisterController(ref);
});

class RegisterController extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  RegisterController(this._ref) : super(const AsyncValue.data(null));

  Future<void> registerWithEmail(String email, String password,
      {String? displayName}) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authService = _ref.read(authServiceProvider);
      final apiService = _ref.read(apiServiceProvider);

      // Firebaseに登録
      await authService.registerWithEmail(email: email, password: password);

      // バックエンドにユーザー登録
      await apiService.register(displayName: displayName);
    });
  }

  Future<void> registerWithGoogle() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authService = _ref.read(authServiceProvider);
      final apiService = _ref.read(apiServiceProvider);

      // Googleサインイン
      final userCredential = await authService.signInWithGoogle();

      // 新規ユーザーの場合のみバックエンドに登録
      if (userCredential.additionalUserInfo?.isNewUser == true) {
        await apiService.register(
          displayName: userCredential.user?.displayName,
        );
      }
    });
  }

  Future<void> registerWithApple() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final authService = _ref.read(authServiceProvider);
      final apiService = _ref.read(apiServiceProvider);

      // Apple Sign-In
      final userCredential = await authService.signInWithApple();

      // 新規ユーザーの場合のみバックエンドに登録
      if (userCredential.additionalUserInfo?.isNewUser == true) {
        await apiService.register(
          displayName: userCredential.user?.displayName,
        );
      }
    });
  }
}
