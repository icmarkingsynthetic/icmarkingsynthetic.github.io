# ICMarkingSynthetic project website

Project website: https://icmarkingsynthetic.github.io/. The Zenodo record is published at DOI `10.5281/zenodo.23600809`, with both checked archives restricted. The project owner confirmed corresponding-author approval for public metadata and a public project page on 24 October 2026. The site links to the record and provides email-based access requests. No full-archive download URLs are present. Deployment is gated by the automated checks below.

## Open locally

From this folder, run `python -m http.server 8878 --bind 127.0.0.1`. Open `http://127.0.0.1:8878`. Keep the server running while viewing. All fonts, scripts, styles, and specimen assets are local; external attribution links open only when selected.

## Included

- Responsive overview, generation guidelines, and dataset composition.
- A deterministic, balanced sample browser with source, severity, and split filters.
- Clean-counterpart comparison with separate boxes, polygons, and renderer-mask controls.
- Manuscript-derived evaluation results with limitations beside the numbers.
- Annotation examples, source attribution, provisional citation, and email-based research-access instructions.
- Archive sizes, SHA-256 checksums, folder counts, and documentation extracted from the uploaded ZIP copies.
- Homepage clean-to-defect reveal slider with optional playback and all image classes.
- Play/pause guided method walkthrough using existing examples, not live generation.
- Search by identifier or class, random-sample exploration, and previous/next specimen navigation.
- Interactive transfer chart: select the measure, comparison population, and ordering; inspect means, SD, false alarms, and real-pixel use together.
- Reading progress, current-section navigation, and subtle reveal transitions with reduced-motion support.

## Rebuild and verify

The tools read external inputs but write only within the preview folder. Supply the actual local input paths at run time; private input locations are not embedded in the distributable files.

1. `python tools/build_stats.py --release <release> --records <records-jsonl> --sources <source-manifest> --cosmetic <cosmetic-images> --output .`
2. `python tools/export_samples.py --release <release> --records <records-jsonl> --output .`
3. `python tools/prepare_content.py --paper <final-manuscript-docx> --output .`
4. `python tools/build_release_info.py --dataset <dataset-zip> --code <generator-zip> --output data/release.json`
5. `npm install --ignore-scripts` then `npm run build`. This renders `index.template.html` from the same data files and display functions, using the pinned jsdom development dependency. No browser or remote data service is used by the build.
6. `python tools/verify_preview.py --site . --release <release> --records <records-jsonl>`

Run the archive-information export before verification when either archive changes. The email button opens a message template in the visitor's email app. It does not submit a request, grant access, or automatically send files.

Python requirements: Pillow and python-docx. The browser runtime needs no package installation. The verifier must pass before every commit or deployment. Automatic push checks have read-only permissions. The separate manual Pages workflow checks content before packaging tracked static assets and deploying; it refuses to run while the repository is private. Enable Pages only after the final publication review.

Local screenshots, the original-release hash ledger, Python caches, environment files, and full archives are excluded from the repository. The sanitized site, sample assets, content-source map, generating tools, and verification summary are included. Original-release integrity verification requires the locally retained ledger; repository-only checks do not claim to revalidate files that are not present.

## Input integrity and rights

Sample PNG pixel arrays are checked against their release originals. Embedded metadata is removed without changing the image pixels. Thumbnails are smaller display derivatives, used for the opening comparison and gallery. Opening a specimen displays original-resolution PNGs. Readable page content is prebuilt; interactive controls load their data on first interaction. No real reference images, crops, masks, or overlays are included. A full content-hash ledger checks that the original release is unchanged.

Every sample displays the original creator and license. The attributions section also records source modifications. The website does not relabel source images as public domain.

## Release state and remaining checks

- Repository owner: `icmarkingsynthetic`; public repository and website publication are approved by the project owner.
- Code license: MIT. Optional vision-language conversation files are excluded.
- Original auxiliary clean captures were recovered and included. Exact reproduction and platform limits are documented in the generator archive's tested-platforms file, reproduced in the access section.
- Both latest archives are uploaded and checksum-verified in the published record. Files remain restricted.
- Requests go to the institutional email supplied by the author; approval is manual. The public Zenodo record includes the same instructions.
- The automated website check publishes a Lighthouse report; performance, accessibility, and best-practice scores must each exceed 90 before deployment.

`data/config.json` keeps `public_download` false and stores the published `zenodo_doi`. The record was verified without login: its metadata are public and its file access is restricted. No automatic publication action is connected to this configuration. Pages deployment requires an explicit manual workflow run after the checks pass.
