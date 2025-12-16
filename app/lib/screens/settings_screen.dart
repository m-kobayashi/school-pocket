import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/child_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appUser = ref.watch(appUserProvider);
    final children = ref.watch(childrenProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('設定'),
      ),
      body: ListView(
        children: [
          // ユーザー情報
          appUser.when(
            data: (user) {
              if (user == null) return const SizedBox.shrink();
              return ListTile(
                leading: const Icon(Icons.person),
                title: Text(user.displayName ?? user.email),
                subtitle: Text(user.email),
              );
            },
            loading: () => const CircularProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const Divider(),

          // 子ども一覧
          const ListTile(
            title: Text(
              '子ども',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          children.when(
            data: (list) {
              return Column(
                children: [
                  ...list.map((child) {
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Color(
                          int.parse(child.color.substring(1), radix: 16) +
                              0xFF000000,
                        ),
                        child: Text(
                          child.name.substring(0, 1),
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                      title: Text(child.name),
                      subtitle: Text(child.classDisplay),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () {
                          // TODO: 子ども編集画面へ遷移
                        },
                      ),
                    );
                  }),
                  ListTile(
                    leading: const Icon(Icons.add_circle_outline),
                    title: const Text('子どもを追加'),
                    enabled: list.length < 1, // 無料プランは1人まで
                    subtitle: list.length >= 1
                        ? const Text('無料プランでは1人までです')
                        : null,
                    onTap: () {
                      // TODO: 子ども追加画面へ遷移
                    },
                  ),
                ],
              );
            },
            loading: () => const CircularProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const Divider(),

          // プラン情報
          appUser.when(
            data: (user) {
              if (user == null) return const SizedBox.shrink();
              return ListTile(
                leading: const Icon(Icons.card_membership),
                title: const Text('プラン'),
                subtitle: Text(user.plan == 'free' ? '無料プラン' : 'プレミアム'),
                trailing: user.plan == 'free'
                    ? TextButton(
                        onPressed: () {
                          // TODO: プレミアムプラン案内
                        },
                        child: const Text('アップグレード'),
                      )
                    : null,
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const Divider(),

          // ログアウト
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text(
              'ログアウト',
              style: TextStyle(color: Colors.red),
            ),
            onTap: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('ログアウト'),
                  content: const Text('ログアウトしますか?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('キャンセル'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      child: const Text('ログアウト'),
                    ),
                  ],
                ),
              );

              if (confirmed == true && context.mounted) {
                final controller = ref.read(loginControllerProvider.notifier);
                await controller.signOut();
                if (context.mounted) {
                  Navigator.of(context).pop();
                }
              }
            },
          ),
        ],
      ),
    );
  }
}
