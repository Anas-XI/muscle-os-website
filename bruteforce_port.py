import pg8000.native

regions = [
    "aws-0-eu-central-1", "aws-0-eu-west-1", "aws-0-eu-west-2", "aws-0-eu-west-3",
    "aws-0-us-east-1", "aws-0-us-east-2", "aws-0-us-west-1", "aws-0-us-west-2"
]

project_ref = "kddxpxbstnvmgwdgponc"
password = "bvrsuo4nyaf0z0U9"
user = f"postgres.{project_ref}"
db = "postgres"
port = 5432

success_host = None
for region in regions:
    host = f"{region}.pooler.supabase.com"
    print(f"Trying {host}:{port}...")
    try:
        con = pg8000.native.Connection(user, host=host, database=db, port=port, password=password, timeout=3)
        print(f"SUCCESS: Connected to {host}!")
        con.close()
        success_host = host
        break
    except Exception as e:
        print(e)

if success_host:
    print(f"\nFound it: {success_host}")
    with open("pooler_host.txt", "w") as f:
        f.write(success_host)
