import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/child_provider.dart';

class PrintsScreen extends ConsumerWidget {
  const PrintsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedChild = ref.watch(selectedChildProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('プリント'),
        actions: [
          if (selectedChild != null)
            IconButton(
              icon: const Icon(Icons.camera_alt),
              onPressed: () {
                // TODO: プリント撮影画面へ遷移
              },
            ),
        ],
      ),
      body: selectedChild == null
          ? const Center(
              child: Text('子どもを選択してください'),
            )
          : const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.description, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('プリントがありません'),
                  SizedBox(height: 8),
                  Text(
                    'カメラボタンから撮影してください',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ),
    );
  }
}
