"""Export an equal-class illustrative subset, without altering source image pixels."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from PIL import Image
from build_stats import dump


def rank(row):
    return hashlib.sha256(row["image_id"].encode()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--release", type=Path, required=True)
    parser.add_argument("--records", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--count", type=int, default=600)
    args = parser.parse_args()
    rows = [json.loads(line) for line in args.records.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    lookup = {r["image_id"]: r for r in rows}
    labels = ["good", "scratch", "contamination", "missing_text", "smeared_text", "combined"]
    quota = args.count // len(labels)
    chosen = {}
    selected_groups = ["TVIC29_C000", "TVIC12_C024"]
    for label in labels:
        pool = [r for r in rows if r["label"] == label and r["clean_counterpart"] in lookup]
        picked = {r["image_id"]: r for r in pool if r["capture_group"] in selected_groups}
        for source in sorted({r["source_id"] for r in pool}):
            available = sorted([r for r in pool if r["source_id"] == source], key=rank)
            for row in available:
                if sum(r["source_id"] == source for r in picked.values()) >= 2:
                    break
                picked[row["image_id"]] = row
        for row in sorted(pool, key=rank):
            if len(picked) >= quota:
                break
            picked[row["image_id"]] = row
        assert len(picked) == quota
        chosen.update(picked)
    assert len(chosen) == args.count
    output = args.output
    exported = set()

    def export_image(row):
        relative = Path("samples") / "images" / row["split"] / (row["image_id"] + ".png")
        target = output / relative
        if row["image_id"] not in exported:
            target.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(args.release / row["image"]) as im:
                clean = Image.frombytes("L", im.size, im.convert("L").tobytes())
                clean.save(target, format="PNG", compress_level=6)
                assert clean.tobytes() == im.convert("L").tobytes()
            exported.add(row["image_id"])
        return relative.as_posix()

    index, records = [], []
    for row in sorted(chosen.values(), key=lambda r: (r["capture_group"] not in selected_groups, r["capture_group"], labels.index(r["label"]))):
        ident = row["image_id"]
        image = export_image(row)
        counterpart = export_image(lookup[row["clean_counterpart"]])
        mask = Path("samples") / "masks" / row["split"] / (ident + ".png")
        (output / mask).parent.mkdir(parents=True, exist_ok=True)
        with Image.open(args.release / row["mask"]) as im:
            Image.frombytes("L", im.size, im.convert("L").tobytes()).save(output / mask, compress_level=6)
        thumb = Path("samples") / "thumbnails" / (ident + ".webp")
        (output / thumb).parent.mkdir(parents=True, exist_ok=True)
        with Image.open(output / image) as im:
            im.thumbnail((480, 240), Image.Resampling.LANCZOS)
            im.save(output / thumb, "WEBP", quality=86)
        for source_name, public_name in (("labels_yolo", "boxes"), ("labels_seg", "polygons")):
            label = Path("samples") / "labels" / public_name / row["split"] / (ident + ".txt")
            (output / label).parent.mkdir(parents=True, exist_ok=True)
            (output / label).write_bytes((args.release / source_name / row["split"] / (ident + ".txt")).read_bytes())
        record = {k: row[k] for k in ["image_id", "source_id", "label", "capture_group", "capture", "split", "pm_split", "marking_technology", "roi_xyxy", "component_classes", "instances", "changed_px"]}
        record["seed"] = str(row["seed"])
        record["components"] = [{k: c[k] for k in ["class", "mechanism", "severity_label", "severity_value", "mask_px"]} for c in row["components"]]
        record.update(image=image, mask=mask.as_posix(), clean_counterpart=counterpart,
                      generator_version="icmarkingsynthetic-generator-1.0")
        detail = Path("samples") / "provenance" / (ident + ".json")
        dump(output / detail, record)
        records.append(record)
        index.append({"id": ident, "source": row["source_id"], "label": row["label"], "group": row["capture_group"],
                      "split": row["split"], "pm_split": row["pm_split"], "technology": row["marking_technology"],
                      "types": row["component_classes"], "severity": sorted({c["severity_label"] for c in row["components"]}),
                      "severity_value": max([c["severity_value"] for c in row["components"]], default=0),
                      "instances": sum(bool(i["visible"] and i.get("polygon")) for i in row["instances"]),
                      "image": image, "thumb": thumb.as_posix(), "mask": mask.as_posix(),
                      "counterpart": counterpart, "detail": detail.as_posix()})
    dump(output / "data" / "sample_index.json", index)
    (output / "samples" / "provenance" / "records.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in records) + "\n", encoding="utf-8")
    dump(output / "data" / "sample_summary.json", {"sample_images": len(index), "class_counts": dict(Counter(r["label"] for r in index)),
         "source_count": len({r["source"] for r in index}), "supporting_clean_images": len(exported) - len(index),
         "selection": "Equal class counts; every source represented; deterministic identifier ranking; only available clean counterparts."})
    print(f"Exported {len(index)} sample images and {len(exported)-len(index)} supporting clean counterparts.", flush=True)


if __name__ == "__main__":
    main()
