# book-compiler

Book cover type: paperback, b&w, cream, left to right, inches, 6x9. See [cover calculator](https://kdp.amazon.com/en_US/cover-templates).

**KNOWN ISSUE:** Commas in headings break CSV.

**KNOWN ISSUE:** PDF generation is broken on ARM. Make sure to `brew install chromium` and and run `npm run fix:puppeteer` which replaces "/usr/local/bin/chromium" to `which chromium` value in `node_modules/puppeteer/lib/esm/puppeteer/node/Launcher.js` and `./node_modules/puppeteer/lib/cjs/puppeteer/node/Launcher.js`.

**KNOWN ISSUE:** Mysql needs to have local files enabled, this can be done with `SET GLOBAL local_infile=1;`.

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
-- # Import the autoresponder csv
LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/emails-courseTemplate.csv' INTO TABLE ares_emails
FIELDS TERMINATED BY ',' 
ENCLOSED BY '' 
LINES TERMINATED BY '\n'
IGNORE 1 LINES;

-- # This needs to be the ares_id of the autoresponder list, found in the ?a= portion of the query string
update ares_emails set html_text = FROM_BASE64(html_text) where ares_id = 9;
update ares_emails set title = FROM_BASE64(title) where ares_id = 9;

-- # To delete all of them to re-import
delete from ares_emails where ares_id = 9;
```

Search/replace:

```sql
UPDATE `table_name` SET `field_name` = replace(same_field_name, 'unwanted_text', 'wanted_text')
```

If using the free email template too:

```sql
LOAD DATA LOCAL INFILE 'emails-freeTemplate.csv' INTO TABLE ares_emails
FIELDS TERMINATED BY ',' 
ENCLOSED BY '' 
LINES TERMINATED BY '\n'
IGNORE 1 LINES;

-- Then the same as the above
```