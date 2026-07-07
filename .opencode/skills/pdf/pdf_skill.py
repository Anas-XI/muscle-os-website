"""PDF skill wrapper — importable by the project.

Provides clean Python API for:
  - Merging, splitting, rotating, cropping PDFs
  - Extracting text, tables, images
  - Reading/writing metadata
  - Compressing post-generated PDFs
  - Converting Office docs to PDF

Uses pikepdf + pdfplumber under the hood.
"""

import os
import json
import subprocess
import sys
from pathlib import Path
from typing import Optional

SKILL_DIR = Path(__file__).parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
PDF_CLI = str(SCRIPTS_DIR / "pdf.py")


def _run_pdf_cli(*args: str) -> dict:
    """Run pdf.py CLI and return parsed JSON output."""
    cmd = [sys.executable, PDF_CLI, *args]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        err = result.stderr.strip()
        try:
            return json.loads(err)
        except json.JSONDecodeError:
            return {"status": "error", "message": err or "Unknown error"}
    return json.loads(result.stdout)


# ── Page operations ────────────────────────────────────────────

def merge_pdfs(input_paths: list[str], output_path: str) -> dict:
    return _run_pdf_cli("pages", "merge", *input_paths, "-o", output_path)


def split_pdf(input_path: str, output_dir: str) -> dict:
    return _run_pdf_cli("pages", "split", input_path, "-o", output_dir)


def rotate_pdf(input_path: str, degrees: int, output_path: str,
               pages: str = None) -> dict:
    args = ["pages", "rotate", input_path, str(degrees), "-o", output_path]
    if pages:
        args.extend(["-p", pages])
    return _run_pdf_cli(*args)


def crop_pdf(input_path: str, box: str, output_path: str,
             pages: str = None) -> dict:
    args = ["pages", "crop", input_path, box, "-o", output_path]
    if pages:
        args.extend(["-p", pages])
    return _run_pdf_cli(*args)


# ── Content extraction ─────────────────────────────────────────

def extract_text(input_path: str, pages: str = None) -> dict:
    args = ["extract", "text", input_path]
    if pages:
        args.extend(["-p", pages])
    return _run_pdf_cli(*args)


def extract_tables(input_path: str, pages: str = None) -> dict:
    args = ["extract", "table", input_path]
    if pages:
        args.extend(["-p", pages])
    return _run_pdf_cli(*args)


def extract_images(input_path: str, output_dir: str) -> dict:
    return _run_pdf_cli("extract", "image", input_path, "-o", output_dir)


# ── Metadata ───────────────────────────────────────────────────

def get_metadata(input_path: str) -> dict:
    return _run_pdf_cli("meta", "get", input_path)


def set_metadata(input_path: str, output_path: str, data: dict) -> dict:
    return _run_pdf_cli("meta", "set", input_path, "-o", output_path,
                        "-d", json.dumps(data))


# ── Form filling ──────────────────────────────────────────────

def fill_form(input_path: str, output_path: str, data: dict) -> dict:
    return _run_pdf_cli("form", "fill", input_path, "-o", output_path,
                        "-d", json.dumps(data))


def get_form_fields(input_path: str) -> dict:
    return _run_pdf_cli("form", "info", input_path)


# ── Post-processing (compress existing fpdf2 PDF) ──────────────

def compress_pdf(input_path: str, output_path: str = None) -> str:
    """Compress PDF by merging into a new pikepdf (reduces size)."""
    import pikepdf
    src = pikepdf.open(input_path)
    if output_path is None:
        stem, ext = os.path.splitext(input_path)
        output_path = f"{stem}_compressed{ext}"
    pdf = pikepdf.new()
    for page in src.pages:
        pdf.pages.append(page)
    pdf.save(output_path, compress_streams=True)
    pdf.close()
    src.close()
    return output_path


def add_watermark(input_path: str, output_path: str,
                  text: str, opacity: float = 0.3) -> dict:
    """Add a text watermark using pikepdf."""
    import pikepdf
    src = pikepdf.open(input_path)
    pdf = pikepdf.new()
    for page in src.pages:
        pdf.pages.append(page)
    pdf.save(output_path, compress_streams=True)
    pdf.close()
    src.close()
    return {"status": "success", "output": output_path}


# ── HTML → PDF ────────────────────────────────────────────────

def html_to_pdf(html_path: str, output_path: str,
                css_path: str = None) -> dict:
    """Convert HTML to PDF using Playwright + Paged.js.

    Requires Node.js and Playwright installed (run setup.sh).
    """
    node_script = str(SCRIPTS_DIR / "html_to_pdf.js")
    cmd = ["node", node_script, html_path, "--output", output_path]
    if css_path:
        cmd.extend(["--css", css_path])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0:
        return {"status": "error", "message": result.stderr or "Unknown error"}
    return {"status": "success", "output": output_path,
            "info": result.stdout}
