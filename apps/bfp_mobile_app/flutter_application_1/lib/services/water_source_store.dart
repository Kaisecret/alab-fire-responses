import 'package:path/path.dart' as path;
import 'package:sqflite/sqflite.dart';

DatabaseFactory get databaseFactoryDefault => databaseFactory;

class MobileWaterSource {
  const MobileWaterSource({
    required this.id,
    required this.municipalityName,
    required this.exactLocation,
    required this.sourceKind,
    required this.latitude,
    required this.longitude,
  });

  final String id;
  final String municipalityName;
  final String exactLocation;
  final String sourceKind;
  final double latitude;
  final double longitude;

  factory MobileWaterSource.fromJson(Map<String, dynamic> json) =>
      MobileWaterSource(
        id: json['id'] as String,
        municipalityName: json['municipalityName'] as String,
        exactLocation: json['exactLocation'] as String,
        sourceKind: json['sourceKind'] as String,
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
      );

  Map<String, Object?> toDatabase() => {
    'id': id,
    'municipality_name': municipalityName,
    'exact_location': exactLocation,
    'source_kind': sourceKind,
    'latitude': latitude,
    'longitude': longitude,
  };

  factory MobileWaterSource.fromDatabase(Map<String, Object?> row) =>
      MobileWaterSource(
        id: row['id'] as String,
        municipalityName: row['municipality_name'] as String,
        exactLocation: row['exact_location'] as String,
        sourceKind: row['source_kind'] as String,
        latitude: (row['latitude'] as num).toDouble(),
        longitude: (row['longitude'] as num).toDouble(),
      );
}

class WaterSourceStore {
  WaterSourceStore({
    required this.fetchSources,
    DatabaseFactory? databaseFactory,
    this.databasePath,
  }) : _factory = databaseFactory ?? databaseFactoryDefault,
       assert(databasePath == null || databasePath.isNotEmpty);

  final Future<List<MobileWaterSource>> Function() fetchSources;
  final DatabaseFactory _factory;
  final String? databasePath;
  Database? _database;

  Future<Database> _open() async {
    if (_database != null) return _database!;
    final file =
        databasePath ??
        path.join(await getDatabasesPath(), 'alab_water_sources.db');
    _database = await _factory.openDatabase(
      file,
      options: OpenDatabaseOptions(
        version: 1,
        onCreate: (db, _) async {
          await db.execute('''
            CREATE TABLE water_sources (
              id TEXT PRIMARY KEY,
              municipality_name TEXT NOT NULL,
              exact_location TEXT NOT NULL,
              source_kind TEXT NOT NULL,
              latitude REAL NOT NULL,
              longitude REAL NOT NULL
            )
          ''');
        },
      ),
    );
    return _database!;
  }

  Future<List<MobileWaterSource>> loadCached() async {
    final db = await _open();
    final rows = await db.query(
      'water_sources',
      orderBy: 'municipality_name, exact_location, id',
    );
    return rows.map(MobileWaterSource.fromDatabase).toList();
  }

  Future<List<MobileWaterSource>> refresh() async {
    final sources = await fetchSources();
    final db = await _open();
    await db.transaction((txn) async {
      await txn.delete('water_sources');
      for (final source in sources) {
        await txn.insert('water_sources', source.toDatabase());
      }
    });
    return sources;
  }

  Future<void> dispose() async {
    await _database?.close();
    _database = null;
  }
}
