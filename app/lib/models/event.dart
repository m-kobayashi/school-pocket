class Event {
  final String id;
  final String childId;
  final String title;
  final DateTime date;
  final DateTime? endDate;
  final String eventType; // 'holiday', 'exam', 'event', 'meeting', 'other'
  final String? description;
  final bool isAllDay;
  final String? startTime;
  final String? endTime;
  final DateTime createdAt;
  final DateTime updatedAt;

  Event({
    required this.id,
    required this.childId,
    required this.title,
    required this.date,
    this.endDate,
    required this.eventType,
    this.description,
    required this.isAllDay,
    this.startTime,
    this.endTime,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as String,
      childId: json['child_id'] as String,
      title: json['title'] as String,
      date: DateTime.parse(json['date'] as String),
      endDate: json['end_date'] != null ? DateTime.parse(json['end_date'] as String) : null,
      eventType: json['event_type'] as String? ?? 'other',
      description: json['description'] as String?,
      isAllDay: (json['is_all_day'] as int? ?? 1) == 1,
      startTime: json['start_time'] as String?,
      endTime: json['end_time'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'child_id': childId,
      'title': title,
      'date': _formatDate(date),
      'end_date': endDate != null ? _formatDate(endDate!) : null,
      'event_type': eventType,
      'description': description,
      'is_all_day': isAllDay ? 1 : 0,
      'start_time': startTime,
      'end_time': endTime,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  String get eventTypeDisplay {
    const typeMap = {
      'holiday': '休日・休校',
      'exam': 'テスト',
      'event': '行事',
      'meeting': '保護者会',
      'other': 'その他',
    };
    return typeMap[eventType] ?? 'その他';
  }

  String get eventTypeIcon {
    const iconMap = {
      'holiday': '🏖',
      'exam': '📝',
      'event': '🎉',
      'meeting': '👥',
      'other': '📌',
    };
    return iconMap[eventType] ?? '📌';
  }

  Event copyWith({
    String? id,
    String? childId,
    String? title,
    DateTime? date,
    DateTime? endDate,
    String? eventType,
    String? description,
    bool? isAllDay,
    String? startTime,
    String? endTime,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Event(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      title: title ?? this.title,
      date: date ?? this.date,
      endDate: endDate ?? this.endDate,
      eventType: eventType ?? this.eventType,
      description: description ?? this.description,
      isAllDay: isAllDay ?? this.isAllDay,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
