"""Extract headline results and citation information from the approved manuscript."""
import argparse
import datetime
import json
import re
from pathlib import Path
from docx import Document
from build_stats import dump


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--paper", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    doc = Document(args.paper)
    paragraphs = [p.text for p in doc.paragraphs]
    inspector = next(p for p in paragraphs if p.startswith("The rule-based inspector in [1],"))
    recognition = re.search(r"recognizes ([\d.]+)%.*?and ([\d.]+)% with thresholds", inspector)
    fewshot = next(p for p in paragraphs if p.startswith("Three real defect images added"))
    found = re.search(r"to (\d+) of the (\d+) held-out", fewshot)
    transfer = []
    header = None
    realism = []
    for table in doc.element.body.xpath(".//w:tbl"):
        rows = [["".join(c.xpath(".//w:t/text()")) for c in r.xpath("./w:tc")] for r in table.xpath("./w:tr")]
        if rows and rows[0][0] == "Training images":
            header, transfer = rows[0], rows[1:]
        if rows and rows[0][:2] == ["Class", "Images"] and "Inception KID" in rows[0]:
            realism = rows
    assert transfer and header and recognition and found
    reference = next(p for p in paragraphs if p.startswith("Dai, J.; Koundinya"))
    result = {"paper_title": paragraphs[1], "year": doc.core_properties.created.year,
              "inspector_published": recognition[1], "inspector_adapted": recognition[2],
              "fewshot_found": int(found[1]), "fewshot_total": int(found[2]),
              "transfer_headers": header, "transfer": transfer, "realism": realism,
              "reference": reference, "reference_url": re.search(r"https://doi.org/\S+", reference)[0],
              "source": "Manuscript v11, Sections 4.5, 5.1–5.4; Tables 7 and 8."}
    dump(args.output / "data" / "paper.json", result)
    config_path = args.output / "data" / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.exists() else {"public_download": False, "zenodo_doi": None,
         "paper_doi": None, "citation_status": "under review", "preview": True,
         "code_license": None, "contact": "samihoque16@gmail.com",
         "academic_contact": "mdsamiul.hoque@utdallas.edu", "corresponding_contact": "kehtar@utdallas.edu",
         "generated": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    dump(config_path, config)
    print("Manuscript results extracted; existing access settings preserved.")


if __name__ == "__main__":
    main()
