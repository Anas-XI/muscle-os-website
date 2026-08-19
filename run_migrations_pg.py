import os
import pg8000.native

# Disable unneeded notifications
host = 'db.kddxpxbstnvmgwdgponc.supabase.co'
user = 'postgres'
password = 'bvrsuo4nyaf0z0U9'
database = 'postgres'
port = 5432

print('Connecting to database...')
try:
    con = pg8000.native.Connection(user, host=host, database=database, port=port, password=password)
    
    migrations_dir = os.path.join(os.path.dirname(__file__), "supabase", "migrations")
    migration_files = sorted(f for f in os.listdir(migrations_dir) if f.endswith(".sql"))
    
    for mf in migration_files:
        path = os.path.join(migrations_dir, mf)
        with open(path, "r", encoding="utf-8") as f:
            sql = f.read()
        print(f"Applying {mf}...")
        try:
            # Need to wrap in transaction manually if we want
            con.run(sql)
            print(f"  OK: {mf}")
        except Exception as e:
            print(f"  ERR {mf}: {e}")
            
    con.close()
    print("All done!")
except Exception as e:
    print(f"Connection failed: {e}")
