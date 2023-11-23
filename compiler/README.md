# book-compiler

Book cover type: paperback, b&w, cream, left to right, inches, 6x9. See [cover calculator](https://kdp.amazon.com/en_US/cover-templates).

**KNOWN ISSUE:** Commas in headings break CSV.

**KNOWN ISSUE:** PDF generation is broken on ARM. Make sure to `brew install chromium` and and run `npm run fix:puppeteer` which replaces "/usr/local/bin/chromium" to `which chromium` value in `node_modules/puppeteer/lib/esm/puppeteer/node/Launcher.js` and `./node_modules/puppeteer/lib/cjs/puppeteer/node/Launcher.js`.

Multimarkdown to epub and pdf.

For importing, conversing and deleting into SQL:

1. `onlycsv=true npm start`
1. `scp ../build/emails-*.csv root@mail.palokaj.co:/root`
1. `ssh root@mail.palokaj.co`
1. `mysql`
1. `use sendy_mail`
1. SQL magic

Ares ID comes from https://mail.palokaj.co/autoresponders-emails?i=3&a=THISONE

```sql
LOAD DATA LOCAL INFILE 'emails-freeTemplate.csv' INTO TABLE ares_emails
FIELDS TERMINATED BY ',' 
ENCLOSED BY '' 
LINES TERMINATED BY '\n'
IGNORE 1 LINES;

LOAD DATA LOCAL INFILE 'emails-courseTemplate.csv' INTO TABLE ares_emails
FIELDS TERMINATED BY ',' 
ENCLOSED BY '' 
LINES TERMINATED BY '\n'
IGNORE 1 LINES;

update ares_emails set html_text = FROM_BASE64(html_text) where ares_id = 5 OR ares_id = 6;

# To delete all of them to re-import
delete from ares_emails where ares_id = 5 OR ares_id = 6;
```

Search/replace:

```sql
UPDATE `table_name` SET `field_name` = replace(same_field_name, 'unwanted_text', 'wanted_text')
```
