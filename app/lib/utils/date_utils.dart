import 'package:intl/intl.dart';

class DateUtils {
  /// 日付を YYYY-MM-DD 形式の文字列に変換
  static String formatDate(DateTime date) {
    return DateFormat('yyyy-MM-dd').format(date);
  }

  /// 日付を表示用の文字列に変換 (例: 1月15日(水))
  static String formatDateDisplay(DateTime date) {
    final weekday = ['', '月', '火', '水', '木', '金', '土', '日'][date.weekday];
    return '${date.month}月${date.day}日($weekday)';
  }

  /// 今日の日付を取得
  static DateTime getToday() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  /// 今週の月曜日を取得
  static DateTime getThisMonday() {
    final today = getToday();
    final weekday = today.weekday;
    return today.subtract(Duration(days: weekday - 1));
  }

  /// 今週の金曜日を取得
  static DateTime getThisFriday() {
    final monday = getThisMonday();
    return monday.add(const Duration(days: 4));
  }

  /// 今月の初日を取得
  static DateTime getThisMonthFirst() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, 1);
  }

  /// 今月の最終日を取得
  static DateTime getThisMonthLast() {
    final now = DateTime.now();
    return DateTime(now.year, now.month + 1, 0);
  }

  /// 2つの日付が同じ日かチェック
  static bool isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  /// 日付が今日かチェック
  static bool isToday(DateTime date) {
    return isSameDay(date, DateTime.now());
  }

  /// 日付が過去かチェック
  static bool isPast(DateTime date) {
    final today = getToday();
    return date.isBefore(today);
  }

  /// 曜日を数値に変換 (1=月曜, ..., 7=日曜)
  static int getDayOfWeek(DateTime date) {
    return date.weekday;
  }

  /// 日付の範囲を取得
  static List<DateTime> getDaysInRange(DateTime start, DateTime end) {
    final days = <DateTime>[];
    var current = start;
    while (current.isBefore(end) || isSameDay(current, end)) {
      days.add(current);
      current = current.add(const Duration(days: 1));
    }
    return days;
  }
}
