# book-compiler

Markdown in `../book` → digital pdf, KDP paperback pdf, epub and Sendy email csvs in `../build`.

## Quick reference

| Command | Does |
| --- | --- |
| `npm run dev` | Live preview of the paperback, refreshes on save. `npm run dev digital` for the digital layout |
| `npm start` | Full build into `../build` |
| `npm run verify` | Checks the build: toc pages and folios match, 6x9, fonts embedded, grayscale print |
| `npm test` | Unit tests |
| `npm run links` | Checks every link in the book (network). Bot-blocked sites are listed, dead links fail |
| `npm run lint` | ESLint |

Env flags for `npm start`: `onlypdf`, `onlyepub`, `onlycsv` build one output, `debug` keeps the intermediate html, `verbose` logs steps, `dirty` keeps the old build folder.

## Setup

- Node from `.nvmrc` (`nvm use`), then `npm ci`
- `ghostscript` (print pdf) and `poppler-utils` (`npm run verify`)
- Or open the repo in the devcontainer, which has everything incl. `epubcheck`
- First pdf build downloads the pinned Chrome that Vivliostyle renders with

## Writing

- Chapters: `../book/<number> - <name>.md`, read in numeric order (`10.0` after `2.0`)
- Files before the one holding `[[TOC]]` are front matter, everything after is the book. The toc is generated from the `# h1` headings
- Footnotes: `[^text]`
- Images: `../assets/...`, copied into the build automatically
- `%%LASTEDIT%%` and `%%BOOKVERSION%%` are filled from the last commit date and latest git tag
- Book metadata (title, author, Sendy ids): `book.config.js`

## How it works

| Output | Made by |
| --- | --- |
| `*-digital.pdf` | [Vivliostyle](https://vivliostyle.org) renders `pdf.css` layout, toc numbers via CSS `target-counter()` |
| `*-print.pdf` | Same plus `print.css` (gutters, mirrored folios, chapters start recto), then ghostscript to grayscale |
| `*.epub` | [html-to-epub](https://github.com/lesjoursfr/html-to-epub), bundled fonts, patched opf template in `templates/` |
| `emails-*.csv` | Sendy autoresponder rows, one email per `##` section, base64 subject and html |

Styles live in `modules/styles`: `style.scss` (everything), `pdf.scss` (+ paged media), `print.scss` (paperback only).

## Release

1. Tag: `git tag v2.0.0 && git push --tags`
2. CI builds, verifies, runs EPUBCheck and publishes a GitHub release with the pdfs and epub
3. The build log prints the page count and KDP cream spine width. Spine text needs 79+ pages, cover template: [KDP cover calculator](https://kdp.amazon.com/en_US/cover-templates). Paperback: b&w, cream, 6x9 inch

## Gotchas

- **Pagination depends on the Chrome build.** It is pinned in `modules/pdf.js` (`browser`). Bump on purpose and eyeball the pdf
- **Folios count physical pages** (Preface is page 5): Vivliostyle breaks `target-counter()` when the page counter is reset
- **Chrome sandbox stays on.** Ubuntu 24.04 needs `sysctl kernel.apparmor_restrict_unprivileged_userns=0`, Docker needs `--security-opt seccomp=unconfined` (devcontainer has it)
- **Commas in `##` headings** are safe: email subjects are base64, so the csv never needs quoting

## Sendy import

The csv columns match Sendy's `ares_emails` table. `title` and `html_text` are base64 so commas and quotes survive the import.

```bash
mysql --local-infile=1 -u root -p'YOUR_DATABASE_PASSWORD'
```

```sql
-- MySQL needs local files enabled: SET GLOBAL local_infile=1;
use sendy_mail

-- Import the autoresponder csv
LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/emails-courseTemplate.csv' INTO TABLE ares_emails
FIELDS TERMINATED BY ','
ENCLOSED BY ''
LINES TERMINATED BY '\n'
IGNORE 1 LINES;

-- ares_id is the autoresponder list, the ?a= part of https://mail.palokaj.co/autoresponders-emails?i=3&a=THISONE
update ares_emails set html_text = FROM_BASE64(html_text) where ares_id = 9;
update ares_emails set title = FROM_BASE64(title) where ares_id = 9;

-- To delete all of them to re-import
delete from ares_emails where ares_id = 9;

-- Search/replace
UPDATE `table_name` SET `field_name` = replace(same_field_name, 'unwanted_text', 'wanted_text');
```

Free-chapter emails (`emails-freeTemplate.csv`) import the same way.
