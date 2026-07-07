import sqlite3, os, json, uuid, datetime

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "mos.db")

def get_conn():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT DEFAULT '',
            role TEXT DEFAULT 'client' CHECK(role IN ('client','coach')),
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS client_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE REFERENCES users(id),
            goal TEXT, situation TEXT, experience TEXT,
            weight REAL, height REAL, age INTEGER,
            training_days INTEGER, session_length INTEGER,
            current_split TEXT, injuries TEXT DEFAULT '[]',
            gut_health TEXT, sleep TEXT, stress TEXT,
            steps TEXT, caffeine TEXT, supplements TEXT DEFAULT '[]',
            medical_conditions TEXT DEFAULT '[]',
            ed_screening TEXT DEFAULT '{}',
            hydration TEXT, alcohol_weekly TEXT,
            work_schedule TEXT, mobility TEXT,
            bloodwork TEXT, mental_health TEXT,
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id),
            title TEXT, content TEXT NOT NULL,
            active INTEGER DEFAULT 0, version INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id),
            role TEXT CHECK(role IN ('user','assistant','system')),
            content TEXT NOT NULL,
            metadata TEXT DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id),
            checkin_number INTEGER NOT NULL,
            weight REAL, sleep_hours REAL,
            sleep_quality INTEGER, readiness INTEGER,
            adherence INTEGER, soreness INTEGER,
            notes TEXT, created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS coach_clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id TEXT REFERENCES users(id),
            client_id TEXT REFERENCES users(id),
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(coach_id, client_id)
        );
        CREATE TABLE IF NOT EXISTS workout_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id),
            exercise TEXT NOT NULL, sets INTEGER,
            reps INTEGER, weight REAL, rpe REAL,
            notes TEXT, logged_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()

def row_to_dict(row):
    if row is None: return None
    return dict(row)

def rows_to_list(rows):
    return [dict(r) for r in rows]

