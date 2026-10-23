# Local preview review

## Delivery state

Private local preview only. The HTTP server binds to the loopback interface. Both archives are saved in an unpublished deposit; the site displays the reserved DOI and email-based access instructions. Full archive links are absent. No public deployment or record publication was performed.

## Access update, 23 October 2026

- Reserved DOI `10.5281/zenodo.23600809` is visibly labeled as reserved, not registered. No public record landing page is claimed.
- The request button prepares an email to the institutional contact with fields for name, affiliation, research purpose, and requested material. No message is sent by the page.
- Archive sizes, checksums, folder counts, and documentation are extracted from the verified uploaded ZIP copies.
- The DOI copy control displayed confirmation. Browser clipboard contents were not independently confirmed.
- Desktop and phone (390 by 844 pixels) access cards were inspected. Neither had horizontal page overflow. Screenshots are in `screenshots/access-desktop.png` and `screenshots/access-phone.png`.
- The specimen viewer loaded a scratch example, its stored clean counterpart, boxes, polygons, and renderer-mask controls without application console errors. The temporary viewport override was reset.
- No full ZIP links were found in the rendered page. The source checker also rejects such URLs.
- Content extraction now preserves previously approved access configuration.
- Final verification passed: all 600 exported sample images match original decoded pixels; all 40 sources have attribution; all 46,465 release-file hashes are unchanged; text-policy scan has zero hits; public downloads remain disabled.

## Completed checks

- Browser initialized all computed statistics, the gallery, manuscript-derived results, and citation without console errors.
- At a desktop viewport of 1440 by 1000 pixels, the document width did not exceed the viewport.
- At a phone viewport of 390 by 844 pixels, the document width did not exceed the viewport. Mobile navigation opened and closed correctly.
- Filtering scratch images returned 100 examples; narrowing to the featured source returned 3 examples. All displayed gallery images loaded.
- The selected scratch viewer displayed its original bounding box and polygon. The renderer-mask toggle inserted the per-image mask. The comparison slider reached the clean-counterpart view.
- The combined-class filter returned 100 examples. The tested combined specimen displayed two distinct component boxes.
- The temporary viewport override was reset after testing.
- Visual desktop and phone screenshots were inspected during the browser check. The browser's long-page screenshot stitching had repeated strips; it is not treated as a publication-ready screenshot.

## Reproducible file checks

Run `tools/verify_preview.py` for the authoritative current counts, text-policy check, PNG pixel equality, attribution coverage, and original-release content-hash comparison. Its output is `safety/verification.json`.

## Remaining limitations

## Interactive additions checked

- Homepage slider at 25 percent clipped only the synthetic view and annotation overlay; the clean counterpart loaded at its original width. Class switching updated the image and label. Comparison playback started and paused correctly.
- Searching the featured capture identifier returned its six image classes. Next/previous navigation kept the matching generation record and image together within that selection.
- The guided walkthrough advanced through the method and paused. These are existing release examples, explicitly labeled as an explanation rather than live generation.
- The chart rendered eight methods per selected comparison. Its full-release product-matched value matched the extracted manuscript cell. Switching to false boxes displayed the matching false-alarm results and real-defect-pixel disclosure.
- The phone layout at 390 pixels had no horizontal page overflow. Chart rows, selectors, and walkthrough controls were visually inspected. The viewport override was then reset.
- Browser console reported no application errors. No images, release files, scientific measurements, or publication settings were changed.

## Remaining limitations

- Formal Lighthouse testing has not been performed; no score is claimed.
- No real-reference images are displayed. The evidence table contains aggregate numbers extracted from the final manuscript.
- Generation steps use clearly labeled clean and defective release examples, not invented intermediate renderings.
- The recovered auxiliary original captures are included in the dataset archive and described on the page. Exact regeneration remains unresolved; masks are not exhaustive changed-pixel support.
- Archive loaders were checked separately. The sample browser is not a model-training application.
- The page uses a fixed light palette: off-white, white cards, pale sage sections, and dark green accents. System dark mode does not change it.
