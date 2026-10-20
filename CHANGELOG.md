# Changelog

Book editions are git tags (`v*`, see releases). This log tracks the compiler and build pipeline (`compiler/package.json`).

## [2.0.0] - 2026-10-20

### Breaking
- require Node 24, native ESM; drop the `esm` loader (8bbb4e7)
- drop MOBI and the calibre epub rebuild from releases (733468a)
- paperback folios count physical pages: Preface is page 5, front matter unnumbered (a6c371e)

### Added
- Vivliostyle pdfs with pinned Chrome, toc page numbers via `target-counter` (a6c371e)
- build prints page count and KDP cream spine width (a6c371e)
- `npm run dev`: live preview that refreshes on save (a0356aa, a4d8a6b)
- `npm run verify`: toc/folio, 6x9, embedded fonts, grayscale checks (8cb349d)
- `npm run links`: real link checker, bot blocks reported apart from dead links (8cb349d)
- CI on PRs + manual runs, EPUBCheck, release job, weekly link check (733468a)
- devcontainer with ghostscript, poppler and epubcheck (733468a)
- `book.config.js` holds all book metadata (a0356aa)

### Fixed
- print toc showed `undefined` page numbers with current Chrome (a6c371e)
- build exited 0 on errors (8bbb4e7)
- dead CI actions (`upload-artifact@v2`) (733468a)
- epub: 0 EPUBCheck errors (was 25), no literal "[[TOC]]" chapter, version stamp filled (4a438eb)
- link test scanned no files (8cb349d)
- chapters sort numerically, `10.0` after `2.0` (8cb349d)
- Sass declaration order flipped figure spacing (8bbb4e7)
- dead recommended-reading links now point at archived copies (9296e35)

### Changed
- epub-gen => @lesjoursfr/html-to-epub; html5-to-pdf/pdf-parse removed (4a438eb, a6c371e)
- PT Serif/Sans bundled, no Google Fonts fetch during builds (a6c371e)
- markdown-it 15, ESLint 10 flat config, `node:test` instead of mocha/chai (8bbb4e7, 8cb349d)

### Removed
- tracking pixel in front matter, it only fired at build time (a6c371e)
