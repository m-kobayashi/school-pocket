import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/child_provider.dart';
import '../config/constants.dart';

class TimetableScreen extends ConsumerWidget {
  const TimetableScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedChild = ref.watch(selectedChildProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('時間割'),
        actions: [
          if (selectedChild != null)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () {
                // TODO: 時間割編集画面へ遷移
              },
            ),
        ],
      ),
      body: selectedChild == null
          ? const Center(
              child: Text('子どもを選択してください'),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  // 曜日ヘッダー
                  _buildWeekHeader(),
                  const SizedBox(height: 16),
                  // 時間割表
                  _buildTimetableGrid(),
                ],
              ),
            ),
    );
  }

  Widget _buildWeekHeader() {
    return Row(
      children: [
        const SizedBox(width: 40), // 時限列のスペース
        ...Constants.daysOfWeek.skip(1).map((day) {
          return Expanded(
            child: Center(
              child: Text(
                day,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildTimetableGrid() {
    return Column(
      children: List.generate(6, (period) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              // 時限
              SizedBox(
                width: 40,
                child: Center(
                  child: Text(
                    '${period + 1}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              // 各曜日の科目
              ...List.generate(5, (day) {
                return Expanded(
                  child: Container(
                    height: 50,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Center(
                      child: Text(
                        '--',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      }),
    );
  }
}
