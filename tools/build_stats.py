"""Build dataset statistics and a content-hash integrity ledger from read-only inputs."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from PIL import Image


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")


def ledger(root):
    output = {}
    for path in sorted(root.rglob("*")):
        if path.is_file():
            key = hashlib.sha256(path.relative_to(root).as_posix().encode()).hexdigest()
            with path.open("rb") as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
            output[key] = {"bytes": path.stat().st_size, "sha256": digest}
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--release", type=Path, required=True)
    parser.add_argument("--records", type=Path, required=True)
    parser.add_argument("--sources", type=Path, required=True)
    parser.add_argument("--cosmetic", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = args.output / "data"
    rows = [json.loads(line) for line in args.records.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    raw_sources = json.loads(args.sources.read_text(encoding="utf-8-sig"))
    image_ids = {row["image_id"] for row in rows}
    missing = [row for row in rows if row["clean_counterpart"] not in image_ids]
    sizes = Counter()
    for row in rows:
        with Image.open(args.release / row["image"]) as image:
            sizes[f"{image.width} × {image.height}"] += 1
    class_order = ["good", "scratch", "contamination", "missing_text", "smeared_text", "combined"]
    table = []
    for label in class_order:
        subset = [row for row in rows if row["label"] == label]
        table.append({"label": label, "images": len(subset),
                      "instances": sum(bool(i["visible"] and i.get("polygon")) for r in subset for i in r["instances"]),
                      "source_disjoint": dict(Counter(r["split"] for r in subset)),
                      "product_matched": dict(Counter(r["pm_split"] for r in subset))})
    stats = {"images": len(rows), "image_classes": len(table),
             "defect_types": len({c for r in rows for c in r["component_classes"]}),
             "sources": len({r["source_id"] for r in rows}),
             "capture_groups": len({r["capture_group"] for r in rows}),
             "visible_instances": sum(r["instances"] for r in table),
             "image_sizes": dict(sizes), "cosmetic_images": len(list(args.cosmetic.rglob("*.png"))),
             "auxiliary_counterparts_needed": len({r["clean_counterpart"] for r in missing}),
             "images_needing_auxiliary_counterparts": len(missing),
             "source_disjoint": dict(Counter(r["split"] for r in rows)),
             "product_matched": dict(Counter(r["pm_split"] for r in rows)),
             "classes": table,
             "severity_components": dict(Counter(c["severity_label"] for r in rows for c in r["components"])),
             "package_families": dict(Counter(r["package_group"] for r in raw_sources))}
    sources = [{"id": s["top_view_id"], "url": s["source_description_page"],
                "author": s["source_creator"], "license": s["source_license"],
                "license_url": s["source_license_url"], "family": s["package_group"],
                "modifications": s["processing"]} for s in raw_sources]
    dump(data / "stats.json", stats)
    dump(data / "sources.json", sources)
    print(json.dumps(stats, indent=2), flush=True)
    dump(args.output / "safety" / "release_before.json", ledger(args.release))
    print("Read-only integrity ledger complete.", flush=True)


if __name__ == "__main__":
    main()
