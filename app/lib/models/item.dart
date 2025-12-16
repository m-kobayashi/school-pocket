class Item {
  final String id;
  final String childId;
  final DateTime date;
  final String name;
  final bool isChecked;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  Item({
    required this.id,
    required this.childId,
    required this.date,
    required this.name,
    required this.isChecked,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Item.fromJson(Map<String, dynamic> json) {
    return Item(
      id: json['id'] as String,
      childId: json['child_id'] as String,
      date: DateTime.parse(json['date'] as String),
      name: json['name'] as String,
      isChecked: (json['is_checked'] as int? ?? 0) == 1,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'child_id': childId,
      'date': _formatDate(date),
      'name': name,
      'is_checked': isChecked ? 1 : 0,
      'notes': notes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  Item copyWith({
    String? id,
    String? childId,
    DateTime? date,
    String? name,
    bool? isChecked,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Item(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      date: date ?? this.date,
      name: name ?? this.name,
      isChecked: isChecked ?? this.isChecked,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
