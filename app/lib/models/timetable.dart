class Timetable {
  final String id;
  final String childId;
  final int dayOfWeek; // 1=月曜〜5=金曜
  final int period; // 1〜6時限
  final String subject;
  final String? teacher;
  final String? room;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  Timetable({
    required this.id,
    required this.childId,
    required this.dayOfWeek,
    required this.period,
    required this.subject,
    this.teacher,
    this.room,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Timetable.fromJson(Map<String, dynamic> json) {
    return Timetable(
      id: json['id'] as String,
      childId: json['child_id'] as String,
      dayOfWeek: json['day_of_week'] as int,
      period: json['period'] as int,
      subject: json['subject'] as String,
      teacher: json['teacher'] as String?,
      room: json['room'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'child_id': childId,
      'day_of_week': dayOfWeek,
      'period': period,
      'subject': subject,
      'teacher': teacher,
      'room': room,
      'notes': notes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  String get dayOfWeekDisplay {
    const days = ['', '月', '火', '水', '木', '金'];
    return dayOfWeek >= 1 && dayOfWeek <= 5 ? days[dayOfWeek] : '';
  }

  Timetable copyWith({
    String? id,
    String? childId,
    int? dayOfWeek,
    int? period,
    String? subject,
    String? teacher,
    String? room,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Timetable(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      period: period ?? this.period,
      subject: subject ?? this.subject,
      teacher: teacher ?? this.teacher,
      room: room ?? this.room,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
