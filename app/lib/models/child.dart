class Child {
  final String id;
  final String userId;
  final String name;
  final String? schoolName;
  final int? grade; // 1〜9（小1〜中3）
  final String? className;
  final String color;
  final int sortOrder;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  Child({
    required this.id,
    required this.userId,
    required this.name,
    this.schoolName,
    this.grade,
    this.className,
    required this.color,
    required this.sortOrder,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Child.fromJson(Map<String, dynamic> json) {
    return Child(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String,
      schoolName: json['school_name'] as String?,
      grade: json['grade'] as int?,
      className: json['class_name'] as String?,
      color: json['color'] as String? ?? '#4CAF50',
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: (json['is_active'] as int? ?? 1) == 1,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'school_name': schoolName,
      'grade': grade,
      'class_name': className,
      'color': color,
      'sort_order': sortOrder,
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  String get gradeDisplay {
    if (grade == null) return '';
    if (grade! <= 6) {
      return '小$grade';
    } else {
      return '中${grade! - 6}';
    }
  }

  String get classDisplay {
    final gradeText = gradeDisplay;
    final classText = className ?? '';
    return '$gradeText$classText';
  }

  Child copyWith({
    String? id,
    String? userId,
    String? name,
    String? schoolName,
    int? grade,
    String? className,
    String? color,
    int? sortOrder,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Child(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      schoolName: schoolName ?? this.schoolName,
      grade: grade ?? this.grade,
      className: className ?? this.className,
      color: color ?? this.color,
      sortOrder: sortOrder ?? this.sortOrder,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
