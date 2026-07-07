import csv, os, sys, datetime, textwrap

CSV_PATH = os.path.join(os.path.dirname(__file__), "00_PMF_Tracking.csv")
CONTACTS_PATH = os.path.join(os.path.dirname(__file__), "00_Recruitment_Contacts.csv")

MESSAGE = textwrap.dedent("""\
    Hey - I'm building an AI fitness coach (Muscle OS) and looking for 3-5
    intermediate lifters to beta test it for free.

    You get:
    * Personalized training program from a 28-question intake
    * Weekly check-in tracking (weight, readiness, sleep)
    * AI coach chat to ask questions anytime
    * All free, no strings attached

    I get: feedback to improve the system.

    To join: DM me and I'll send you the Telegram bot link.
    (Targeting people who've been lifting 2+ years and feel like progress
    has stalled. Sound like you?)
""")

def cmd_message():
    print(MESSAGE)

def cmd_contact():
    if len(sys.argv) < 4:
        print("Usage: python recruit.py contact <username> <channel>")
        print("Channels: dm, discord, reddit, gym, other")
        return
    username, channel = sys.argv[2], sys.argv[3]
    now = datetime.datetime.now().isoformat(timespec="minutes")
    file_exists = os.path.isfile(CONTACTS_PATH)
    with open(CONTACTS_PATH, "a", newline="") as f:
        w = csv.writer(f)
        if not file_exists:
            w.writerow(["date", "username", "channel", "status"])
        w.writerow([now, username, channel, "pending"])
    print(f"Logged contact: {username} via {channel}")

def cmd_respond():
    if len(sys.argv) < 4:
        print("Usage: python recruit.py respond <username> <outcome>")
        print("Outcomes: interested, not_interested, onboarded, no_reply")
        return
    username, outcome = sys.argv[2], sys.argv[3]
    if not os.path.isfile(CONTACTS_PATH):
        print("No contacts found. Run 'contact' first.")
        return
    rows = []
    with open(CONTACTS_PATH, newline="") as f:
        r = csv.reader(f)
        header = next(r)
        rows.append(header)
        updated = False
        for row in r:
            if row[1] == username:
                row[3] = outcome
                updated = True
            rows.append(row)
        if not updated:
            print(f"Username '{username}' not found.")
            return
    with open(CONTACTS_PATH, "w", newline="") as f:
        csv.writer(f).writerows(rows)
    print(f"Updated {username} → {outcome}")

def cmd_status():
    if not os.path.isfile(CONTACTS_PATH):
        print("No contacts yet. Run 'python recruit.py contact <user> <channel>'")
        return
    with open(CONTACTS_PATH, newline="") as f:
        r = csv.reader(f)
        rows = list(r)
    if len(rows) <= 1:
        print("No contacts yet.")
        return
    print(f"{'Date':<20} {'Username':<20} {'Channel':<12} {'Status':<15}")
    print("-" * 67)
    for row in rows[1:]:
        print(f"{row[0]:<20} {row[1]:<20} {row[2]:<12} {row[3]:<15}")

def cmd_export():
    if not os.path.isfile(CONTACTS_PATH):
        print("No contacts to export.")
        return
    out = os.path.join(os.path.dirname(__file__), "00_Recruitment_Contacts_Export.csv")
    with open(CONTACTS_PATH, newline="") as f:
        content = f.read()
    with open(out, "w") as f:
        f.write(content)
    print(f"Exported to {out}")

def cmd_help():
    print(textwrap.dedent("""\
        Usage: python recruit.py <command> [args]

        Commands:
          message                        Print recruitment message
          contact <user> <channel>       Log a contacted person
          respond <user> <outcome>       Update their response
          status                         Show all contacts
          export                         Export contacts CSV
          help                           This help
    """))

def main():
    if len(sys.argv) < 2:
        cmd_help()
        return
    cmds = {
        "message": cmd_message,
        "contact": cmd_contact,
        "respond": cmd_respond,
        "status": cmd_status,
        "export": cmd_export,
        "help": cmd_help,
    }
    cmds.get(sys.argv[1], cmd_help)()

if __name__ == "__main__":
    main()
