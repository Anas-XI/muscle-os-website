import os
import re
from fpdf import FPDF
from datetime import datetime
from mos_bot.config import PDFS_DIR
from pypdf import PdfReader, PdfWriter

LINK_COLOR = (30, 100, 200)
ACCENT_COLOR = (12, 34, 56)
LIGHT_ACCENT = (235, 240, 248)
TEXT_DARK = (40, 40, 40)
TEXT_MED = (80, 80, 80)
TEXT_LIGHT = (160, 160, 160)
BORDER_COLOR = (210, 210, 210)


class ProgramPDF(FPDF):
    def cover_page(self, title, subtitle, date_str, client_name):
        self.add_page()
        self.set_fill_color(*ACCENT_COLOR)
        self.rect(0, 0, 210, 297, "F")

        # Decorative accent bar
        self.set_fill_color(60, 130, 210)
        self.rect(0, 0, 210, 4, "F")

        self.set_y(55)
        # Logo area
        self.set_font("Helvetica", "B", 32)
        self.set_text_color(255, 255, 255)
        self.cell(0, 15, "MUSCLE OS", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 11)
        self.set_text_color(180, 200, 225)
        self.cell(0, 7, "AI-Native Fitness Coaching System", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(15)

        # Decorative divider
        self.set_draw_color(80, 150, 220)
        self.set_line_width(0.6)
        self.line(55, self.get_y(), 155, self.get_y())
        self.ln(20)

        # Program title
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(255, 255, 255)
        self.multi_cell(0, 11, title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

        self.set_font("Helvetica", "", 13)
        self.set_text_color(180, 200, 225)
        self.cell(0, 7, subtitle, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(35)

        # Client info box
        self.set_draw_color(80, 150, 220)
        self.set_fill_color(20, 50, 80)
        self.rect(55, self.get_y(), 100, 30, "DF")
        y_box = self.get_y()
        self.set_y(y_box + 4)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(200, 215, 235)
        self.cell(0, 7, f"Client: {client_name}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, f"Date: {date_str}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_y(y_box + 34)

        self.ln(30)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 145, 170)
        self.cell(0, 5, "CONFIDENTIAL -- Personal Coaching Program", align="C", new_x="LMARGIN", new_y="NEXT")

        # Bottom accent bar
        self.set_fill_color(60, 130, 210)
        self.rect(0, 293, 210, 4, "F")

    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(*TEXT_LIGHT)
            self.cell(95, 4, "Muscle OS -- Coaching Program", align="L")
            self.cell(95, 4, f"Page {self.page_no() - 1}/{{nb}}", align="R",
                      new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(*BORDER_COLOR)
            self.line(10, 10, 200, 10)
            self.ln(5)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "I", 6)
        self.set_text_color(*TEXT_LIGHT)
        self.cell(0, 8, "Muscle OS -- Coaching Program", align="C")

    def section_title(self, num, title):
        # Render with a dark sidebar accent
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*ACCENT_COLOR)
        title_s = self._sanitize(title)
        # Draw accent bar on the left
        x0 = self.get_x()
        y0 = self.get_y()
        self.set_fill_color(*ACCENT_COLOR)
        self.rect(x0, y0, 3, 10, "F")
        self.set_x(x0 + 6)
        self.cell(0, 10, f"{num}. {title_s}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*ACCENT_COLOR)
        self.set_line_width(0.5)
        self.line(10, self.get_y() + 1, 200, self.get_y() + 1)
        self.ln(6)

    def sub_heading(self, text):
        self.set_font("Helvetica", "B", 11.5)
        self.set_text_color(*TEXT_DARK)
        text = self._sanitize(text)
        self.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1.5)

    def body_text(self, text, size=9.5):
        parts = re.split(r"(\[.*?\]\(.*?\))", text)
        for part in parts:
            m = re.match(r"\[(.*?)\]\((.*?)\)", part)
            if m:
                self._link_text(m.group(1), m.group(2), size)
            else:
                txt = self._sanitize(part)
                self.set_font("Helvetica", "", size)
                self.set_text_color(*TEXT_MED)
                self.multi_cell(0, 5, txt, align="L", new_x="LMARGIN", new_y="NEXT")
        self.ln(0.5)

    def _link_text(self, label, url, size=9.5):
        label_s = self._sanitize(label)
        self.set_font("Helvetica", "U", size)
        self.set_text_color(*LINK_COLOR)
        w = self.get_string_width(label_s) + 1
        self.cell(w, 5, label_s, link=url, new_x="END")
        self.set_text_color(*TEXT_MED)

    def bullet(self, text, indent=5, size=9):
        parts = re.split(r"(\[.*?\]\(.*?\))", text)
        first = True
        for part in parts:
            m = re.match(r"\[(.*?)\]\((.*?)\)", part)
            if m:
                if first:
                    x = self.get_x() + indent
                    self.set_x(x)
                    self.set_font("Helvetica", "", size)
                    self.cell(4, 5, "-", new_x="END")
                self._link_text(m.group(1), m.group(2), size)
                first = False
            else:
                txt = self._sanitize(part)
                if txt.strip():
                    self.set_font("Helvetica", "", size)
                    self.set_text_color(*TEXT_MED)
                    self.multi_cell(190 - indent - 10, 5, txt, new_x="LMARGIN", new_y="NEXT")
                    first = False
        if not first:
            self.set_text_color(*TEXT_MED)

    def table_row(self, cells, widths, header=False, links=None):
        cells = [self._sanitize(c) for c in cells]
        h = 7
        y = self.get_y()
        if y + h > 268:
            self.add_page()
            y = self.get_y()
        if header:
            self.set_font("Helvetica", "B", 7.5)
            self.set_fill_color(*ACCENT_COLOR)
            self.set_text_color(255, 255, 255)
        else:
            self.set_font("Helvetica", "", 7.5)
            self.set_text_color(*TEXT_DARK)
        x = 10
        self.set_draw_color(*BORDER_COLOR)
        for i, (cell, w) in enumerate(zip(cells, widths)):
            self.set_xy(x, y)
            if links and i < len(links) and links[i]:
                self.set_font("Helvetica", "U", 7.5)
                self.set_text_color(*LINK_COLOR)
                self.cell(w, h, cell, border=1, align="L", fill=header, link=links[i])
            else:
                tc = (255, 255, 255) if header else TEXT_DARK
                self.set_text_color(*tc)
                self.cell(w, h, cell, border=1, align="L", fill=header)
            x += w
        self.set_xy(10, y + h)
        return y + h

    def _sanitize(self, text: str) -> str:
        replacements = {
            '\u2014': '--', '\u2013': '-',
            '\u2018': "'", '\u2019': "'",
            '\u201c': '"', '\u201d': '"',
            '\u2022': '*', '\u2026': '...',
            '\u2192': '->', '\u2190': '<-',
            '\u2713': 'v', '\u2717': 'x',
            '\u2020': '+', '\u2021': '++',
            '\u2122': '(TM)', '\u00ae': '(R)', '\u00a9': '(C)',
            '\u20ac': 'EUR', '\u00a0': ' ',
            '\ufb01': 'fi', '\ufb02': 'fl',
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        try:
            text.encode('latin-1')
        except UnicodeEncodeError:
            text = text.encode('latin-1', errors='replace').decode('latin-1')
        return text


def markdown_to_pdf(markdown: str, output_path: str, client_name: str = "") -> str:
    pdf = ProgramPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)

    today = datetime.now().strftime("%B %d, %Y")
    pdf.cover_page(
        title="Personal Coaching Program",
        subtitle="Beginner -- Adherence-First (MEC+)",
        date_str=today,
        client_name=client_name,
    )

    lines = markdown.split("\n")
    section_counter = 0
    table_buffer = []
    in_table = False
    in_code = False
    section_heading_pattern = re.compile(r"^## \d+\.")

    for i, line in enumerate(lines):
        stripped = line.strip()

        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue

        # Check for table
        if "|" in stripped and stripped.count("|") > 2:
            table_buffer.append(line)
            in_table = True
            continue
        else:
            if in_table and table_buffer:
                _render_table(pdf, table_buffer)
                table_buffer = []
                in_table = False

        if not stripped:
            continue

        if stripped.startswith("# ") or stripped.startswith("## ") or stripped.startswith("### "):
            level = stripped.count("#")
            title = stripped.lstrip("#").strip()
            # Detect section headings (## N. Title)
            is_section = bool(section_heading_pattern.match(stripped))

            if is_section:
                section_counter += 1
                pdf.add_page()
                pdf.section_title(section_counter, title)
            elif level <= 1:
                # Top-level # title -- skip (already on cover)
                pass
            elif level == 2:
                pdf.sub_heading(title)
            else:
                pdf.set_font("Helvetica", "B", 9.5)
                pdf.set_text_color(*TEXT_DARK)
                pdf.cell(0, 5.5, pdf._sanitize(title), new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1)
        elif stripped.startswith("- ") or stripped.startswith("* "):
            text = stripped[2:]
            text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
            pdf.bullet(text)
        elif stripped.startswith("**") and stripped.endswith("**"):
            text = stripped.strip("*")
            pdf.sub_heading(text)
        elif stripped.startswith("|"):
            pass
        else:
            text = re.sub(r"\*\*(.*?)\*\*", r"\1", stripped)
            pdf.body_text(text)

    if in_table and table_buffer:
        _render_table(pdf, table_buffer)

    pdf.output(output_path)
    return output_path


def _render_table(pdf, lines):
    rows = []
    link_rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        # Detect separator row
        if all(set(c) <= set("-: ") for c in cells):
            continue
        # Parse links from each cell
        row_cells = []
        row_links = []
        for c in cells:
            m = re.match(r"\[(.*?)\]\((.*?)\)", c)
            if m:
                row_cells.append(m.group(1))
                row_links.append(m.group(2))
            else:
                row_cells.append(c)
                row_links.append(None)
        rows.append(row_cells)
        link_rows.append(row_links)

    if not rows:
        return
    col_count = len(rows[0])
    widths = [min(190 // col_count, 48) for _ in range(col_count)]
    gap = 190 - sum(widths)
    if gap > 0:
        widths[-1] += gap

    # Header row
    header_links = link_rows[0] if link_rows else None
    pdf.table_row(rows[0], widths, header=True, links=header_links)

    alt_fill = False
    for idx, row in enumerate(rows[1:], start=1):
        while len(row) < col_count:
            row.append("")
        row_links = link_rows[idx] if idx < len(link_rows) else [None] * col_count

        if alt_fill:
            y_before = pdf.get_y()
        pdf.table_row(row[:col_count], widths, links=row_links[:col_count])
        if alt_fill:
            y_after = pdf.get_y()
            h_fill = y_after - y_before
            pdf.set_fill_color(*LIGHT_ACCENT)
            x = 10
            for w in widths:
                pdf.rect(x, y_before, w, h_fill, "F")
                x += w
            # Redraw text and borders on top of fill
            pdf.set_draw_color(*BORDER_COLOR)
            x = 10
            y = y_before
            for i, (cell, w) in enumerate(zip(row[:col_count], widths)):
                pdf.set_xy(x, y)
                link = row_links[i] if i < len(row_links) else None
                if link:
                    pdf.set_font("Helvetica", "U", 7.5)
                    pdf.set_text_color(*LINK_COLOR)
                else:
                    pdf.set_font("Helvetica", "", 7.5)
                    pdf.set_text_color(*TEXT_DARK)
                pdf.cell(w, h_fill, pdf._sanitize(cell), border=1, link=link)
                x += w
        alt_fill = not alt_fill


def _embed_metadata(pdf_path: str, user_id: str, client_name: str = "", goal: str = ""):
    """Post-hoc metadata embedding via pypdf."""
    try:
        reader = PdfReader(pdf_path)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.add_metadata({
            "/Title": f"Muscle OS Coaching Program — {client_name or user_id}",
            "/Author": "Muscle OS AI",
            "/Subject": f"Personalized {goal} coaching program generated by Muscle OS",
            "/Producer": "Muscle OS / fpdf2 + pypdf",
        })
        with open(pdf_path, "wb") as f:
            writer.write(f)
    except Exception as e:
        print(f"[PDF] Metadata embedding failed: {e}")


def generate_program_pdf(markdown: str, user_id: str, client_name: str = "", goal: str = "") -> str:
    os.makedirs(PDFS_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(PDFS_DIR, f"{user_id}_program_{ts}.pdf")
    try:
        result = markdown_to_pdf(markdown, path, client_name)
        if result:
            _embed_metadata(result, user_id, client_name, goal)
        return result
    except Exception as e:
        print(f"[PDF] Error: {e}")
        return None
