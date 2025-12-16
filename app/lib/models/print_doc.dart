class PrintDoc {
  final String id;
  final String childId;
  final String title;
  final String category; // 'notice', 'schedule', 'form', 'pta', 'other'
  final String imageUrl;
  final String? thumbnailUrl;
  final DateTime capturedAt;
  final DateTime? deadline;
  final bool isArchived;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  PrintDoc({
    required this.id,
    required this.childId,
    required this.title,
    required this.category,
    required this.imageUrl,
    this.thumbnailUrl,
    required this.capturedAt,
    this.deadline,
    required this.isArchived,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PrintDoc.fromJson(Map<String, dynamic> json) {
    return PrintDoc(
      id: json['id'] as String,
      childId: json['child_id'] as String,
      title: json['title'] as String,
      category: json['category'] as String? ?? 'other',
      imageUrl: json['image_url'] as String,
      thumbnailUrl: json['thumbnail_url'] as String?,
      capturedAt: DateTime.parse(json['captured_at'] as String),
      deadline: json['deadline'] != null ? DateTime.parse(json['deadline'] as String) : null,
      isArchived: (json['is_archived'] as int? ?? 0) == 1,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'child_id': childId,
      'title': title,
      'category': category,
      'image_url': imageUrl,
      'thumbnail_url': thumbnailUrl,
      'captured_at': capturedAt.toIso8601String(),
      'deadline': deadline?.toIso8601String(),
      'is_archived': isArchived ? 1 : 0,
      'notes': notes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  String get categoryDisplay {
    const categoryMap = {
      'notice': 'お知らせ',
      'schedule': '予定表',
      'form': '提出書類',
      'pta': 'PTA',
      'other': 'その他',
    };
    return categoryMap[category] ?? 'その他';
  }

  bool get hasDeadline => deadline != null;

  bool get isOverdue {
    if (deadline == null) return false;
    return DateTime.now().isAfter(deadline!);
  }

  PrintDoc copyWith({
    String? id,
    String? childId,
    String? title,
    String? category,
    String? imageUrl,
    String? thumbnailUrl,
    DateTime? capturedAt,
    DateTime? deadline,
    bool? isArchived,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PrintDoc(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      title: title ?? this.title,
      category: category ?? this.category,
      imageUrl: imageUrl ?? this.imageUrl,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      capturedAt: capturedAt ?? this.capturedAt,
      deadline: deadline ?? this.deadline,
      isArchived: isArchived ?? this.isArchived,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
