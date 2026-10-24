# Content sources

Scientific content is paraphrased from the final manuscript, not generated as a new scientific claim. Numeric dataset summaries are computed from release records. Experimental results are extracted from the manuscript because they cannot be recomputed from image files alone. Operational labels describe the actual private-preview state.

| Page block | Source | Treatment |
|---|---|---|
| Project name, title, authors, affiliation | Final manuscript v11, title page | Project identifier and author names; title extracted by `prepare_content.py` |
| Hero description and motivation | Abstract; Sections 1 and 3.1 | Short paraphrase; no first-of-its-kind or factory-readiness claim |
| Dataset statistics band | Release generation records and source manifest | Computed by `build_stats.py`; no manually typed counts |
| Source and region decision | Section 3.2 | Paraphrase; displayed photograph is explicitly a clean release rendering |
| Clean capture decision | Section 3.3 | Paraphrase of capture-group and counterpart construction |
| Defect formation and four physical-cause summaries | Section 3.4 | Cause-derived geometry/material explanation, not first-principles simulation |
| Label construction | Section 3.5; instance records and exported labels | Box, polygon, and mask drawn separately over the unchanged image |
| Dataset and checks decision | Sections 3.5 and 4.1–4.5 | Capture-group traceability and three evaluation perspectives |
| Gallery labels and metadata | Per-image release records | Whitelisted fields only; selection by `export_samples.py` |
| Gallery counts and coverage | Exported sample index | Calculated sample summary, separate from the full-release totals |
| Clean comparison | Record clean-counterpart identifier | Matched by exact identifier; unavailable counterparts excluded from preview sampling |
| Class composition, instances, and split counts | Release records | Computed by `build_stats.py` |
| Split-protocol explanations | Section 4.1 | Source-disjoint versus product-matched, with group protection |
| Cosmetic supplement and auxiliary counterpart status | Supplement image files; counterpart records inside the uploaded archive | Counts computed; recovered original captures distinguished from rerendering |
| Appearance evidence | Section 5.1, Table 7 | Qualitative summary; manuscript data also extracted into `data/paper.json` |
| Inspector evidence | Section 5.2 | Published versus synthetic-validation-fitted thresholds distinguished; values extracted |
| Detector transfer | Section 4.5, Section 5.3, Table 8 | Table cells extracted unchanged; both operating-point and fixed-confidence columns retained |
| Evidence limitations | Section 6 | One package/setup; overlapping calibration and protocol selection; no factory-readiness claim |
| File-format examples | Release YOLO labels and uploaded archive documentation | Actual sample rows; public folder names match the verified archive; per-image JSONL excerpt explicitly labeled |
| Source attribution | Release source-image manifest | Creator, original URL, original license, modifications; links per displayed image |
| Image and annotation licenses | Data Availability; approved release layout | Image and annotation scopes retained; MIT code license explicitly approved by user on 23 October 2026 |
| Prior study reference | Final manuscript reference 1 | Extracted citation and DOI |
| Provisional citation | Manuscript title/authors and file metadata year | Unpublished status, no invented publication DOI |
| Access and archive descriptions | Published Zenodo record 23600809, verified 24 October 2026 | Both latest archives uploaded and checksums matched; public metadata with restricted files; author email is the current request route |
| Archive size, checksum, folder counts and documentation | Uploaded dataset and generator ZIP copies | Computed by `build_release_info.py`; documentation extracted verbatim; no full-archive URLs exposed |
| Request instructions and email template | User-approved contact addresses and private-deposit state | Name, affiliation, purpose and requested materials; authors review requests; no automatic approval or file delivery |
| Renderer mask and exact-reproduction limitations | Dataset format documentation, generator README and TESTED_PLATFORMS.md in the latest uploaded archives | No exhaustive changed-pixel-mask claim; tested reproduction environments and unverified platforms explicitly distinguished |
| Published DOI and release choices | Zenodo record 23600809 and user decisions, 24 October 2026 | DOI 10.5281/zenodo.23600809 identifies the published record; code MIT; optional VLM files excluded; ZIPs restricted; website repository still private |
| Contact links | User-provided contact details | Personal, institutional, and corresponding-author addresses |
| Private status, buttons, filters, instructions | Preview operation and user request | Interface wording; no experimental claims |
| Homepage reveal slider and playback | Featured release image and its exact clean counterpart | Display-only clipping, not generated intermediate images or a severity model |
| Optional guided walkthrough | Existing method descriptions and release examples | Timed presentation of the same decisions; explicitly not live generation |
| Interactive transfer chart | Manuscript Table 8, extracted `data/paper.json` | All bars and SD whiskers parsed from existing table cells; matched versus full-release comparison selectable; no new inference |
| Search, random specimen, and previous/next | Exported sample index | Browsing controls only; random selection does not change any dataset or scientific seed |

## Asset provenance

Every image served by the sample viewer comes from the openly licensed synthetic release or its existing clean counterpart. The PNG export preserves pixel arrays. WebP thumbnails are display derivatives. Annotation graphics are generated from the same image's release record, not from a detector. No evaluation-reference imagery is included.

## Verification records

`safety/release_before.json` stores a SHA-256 ledger; relative filenames are themselves hashed so private input naming is not exposed. `safety/verification.json` records the final integrity, loader, attribution, and text-policy checks. Browser checks and remaining limitations are recorded in `PREVIEW_REVIEW.md`.
