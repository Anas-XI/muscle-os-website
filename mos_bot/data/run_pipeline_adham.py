"""Run the full pipeline manually step by step for Adham Elgamil."""
import json, os, sys, traceback
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from mos_bot.core.models import ClientProfile, ProgramDraft
from mos_bot.core.context_loader import evaluate_ed_screening, run_safety_triage, assign_pillars, _extract_vault_signals
from mos_bot.core.archetype_matcher import ArchetypeMatcher
from mos_bot.core.constraint_engine import build_constraint_graph, constraints_to_modifiers
from mos_bot.core.vault_orchestrator import VaultOrchestrator
from mos_bot.core.book_engine import BookDecisionEngine
from mos_bot.core.content_generator import generate_program as build_deterministic_content, program_to_markdown
from mos_bot.core.coach_pipeline import _build_sections, _enrich_with_llm, _check_llm

USER_ID = "live_test_adham"
PROFILE_PATH = os.path.join(os.path.dirname(__file__), "users", f"{USER_ID}.json")
DRAFTS_DIR = os.path.join(os.path.dirname(__file__), "drafts")

print("=" * 60)
print("MUSCLE OS -- FULL PIPELINE RUN")
print("=" * 60)

# -- 1. Load profile --
print("\n[1/11] Loading profile...")
with open(PROFILE_PATH, "r", encoding="utf-8") as f:
    raw = json.load(f)
profile = ClientProfile.from_dict(raw)
print(f"  Client: {profile.name} | Goal: {profile.goal} | Age: {profile.age} | Sex: {profile.sex}")
print(f"  Weight: {profile.bodyweight_kg}kg | Height: {profile.height_cm}cm | Experience: {profile.experience_years}yrs")
print(f"  Training: {profile.training_days} days/wk, {profile.session_length_min}min sessions")
print(f"  Injuries: {profile.injuries}")
print(f"  Sleep: {profile.sleep_hours}h | Stress: {profile.stress_level}/10 | Steps: {profile.daily_steps}")

# -- 2. Safety triage --
print("\n[2/11] Running safety triage...")
ed_answers = {f"ED{i}": raw.get(f"ED{i}", "no") for i in range(1,5)}
ed_result = evaluate_ed_screening(ed_answers)
print(f"  ED screening: {ed_result[0]}" if isinstance(ed_result, tuple) else f"  ED screening: {ed_result}")
triage = run_safety_triage(profile, ed_result)
print(f"  Level: {triage.triage} | Blocked: {triage.blocked}")
if triage.blocked:
    print(f"  BLOCKED: {triage.block_reason} | {triage.caution_note}")
    sys.exit(1)
print(f"  Modifiers: {triage.modifiers}")

# -- 3. Archetype matching --
print("\n[3/11] Matching archetype...")
matcher = ArchetypeMatcher()
archetype = matcher.match(profile)
print(f"  Archetype: {archetype.archetype_name} (score: {archetype.match_score:.2f})")
for r in archetype.match_reasons[:2]:
    print(f"    - {r}")

# -- 4. Constraint resolution --
print("\n[4/11] Building constraint graph...")
cg = build_constraint_graph(profile, triage)
modifiers = constraints_to_modifiers(cg, triage)
print(f"  Nodes: {len(cg.nodes)} | Resolved: {cg.resolved}")
print(f"  Resolved modifiers: {modifiers}")

# -- 5. Vault orchestration --
print("\n[5/11] Multi-domain vault RAG...")
orch = VaultOrchestrator()
try:
    domain_context = orch.build_multi_domain_context(profile)
    all_sources = orch.all_domain_sources(domain_context)
    all_citations = orch.all_domain_citations(domain_context)
    for dom, sources in domain_context.items():
        print(f"  {dom}: {len(sources)} sources")
    print(f"  Total sources: {len(all_sources)} | Citations: {len(all_citations)}")
    if all_citations:
        c = all_citations[0]
        print(f"  e.g.: {c.vault_title[:50]}... -> {c.vault_path[:40]}...")
