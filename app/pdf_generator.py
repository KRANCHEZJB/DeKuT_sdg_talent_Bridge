from fpdf import FPDF
import os, io, base64
from datetime import datetime

BRAND_GREEN  = (0, 166, 81)
BRAND_BLUE   = (10, 110, 189)
DARK_BG      = (6, 13, 31)
LIGHT_TEXT   = (241, 245, 249)
MUTED_TEXT   = (148, 163, 184)
GOLD         = (253, 185, 19)

def _base_pdf(landscape=False) -> FPDF:
    orientation = 'L' if landscape else 'P'
    pdf = FPDF(orientation=orientation, unit='mm', format='A4')
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()
    # Dark background
    w = pdf.w; h = pdf.h
    pdf.set_fill_color(*DARK_BG)
    pdf.rect(0, 0, w, h, 'F')
    return pdf

def _decorative_border(pdf: FPDF, color=BRAND_GREEN):
    w = pdf.w; h = pdf.h
    pdf.set_draw_color(*color)
    pdf.set_line_width(1.2)
    pdf.rect(8, 8, w-16, h-16)
    pdf.set_line_width(0.4)
    pdf.rect(11, 11, w-22, h-22)

def _header_block(pdf: FPDF, title_line1: str, title_line2: str = ""):
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*BRAND_GREEN)
    pdf.set_y(18)
    pdf.cell(0, 8, "DEKUT INNOVATION HUB", align='C', ln=True)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 5, "Dedan Kimathi University of Technology · innovate.dekut.ac.ke", align='C', ln=True)
    # Divider
    pdf.set_draw_color(*BRAND_GREEN)
    pdf.set_line_width(0.5)
    cx = pdf.w / 2
    pdf.line(cx - 40, pdf.get_y() + 2, cx + 40, pdf.get_y() + 2)
    pdf.ln(6)
    # Main title
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.cell(0, 12, title_line1, align='C', ln=True)
    if title_line2:
        pdf.set_font("Helvetica", "B", 20)
        pdf.set_text_color(*GOLD)
        pdf.cell(0, 10, title_line2, align='C', ln=True)
    pdf.ln(4)

def _footer(pdf: FPDF, ref: str):
    pdf.set_y(pdf.h - 22)
    pdf.set_draw_color(*MUTED_TEXT)
    pdf.set_line_width(0.3)
    pdf.line(20, pdf.get_y(), pdf.w - 20, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 4, f"Reference: {ref}   ·   Generated: {datetime.utcnow().strftime('%d %B %Y')}   ·   DekUT Innovation Hub", align='C', ln=True)
    pdf.cell(0, 4, "This document is digitally generated and valid without a physical signature.", align='C', ln=True)

def _label_value(pdf: FPDF, label: str, value: str, y_offset=0):
    if y_offset:
        pdf.ln(y_offset)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 5, label.upper(), align='C', ln=True)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.cell(0, 7, value, align='C', ln=True)


def generate_certificate_pdf(
    student_name: str,
    registration_number: str,
    project_name: str,
    ngo_name: str,
    reference_number: str,
    issued_at: datetime,
    hours_worked: int = None,
    outcome_summary: str = None,
) -> bytes:
    pdf = _base_pdf(landscape=True)
    _decorative_border(pdf, GOLD)
    _header_block(pdf, "CERTIFICATE OF COMPLETION", "PROJECT ACHIEVEMENT AWARD")

    # Body
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 7, "This is to certify that", align='C', ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*GOLD)
    pdf.cell(0, 12, student_name, align='C', ln=True)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 5, f"Reg. No: {registration_number}", align='C', ln=True)
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.cell(0, 6, "has successfully completed the project", align='C', ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*BRAND_GREEN)
    # Wrap long project names
    pdf.multi_cell(0, 9, project_name, align='C')
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 6, f"in partnership with  {ngo_name}", align='C', ln=True)
    pdf.ln(6)

    # Stats row
    stats = [("Date Issued", issued_at.strftime("%d %B %Y"))]
    if hours_worked:
        stats.append(("Hours Worked", str(hours_worked)))
    stats.append(("Reference", reference_number))

    col_w = pdf.w / len(stats)
    start_x = 0
    y = pdf.get_y()
    for label, val in stats:
        pdf.set_xy(start_x, y)
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(*MUTED_TEXT)
        pdf.cell(col_w, 5, label.upper(), align='C')
        pdf.set_xy(start_x, y + 5)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*LIGHT_TEXT)
        pdf.cell(col_w, 6, val, align='C')
        start_x += col_w
    pdf.ln(14)

    if outcome_summary:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*MUTED_TEXT)
        summary = outcome_summary[:180] + ("..." if len(outcome_summary) > 180 else "")
        pdf.multi_cell(0, 5, f'"{summary}"', align='C')

    _footer(pdf, reference_number)
    return bytes(pdf.output())


def generate_letter_pdf(
    student_name: str,
    registration_number: str,
    project_name: str,
    ngo_name: str,
    letter_type: str,
    reference_number: str,
    issued_at: datetime,
    admin_name: str = "DekUT Admin",
    custom_body: str = None,
) -> bytes:
    pdf = _base_pdf(landscape=False)
    _decorative_border(pdf, BRAND_BLUE)
    _header_block(pdf, "RECOMMENDATION LETTER")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 5, issued_at.strftime("%d %B %Y"), align='R', ln=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.cell(0, 6, "To Whom It May Concern,", ln=True)
    pdf.ln(4)

    letter_type_label = letter_type.replace("_", " ").title()
    if custom_body:
        body = custom_body
    else:
        body = (
            f"This letter serves as a formal recommendation for {student_name} "
            f"(Registration Number: {registration_number}), a student at Dedan Kimathi University of Technology.\n\n"
            f"{student_name} successfully participated in the project \"{project_name}\" organised through the "
            f"DekUT Innovation Hub in collaboration with {ngo_name}. Throughout this engagement, the student "
            f"demonstrated exceptional commitment, technical competency, and a collaborative spirit.\n\n"
            f"This recommendation is issued in the context of: {letter_type_label}.\n\n"
            f"We at the DekUT Innovation Hub are pleased to recommend {student_name} without reservation and "
            f"are confident they will bring the same dedication and professionalism to future endeavours.\n\n"
            f"Should you require any further information, please do not hesitate to contact us through the "
            f"DekUT Innovation Hub portal."
        )

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*LIGHT_TEXT)
    # Split body into paragraphs
    for para in body.split('\n\n'):
        pdf.multi_cell(0, 6, para.strip())
        pdf.ln(3)

    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*LIGHT_TEXT)
    pdf.cell(0, 6, "Yours sincerely,", ln=True)
    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*BRAND_GREEN)
    pdf.cell(0, 6, admin_name, ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED_TEXT)
    pdf.cell(0, 5, "DekUT Innovation Hub · Dedan Kimathi University of Technology", ln=True)

    _footer(pdf, reference_number)
    return bytes(pdf.output())
