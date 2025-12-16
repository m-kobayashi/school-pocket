import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/child_provider.dart';
import '../utils/date_utils.dart' as app_date;
import 'login_screen.dart';
import 'settings_screen.dart';
import 'timetable_screen.dart';
import 'calendar_screen.dart';
import 'prints_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  final _screens = const [
    _TodayInfoScreen(),
    TimetableScreen(),
    PrintsScreen(),
    CalendarScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        if (user == null) {
          return const LoginScreen();
        }

        return Scaffold(
          body: _screens[_currentIndex],
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            type: BottomNavigationBarType.fixed,
            selectedItemColor: Colors.green,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home),
                label: 'ホーム',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_view_week),
                label: '時間割',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.description),
                label: 'プリント',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_today),
                label: 'カレンダー',
              ),
            ],
          ),
        );
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => const LoginScreen(),
    );
  }
}

class _TodayInfoScreen extends ConsumerWidget {
  const _TodayInfoScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedChild = ref.watch(selectedChildProvider);
    final today = app_date.DateUtils.getToday();

    return Scaffold(
      appBar: AppBar(
        title: const Text('スクールポケット'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: selectedChild == null
          ? const Center(
              child: Text('子どもを登録してください'),
            )
          : RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(childrenProvider);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 子ども選択
                    _ChildSelector(),
                    const SizedBox(height: 16),

                    // 今日の日付
                    _DateHeader(date: today),
                    const SizedBox(height: 24),

                    // 今日の時間割
                    _TodayTimetableCard(childId: selectedChild.id),
                    const SizedBox(height: 16),

                    // 今日の持ち物
                    _TodayItemsCard(childId: selectedChild.id),
                    const SizedBox(height: 16),

                    // 今週の予定
                    _WeekEventsCard(childId: selectedChild.id),
                  ],
                ),
              ),
            ),
    );
  }
}

class _ChildSelector extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final children = ref.watch(childrenProvider);
    final selectedChildId = ref.watch(selectedChildIdProvider);

    return children.when(
      data: (list) {
        if (list.isEmpty) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: selectedChildId,
                    isExpanded: true,
                    items: list.map((child) {
                      return DropdownMenuItem(
                        value: child.id,
                        child: Text(
                          '${child.name} ${child.classDisplay}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        ref.read(selectedChildIdProvider.notifier).state =
                            value;
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const CircularProgressIndicator(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

class _DateHeader extends StatelessWidget {
  final DateTime date;

  const _DateHeader({required this.date});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.calendar_today, color: Colors.green),
        const SizedBox(width: 8),
        Text(
          app_date.DateUtils.formatDateDisplay(date),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}

class _TodayTimetableCard extends StatelessWidget {
  final String childId;

  const _TodayTimetableCard({required this.childId});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.book, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  '今日の時間割',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // TODO: 実際の時間割データを表示
            ...List.generate(6, (index) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Text('${index + 1}. --'),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _TodayItemsCard extends StatelessWidget {
  final String childId;

  const _TodayItemsCard({required this.childId});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.backpack, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  '今日の持ち物',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // TODO: 実際の持ち物データを表示
            const Text('持ち物が登録されていません'),
            const SizedBox(height: 8),
            TextButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('追加'),
              onPressed: () {
                // TODO: 持ち物追加ダイアログを表示
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _WeekEventsCard extends StatelessWidget {
  final String childId;

  const _WeekEventsCard({required this.childId});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.event, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  '今週の予定',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // TODO: 実際の行事データを表示
            const Text('今週の予定はありません'),
          ],
        ),
      ),
    );
  }
}