except Exception as e:
    print(f"  Vault RAG failed: {e}")
    all_sources, all_citations = [], []

# -- 6. Vault signals + pillar assignment --
print("\n[6/11] Extracting signals & assigning pillars...")
vault_signals = _extract_vault_signals(all_sources, profile)
triage.modifiers = list(set(triage.modifiers + modifiers))
pillars = assign_pillars(profile, triage, vault_signals)
print(f"  Primary pillars: {pillars.primary_pillars}")
print(f"  Secondary pillars: {pillars.secondary_pillars}")
print(f"  Gentle entry: {pillars.gentle_entry}")
print(f"  Modifications: {pillars.modifications[:8]}")

# -- 7. Book engine --
print("\n[7/11] Running book decision engine...")
book_engine = BookDecisionEngine()
book_result = book_engine.apply(profile, pillars, triage)
pillars.modifications.extend(book_result.extra_modifiers)
print(f"  Rules applied: {len(book_result.applied_rules)}")
print(f"  Rep range: {book_result.rep_range}")
print(f"  Rest (compounds): {book_result.rest_compounds}")
print(f"  Protein g/kg: {book_result.protein_per_kg}")
print(f"  Extra modifiers: {book_result.extra_modifiers[:5]}")

# -- 8. Deterministic content --
print("\n[8/11] Generating deterministic content...")
pc = build_deterministic_content(profile, triage, pillars, all_sources, "", book_result, vault_signals)
full_markdown = program_to_markdown(pc)
print(f"  Content: {len(full_markdown)} chars, {full_markdown.count(chr(10))} lines")

# -- 9. Build sections --
print("\n[9/11] Building sections...")
sections = _build_sections(profile, triage, pillars, pc, archetype, cg, all_sources, all_citations, book_result, vault_signals)
print(f"  Sections: {len(sections)}")
for s in sections:
    clen = len(s.content or "")
    print(f"    [{s.order:02d}] {s.title:<40s} {s.domain:<12s} {s.status:<10s} {clen}ch")

# -- 10. LLM enrichment --
llm_enabled = _check_llm()
if llm_enabled:
    print("\n[10/11] LLM enriching sections...")
    sections = _enrich_with_llm(sections, profile, archetype, cg)
    print(f"  Enriched: {len(sections)} sections")
else:
    print("\n[10/11] LLM not available, skipping enrichment")

# -- 11. Save draft & export --
print("\n[11/11] Saving draft and exporting PDF...")
draft_id = f"{USER_ID}_demo_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
draft = ProgramDraft(
    draft_id=draft_id,
    user_id=USER_ID,
    client_name=profile.name,
    sections=sections,
    archetype=archetype,
    constraint_graph=cg,
    vault_sources_full=all_sources,
    triage=triage,
    pillars=pillars,
    nutrition=pc.nutrition,
    program=pc.program,
)
os.makedirs(DRAFTS_DIR, exist_ok=True)
draft_path = os.path.join(DRAFTS_DIR, f"{draft_id}.json")
with open(draft_path, "w", encoding="utf-8") as f:
    json.dump(draft.model_dump(mode="json"), f, indent=2, ensure_ascii=False)
print(f"  Draft saved: {draft_path}")

# Approve all sections for demo
for s in sections:
    s.status = "approved"
draft.status = "fully_approved"
with open(draft_path, "w", encoding="utf-8") as f:
    json.dump(draft.model_dump(mode="json"), f, indent=2, ensure_ascii=False)

# Export PDF with coach branding
from mos_bot.core.coach_pipeline import export_approved_draft
pdf_path = export_approved_draft(draft_id)
if pdf_path:
    print(f"  PDF EXPORTED: {pdf_path}")
else:
    print("  PDF export returned None")

print("\n" + "=" * 60)
print("PIPELINE COMPLETE")
print(f"  Draft ID: {draft_id}")
print(f"  Sections: {len(sections)}")
print(f"  PDF: {pdf_path}")
print("=" * 60)
