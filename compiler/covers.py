"""Build the selected front, matching back and page-count-specific KDP wrap.

Uses the actual paperback PDF, never the old 63/80-page Affinity template.
Run with /usr/bin/python3 covers.py [--update-assets] after building the book.
"""
import argparse
import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
ASSETS = ROOT / "assets"
TITLE = "Blockchains are mostly useless"
INCH = 72
TRIM_W, TRIM_H, BLEED = 6 * INCH, 9 * INCH, 0.125 * INCH
NAVY, ORANGE, CREAM = "#082640", "#F45111", "#FCF9EF"


def command(*args):
    subprocess.run([str(arg) for arg in args], check=True)


def pdf_file(suffix):
    return BUILD / f"{TITLE}-{suffix}.pdf"


def new_pdf(path, width, height):
    page = canvas.Canvas(str(path), pagesize=(width, height), invariant=1)
    page.setTitle(TITLE)
    page.setAuthor("Mentor Palokaj")
    page.setFillColor(HexColor(CREAM))
    page.rect(0, 0, width, height, fill=1, stroke=0)
    return page


def draw_back(page, x, y, copy):
    """Typeset the existing endorsements; keep the barcode area empty."""
    left, top, width = x + 34, y + TRIM_H - 40, TRIM_W - 68
    page.setFont("BookBold", 25)
    for index, line in enumerate(copy["heading"].splitlines()):
        page.setFillColor(HexColor(NAVY if index == 0 else ORANGE))
        page.drawString(left, top - 30 * index, line)
    cursor = top - 78
    style = ParagraphStyle("endorsement", fontName="Book", fontSize=11.5,
                           leading=16, textColor=HexColor(NAVY))
    for endorsement in copy["endorsements"]:
        paragraph = Paragraph(escape(endorsement["quote"]), style)
        _, height = paragraph.wrap(width, TRIM_H)
        paragraph.drawOn(page, left, cursor - height)
        cursor -= height + 20
        page.setFillColor(HexColor(NAVY))
        page.setFont("BookBold", 10)
        page.drawString(left, cursor, endorsement["author"])
        page.setFont("Book", 9)
        page.drawString(left, cursor - 14, endorsement["affiliation"])
        cursor -= 42
    if cursor < 130:
        raise ValueError("Back copy enters the reserved barcode area")
    # KDP supplies the barcode. No fake ISBN or template labels in the upload.
    page.setFillColor(HexColor("#FFFFFF"))
    page.rect(x + TRIM_W - 2.25 * INCH, y + 0.25 * INCH,
              2 * INCH, 1.2 * INCH, fill=1, stroke=0)


def raster(pdf, suffix, *, jpeg=False, size=None):
    prefix = BUILD / f"{TITLE}-{suffix}"
    args = ["pdftoppm", "-singlefile", "-r", "300"]
    args += ["-jpeg", "-jpegopt", "quality=95"] if jpeg else ["-png"]
    if size:
        args += ["-scale-to", str(size)]
    command(*args, pdf, prefix)
    return prefix.with_suffix(".jpg" if jpeg else ".png")


