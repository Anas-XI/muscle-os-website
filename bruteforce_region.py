import pg8000.native

regions = [
    "aws-0-eu-central-1", "aws-0-eu-west-1", "aws-0-eu-west-2", "aws-0-eu-west-3",
    "aws-0-us-east-1", "aws-0-us-east-2", "aws-0-us-west-1", "aws-0-us-west-2",
    "aws-0-ap-southeast-1", "aws-0-ap-southeast-2", "aws-0-ap-northeast-1", "aws-0-ap-northeast-2",
    "aws-0-ap-south-1", "aws-0-sa-east-1", "aws-0-ca-central-1"
]

project_ref = "kddxpxbstnvmgwdgponc"
password = "bvrsuo4nyaf0z0U9"
user = f"postgres.{project_ref}"
db = "postgres"
port = 6543

success_host = None
for region in regions:
    host = f"{region}.pooler.supabase.com"
    print(f"Trying {host}...")
    try:
        con = pg8000.native.Connection(user, host=host, database=db, port=port, password=password, timeout=2)
        print(f"SUCCESS: Connected to {host}!")
        con.close()
        success_host = host
        break
    except Exception as e:
        pass

if success_host:
    print(f"\nFound it: {success_host}")
    with open("pooler_host.txt", "w") as f:
        f.write(success_host)
else:
    print("\nCould not connect to any region.")