class LocalDB:
    @staticmethod
    def get_user_by_email(email):
        conn = get_conn()
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        conn.close()
        return row_to_dict(row)

    @staticmethod
    def get_user_by_id(uid):
        conn = get_conn()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        conn.close()
        return row_to_dict(row)

    @staticmethod
    def create_user(uid, email, password_hash, name, role):
        conn = get_conn()
        conn.execute("INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (?,?,?,?,?)",
                     (uid, email, password_hash, name, role))
        conn.commit()
        conn.close()

    @staticmethod
    def get_client_profile(user_id):
        conn = get_conn()
        row = conn.execute("SELECT * FROM client_profiles WHERE user_id = ?", (user_id,)).fetchone()
        conn.close()
        return row_to_dict(row)

    @staticmethod
    def upsert_client_profile(user_id, data):
        conn = get_conn()
        existing = conn.execute("SELECT id FROM client_profiles WHERE user_id = ?", (user_id,)).fetchone()
        fields = {k: v for k, v in data.items() if k != 'user_id'}
        fields['updated_at'] = datetime.datetime.now().isoformat()
        if existing:
            sets = ', '.join(f"{k}=?" for k in fields)
            vals = list(fields.values()) + [user_id]
            conn.execute(f"UPDATE client_profiles SET {sets} WHERE user_id=?", vals)
        else:
            keys = ['user_id'] + list(fields.keys())
            vals = [user_id] + list(fields.values())
            placeholders = ','.join('?' for _ in keys)
            conn.execute(f"INSERT INTO client_profiles ({','.join(keys)}) VALUES ({placeholders})", vals)
        conn.commit()
        conn.close()

    @staticmethod
    def get_messages(user_id, limit=50):
        conn = get_conn()
        rows = conn.execute(
            "SELECT * FROM messages WHERE user_id=? ORDER BY created_at ASC LIMIT ?", (user_id, limit)
        ).fetchall()
        conn.close()
        return rows_to_list(rows)

    @staticmethod
    def add_message(user_id, role, content):
        conn = get_conn()
        conn.execute("INSERT INTO messages (user_id, role, content) VALUES (?,?,?)",
                     (user_id, role, content))
        conn.commit()
        conn.close()

    @staticmethod
    def get_programs(user_id, active_only=False):
        conn = get_conn()
        if active_only:
            rows = conn.execute("SELECT * FROM programs WHERE user_id=? AND active=1 ORDER BY created_at DESC", (user_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM programs WHERE user_id=? ORDER BY created_at DESC", (user_id,)).fetchall()
        conn.close()
        return rows_to_list(rows)

    @staticmethod
    def add_program(user_id, title, content):
        conn = get_conn()
        conn.execute("UPDATE programs SET active=0 WHERE user_id=?", (user_id,))
        conn.execute("INSERT INTO programs (user_id, title, content, active) VALUES (?,?,?,1)",
                     (user_id, title, content))
        conn.commit()
        last_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.close()
        return last_id

    @staticmethod
    def get_checkins(user_id, limit=10):
        conn = get_conn()
        rows = conn.execute("SELECT * FROM checkins WHERE user_id=? ORDER BY created_at DESC LIMIT ?", (user_id, limit)).fetchall()
        conn.close()
        return rows_to_list(rows)

    @staticmethod
    def add_checkin(user_id, data):
        conn = get_conn()
        last = conn.execute("SELECT MAX(checkin_number) as mx FROM checkins WHERE user_id=?", (user_id,)).fetchone()
        num = (last['mx'] or 0) + 1
        conn.execute(
            "INSERT INTO checkins (user_id, checkin_number, weight, sleep_hours, sleep_quality, readiness, adherence, soreness, notes) VALUES (?,?,?,?,?,?,?,?,?)",
            (user_id, num, data.get('weight'), data.get('sleep_hours'), data.get('sleep_quality'),
             data.get('readiness'), data.get('adherence'), data.get('soreness'), data.get('notes'))
        )
        conn.commit()
        conn.close()
        return num

    @staticmethod
    def get_workouts(user_id, limit=50):
        conn = get_conn()
        rows = conn.execute("SELECT * FROM workout_logs WHERE user_id=? ORDER BY logged_at DESC LIMIT ?", (user_id, limit)).fetchall()
        conn.close()
        return rows_to_list(rows)

    @staticmethod
    def add_workout(user_id, data):
        conn = get_conn()
        conn.execute(
            "INSERT INTO workout_logs (user_id, exercise, sets, reps, weight, rpe, notes) VALUES (?,?,?,?,?,?,?)",
            (user_id, data['exercise'], data.get('sets'), data.get('reps'),
             data.get('weight'), data.get('rpe'), data.get('notes'))
        )
        conn.commit()
        conn.close()

    @staticmethod
    def get_coach_clients(coach_id):
        conn = get_conn()
        rows = conn.execute(
            "SELECT u.id, u.name, u.email FROM coach_clients cc JOIN users u ON u.id=cc.client_id WHERE cc.coach_id=? AND cc.status='active'",
            (coach_id,)
        ).fetchall()
        conn.close()
        return rows_to_list(rows)

    @staticmethod
    def add_coach_client(coach_id, client_id):
        conn = get_conn()
        try:
            conn.execute("INSERT OR IGNORE INTO coach_clients (coach_id, client_id) VALUES (?,?)", (coach_id, client_id))
            conn.commit()
        except Exception:
            import traceback
            print(f"[DB] add_coach_client failed: {traceback.format_exc()}")
        conn.close()

    @staticmethod
    def get_user_context(user_id):
        profile = LocalDB.get_client_profile(user_id)
        programs = LocalDB.get_programs(user_id, active_only=True)
        checkins = LocalDB.get_checkins(user_id, limit=4)
        return {
            "profile": profile or {},
            "programs": programs or [],
            "recent_checkins": checkins or [],
        }

init_db()
