# Local data model

The SQLite schema is versioned through `schema_migrations`. User-owned tables are never dropped during an upgrade. Bundled exercises, plan rows, and foods use stable IDs and `INSERT OR IGNORE` seeding so a new release can add definitions without replacing history.

`resetAllData` is the only destructive operation and is exposed only behind an explicit confirmation in Settings.
