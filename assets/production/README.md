# Selected edition artwork

The eight interiors are the Round05 choices confirmed in Round06. Their IDs,
hashes and alt text are recorded in `../illustrations/selected-art.json`.
`../cover.png` is the exact selected **C12-F** master, unchanged.

## Regenerate

```sh
cd compiler
npm start                 # book, EPUB, email CSVs, front/back and KDP wrap
npm run verify            # inspect completed outputs
npm run covers:update     # refresh the checked-in cover previews from that build
```

The editable back copy is `back-cover.json`; layout is `compiler/covers.py`.
Its three endorsements are preserved from the original cover/README.
The bundled PT Serif fonts provide editable, embedded back-cover lettering.

## Files

| File | Use |
| --- | --- |
| `build/*-print.pdf` | KDP interior, black ink, cream paper, 6×9 inches, no bleed |
| `build/*-kdp-cover.pdf` | KDP back + spine + front, CMYK, outer bleed included |
| `build/*-kdp-cover.png`, `.jpg` | 300-DPI wrap previews; upload the PDF to KDP |
| `build/*-digital.pdf`, `.epub` | Digital editions with the new front and interiors |
| `build/*-front-cover.*`, `*-back-cover.*` | Separate cover exports |
| `build/cover-preflight.json` | Dimensions, source resolution and interior hash |
| `assets/full cover.*` | Checked-in snapshot of the generated KDP wrap |
| `assets/back cover.*` | Checked-in back-cover snapshot |
| `assets/cover.jpg`, `cover512.jpg` | Front and README preview |

Always upload the interior and wrap from the **same build**. The checked-in
snapshots currently use 60 pages: 0.15-inch spine, 12.4×9.25-inch full wrap.
The build derives the spine from the final PDF, rounding an odd count up to even.
The wrap front scales uniformly to fill the bleed, with a small symmetric crop
at trim (163.8 native PPI including bleed). Separate front exports remain uncropped.
No spine text; the white 2×1.2-inch area is reserved for KDP's barcode.

## Remaining print-quality issue

**C12-F is 1024×1536: 170.7 PPI at 6×9 inches.** KDP asks for at least 300 DPI.
The 300-DPI PNG/JPEG exports do not invent missing source detail. The PDF retains
that native resolution and the build emits a warning. This is a review package,
not an unconditional print-ready approval: obtain a higher-resolution faithful
master before final submission. A physical proof is also advisable.

The built-in image tool's attempted resolution remake also returned 1024×1536;
it was discarded to preserve the exact approved image. A larger source should
be at least 2000×3000 to retain 300 PPI including bleed (same 2:3 ratio). Replace `assets/cover.png`, then rebuild.
The interiors have sufficient source resolution at their placed size.

The old `.afdesign` files, 63-page template and `assets/social/` are legacy
design/marketing sources, not inputs to this build. They are retained intact;
the new editable production source is the script plus JSON above.

Specifications: [KDP covers](https://kdp.amazon.com/en_US/help/topic/G201953020),
[page-count rounding](https://kdp.amazon.com/en_US/help/topic/G201857950).
