class Constants {
  // API設定
  static const String apiBaseUrl = 'https://school-pocket-api.YOUR_SUBDOMAIN.workers.dev';

  // ローカル開発時は以下を使用
  // static const String apiBaseUrl = 'http://localhost:8787';

  // プラン制限
  static const int freePlanChildLimit = 1;
  static const int freePlanPrintLimit = 10; // 月間

  // アプリ情報
  static const String appName = 'スクールポケット';
  static const String appVersion = '1.0.0';

  // カラー
  static const Map<String, String> childColors = {
    'green': '#4CAF50',
    'blue': '#2196F3',
    'red': '#F44336',
    'orange': '#FF9800',
    'purple': '#9C27B0',
    'pink': '#E91E63',
    'teal': '#009688',
    'indigo': '#3F51B5',
  };

  // 教科リスト
  static const List<String> subjects = [
    '--',
    '国語',
    '算数',
    '数学',
    '理科',
    '社会',
    '英語',
    '外国語',
    '体育',
    '音楽',
    '図工',
    '美術',
    '家庭科',
    '技術',
    '道徳',
    '総合',
    'クラブ',
    '委員会',
    '学活',
    'その他',
  ];

  // 曜日
  static const List<String> daysOfWeek = ['', '月', '火', '水', '木', '金'];

  // イベントタイプ
  static const Map<String, String> eventTypes = {
    'holiday': '休日・休校',
    'exam': 'テスト',
    'event': '行事',
    'meeting': '保護者会',
    'other': 'その他',
  };

  // プリントカテゴリ
  static const Map<String, String> printCategories = {
    'notice': 'お知らせ',
    'schedule': '予定表',
    'form': '提出書類',
    'pta': 'PTA',
    'other': 'その他',
  };
}