def build(update_assets=False):
    print_pdf = pdf_file("print")
    reader = PdfReader(print_pdf)
    pages = len(reader.pages)
    if any(abs(float(p.mediabox.width) - TRIM_W) > 0.1 or
           abs(float(p.mediabox.height) - TRIM_H) > 0.1 for p in reader.pages):
        raise ValueError("Cover requires a 6x9-inch paperback interior")
    # KDP rounds an odd interior count up to an even count.
    kdp_pages = math.ceil(pages / 2) * 2
    spine = kdp_pages * 0.0025 * INCH  # Black ink on cream paper.
    full_w, full_h = 2 * TRIM_W + spine + 2 * BLEED, TRIM_H + 2 * BLEED
    for name, filename in [("Book", "PT_Serif-Web-Regular.ttf"),
                           ("BookBold", "PT_Serif-Web-Bold.ttf")]:
        pdfmetrics.registerFont(TTFont(name, ROOT / "compiler/fonts" / filename))
    copy = json.loads((ASSETS / "production/back-cover.json").read_text())
    front = ASSETS / "cover.png"
    image_w, image_h = ImageReader(front).getSize()
    if abs(image_w / image_h - 2 / 3) > 0.005:
        raise ValueError("Selected front must have a 2:3 aspect ratio")

    front_pdf = pdf_file("front-cover")
    page = new_pdf(front_pdf, TRIM_W, TRIM_H)
    page.drawImage(str(front), 0, 0, width=TRIM_W, height=TRIM_H)
    page.showPage()
    page.save()

    back_pdf = pdf_file("back-cover")
    page = new_pdf(back_pdf, TRIM_W, TRIM_H)
    draw_back(page, 0, 0, copy)
    page.showPage()
    page.save()

    rgb_wrap = pdf_file("kdp-cover-rgb")
    page = new_pdf(rgb_wrap, full_w, full_h)
    draw_back(page, BLEED, BLEED, copy)
    # Fill the outer bleed with actual artwork, cropped symmetrically at trim.
    front_x = BLEED + TRIM_W + spine
    art_width = max(TRIM_W + 2 * BLEED, full_h * image_w / image_h)
    art_height = art_width * image_h / image_w
    page.saveState()
    clip = page.beginPath()
    clip.rect(front_x, 0, TRIM_W + BLEED, full_h)
    page.clipPath(clip, stroke=0)
    page.drawImage(str(front), front_x + (TRIM_W - art_width) / 2, (full_h - art_height) / 2,
                   width=art_width, height=art_height)
    page.restoreState()
    # The narrow spine stays blank, including if future edits reach 80 pages.
    page.showPage()
    page.save()
    wrap = pdf_file("kdp-cover")
    command("gs", "-q", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.7", "-sColorConversionStrategy=CMYK",
            "-dProcessColorModel=/DeviceCMYK", "-dEmbedAllFonts=true",
            "-dDownsampleColorImages=false", f"-sOutputFile={wrap}", rgb_wrap)
    rgb_wrap.unlink()

    raster(front_pdf, "front-cover")
    front_jpg = raster(front_pdf, "front-cover", jpeg=True)
    thumbnail = raster(front_pdf, "front-cover-512", jpeg=True, size=512)
    back_png = raster(back_pdf, "back-cover")
    wrap_png = raster(wrap, "kdp-cover")
    wrap_jpg = raster(wrap, "kdp-cover", jpeg=True)
    native_ppi = min(image_w / 6, image_h / 9)
    wrap_ppi = image_w / (art_width / INCH)
    report = {
        "selected_front": "C12-F", "interior_pages": pages, "kdp_pages": kdp_pages,
        "paper": "cream", "ink": "black", "interior_bleed": False,
        "trim_inches": [6, 9], "bleed_inches": 0.125,
        "spine_inches": round(spine / INCH, 4),
        "wrap_inches": [round(full_w / INCH, 4), round(full_h / INCH, 4)],
        "front_source_pixels": [image_w, image_h], "front_native_ppi": round(native_ppi, 2),
        "wrap_front_native_ppi": round(wrap_ppi, 2),
        "raster_export_ppi": 300, "spine_text": False,
        "barcode": "Reserved 2 x 1.2 inches; KDP supplies barcode",
        "interior_sha256": hashlib.sha256(print_pdf.read_bytes()).hexdigest(),
        "front_sha256": hashlib.sha256(front.read_bytes()).hexdigest(),
        "warnings": (["Selected C12-F source is below 300 PPI in the full wrap. Raster exports are 300 DPI, but do not add source detail. Obtain a higher-resolution master before submission and inspect a physical proof."] if wrap_ppi < 300 else []),
        "specification": "https://kdp.amazon.com/en_US/help/topic/G201953020"
    }
    (BUILD / "cover-preflight.json").write_text(json.dumps(report, indent=2) + "\n")
    if update_assets:
        for source, target in [(front_jpg, "cover.jpg"), (thumbnail, "cover512.jpg"),
                               (wrap, "full cover.pdf"), (wrap_png, "full cover.png"),
                               (wrap_jpg, "full cover.jpg"), (back_pdf, "back cover.pdf"),
                               (back_png, "back cover.png")]:
            shutil.copyfile(source, ASSETS / target)
        shutil.copyfile(BUILD / "cover-preflight.json", ASSETS / "production/cover-preflight.json")
    print(f"Cover: {kdp_pages} pages, {spine / INCH:.4f}in spine; native front {native_ppi:.1f}ppi")
    for warning in report["warnings"]:
        print(f"WARNING: {warning}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--update-assets", action="store_true")
    build(parser.parse_args().update_assets)
