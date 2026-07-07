"""Muscle OS CLI — Program generation and system tools"""

import argparse
import json
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def evaluate_ed_screening(answers: dict) -> tuple:
    ed1 = str(answers.get("ED1", "no")).lower() == "yes"
    ed2 = str(answers.get("ED2", "no")).lower() == "yes"
    ed3 = str(answers.get("ED3", "no")).lower() == "yes"
    ed4 = str(answers.get("ED4", "no")).lower() == "yes"

    items = []
    if ed1: items.append("binge_episodes")
    if ed2: items.append("compensatory_behavior")
    if ed3: items.append("diagnosed_ed")
    if ed4: items.append("guilt_after_eating")

    if ed3: return "red", items
    if ed1 and ed2: return "red", items
    if sum([ed1, ed2, ed4]) >= 2: return "yellow", items
    if ed4: return "yellow", items
    return "green", items


def cmd_generate(args):
    from mos_bot.core.program_generator import generate_program_pipeline

    ed_answers = {}
    if args.ed_screening:
        try:
            with open(args.ed_screening, "r") as f:
                ed_answers = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error reading ED screening file: {e}")
            sys.exit(1)

    result = generate_program_pipeline(args.user_id, ed_answers)

    if "error" in result:
        print(f"Error: {result['error']}")
        sys.exit(1 if result.get("blocked") else 0)

    print(f"User: {result['client_name']}")
    print(f"Generated: {result['generated_at']}")
    print(f"Markdown: {result['markdown_path']}")
    if result.get("pdf_path"):
        print(f"PDF: {result['pdf_path']}")
    print("Done.")


def cmd_preview(args):
    """Generate and print markdown to stdout (no PDF)."""
    from mos_bot.core.program_generator import generate_program_pipeline

    result = generate_program_pipeline(args.user_id)
    if "error" in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    print(result["markdown"])


def cmd_rag_query(args):
    """Query the vault RAG system."""
    from mos_bot.core.vault_rag import VaultIndexer

    idx = VaultIndexer()
    idx.index_vault()
    results = idx.search(args.query, top_k=args.top_k)
    print(f"\nQuery: {args.query}")
    print("=" * 60)
    for chunk, score in results:
        print(f"  [{score:.3f}] {chunk.section_title} ({chunk.source_path})")
        if args.verbose:
            print(f"      {chunk.content[:200]}...")
    print(f"\nFound {len(results)} results.")


def cmd_pillar_info(args):
    """Show pillar assignment for a profile without generating."""
    from mos_bot.core.models import ClientProfile
    from mos_bot.core.context_loader import load_context
    from mos_bot.config import USERS_DIR

    profile_path = os.path.join(USERS_DIR, f"{args.user_id}.json")
    if not os.path.exists(profile_path):
        print(f"Profile not found: {profile_path}")
        sys.exit(1)

    with open(profile_path, "r") as f:
        raw = json.load(f)
    profile = ClientProfile.from_dict(raw)
    context = load_context(profile)

    if context.get("blocked"):
        print("BLOCKED:", context["triage"].caution_note)
        sys.exit(1)

    pil = context["pillars"]
    print(f"\nPillar Assignment for {profile.name or args.user_id}:")
    print(f"  Triage: {context['triage'].triage.upper()}")
    print(f"  Gentle Entry: {pil.gentle_entry}")
    print(f"  Primary Pillars: {', '.join(pil.primary_pillars)}")
    print(f"  Secondary Pillars: {', '.join(pil.secondary_pillars)}")
    print(f"  Modifications: {', '.join(pil.modifications) if pil.modifications else 'None'}")


def main():
    parser = argparse.ArgumentParser(description="Muscle OS CLI")
    sub = parser.add_subparsers(dest="command")

    # generate-program
    gp = sub.add_parser("generate-program", help="Generate a coaching program PDF")
    gp.add_argument("user_id", help="User ID (matches filename in data/users/)")
    gp.add_argument("--ed-screening", help="JSON file with ED screening answers (ED1-ED4)")

    # preview
    prev = sub.add_parser("preview", help="Preview program as markdown (no PDF)")
    prev.add_argument("user_id", help="User ID")

    # rag-query
    rq = sub.add_parser("rag-query", help="Query the vault RAG system")
    rq.add_argument("query", help="Search query")
    rq.add_argument("--top-k", type=int, default=5, help="Number of results (default: 5)")
    rq.add_argument("--verbose", "-v", action="store_true", help="Show snippet of each result")

    # pillar-info
    pi = sub.add_parser("pillar-info", help="Show pillar assignment for a profile")
    pi.add_argument("user_id", help="User ID")

    args = parser.parse_args()
    if args.command == "generate-program":
        cmd_generate(args)
    elif args.command == "preview":
        cmd_preview(args)
    elif args.command == "rag-query":
        cmd_rag_query(args)
    elif args.command == "pillar-info":
        cmd_pillar_info(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
