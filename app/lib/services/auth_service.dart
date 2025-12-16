import 'package:firebase_auth/firebase_auth.dart';
// import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'dart:io' show Platform;

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  // final GoogleSignIn _googleSignIn = GoogleSignIn();

  // 現在のユーザーを取得
  User? get currentUser => _auth.currentUser;

  // 認証状態の変更を監視
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // メールアドレスとパスワードでログイン
  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // メールアドレスとパスワードで登録
  Future<UserCredential> registerWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      return await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Googleでログイン
  /// 注: MVP段階では一時的に無効化しています
  Future<UserCredential> signInWithGoogle() async {
    throw Exception('Google Sign In は現在利用できません。メール/パスワードまたはApple Sign Inでログインしてください。');

    // TODO: Android/iOS向けに Google Sign In を有効化する場合は以下のコメントを外す
    /*
    try {
      // Googleサインインフローを開始
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        throw Exception('Googleサインインがキャンセルされました');
      }

      // 認証情報を取得
      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      // Firebaseの認証情報を作成
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Firebaseにサインイン
      return await _auth.signInWithCredential(credential);
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw Exception('Googleサインインに失敗しました: $e');
    }
    */
  }

  // Apple Sign-Inでログイン
  Future<UserCredential> signInWithApple() async {
    try {
      // Apple Sign-Inフローを開始
      final appleCredential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      // Firebaseの認証情報を作成
      final oauthCredential = OAuthProvider('apple.com').credential(
        idToken: appleCredential.identityToken,
        accessToken: appleCredential.authorizationCode,
      );

      // Firebaseにサインイン
      final userCredential =
          await _auth.signInWithCredential(oauthCredential);

      // 初回サインイン時に表示名を設定
      if (userCredential.user != null &&
          userCredential.additionalUserInfo?.isNewUser == true) {
        final displayName = appleCredential.givenName != null &&
                appleCredential.familyName != null
            ? '${appleCredential.familyName} ${appleCredential.givenName}'
            : null;
        if (displayName != null) {
          await userCredential.user!.updateDisplayName(displayName);
        }
      }

      return userCredential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw Exception('Apple Sign-Inに失敗しました: $e');
    }
  }

  // Apple Sign-Inが利用可能かチェック
  Future<bool> get isAppleSignInAvailable async {
    if (!Platform.isIOS && !Platform.isMacOS) {
      return false;
    }
    return await SignInWithApple.isAvailable();
  }

  // パスワードリセットメールを送信
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // ログアウト
  Future<void> signOut() async {
    await _auth.signOut();
    // TODO: Google Sign In 有効化時は以下も追加
    // await _googleSignIn.signOut();
  }

  // アカウント削除
  Future<void> deleteAccount() async {
    try {
      await _auth.currentUser?.delete();
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Firebase認証エラーをハンドリング
  String _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return 'メールアドレスの形式が正しくありません';
      case 'user-disabled':
        return 'このアカウントは無効化されています';
      case 'user-not-found':
        return 'ユーザーが見つかりません';
      case 'wrong-password':
        return 'パスワードが正しくありません';
      case 'email-already-in-use':
        return 'このメールアドレスは既に使用されています';
      case 'operation-not-allowed':
        return 'この操作は許可されていません';
      case 'weak-password':
        return 'パスワードが弱すぎます。6文字以上を設定してください';
      case 'too-many-requests':
        return 'リクエストが多すぎます。しばらく待ってから再試行してください';
      case 'requires-recent-login':
        return 'この操作には再ログインが必要です';
      default:
        return '認証エラーが発生しました: ${e.message ?? e.code}';
    }
  }
}
