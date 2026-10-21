import { test } from 'node:test'
import assert from 'node:assert/strict'
import mdit from 'markdown-it'
import hierarchy from '../../modules/hierarchy.js'

test( 'headings get hierarchy numbers that continue across renders', () => {

	const md = new mdit().use( hierarchy )

	const first = md.render( '# One\n## Sub\n## Sub\n### Deep' )
	const second = md.render( '# Two\n### Skipped a level' )

	assert.match( first, /<h1>1\. One<\/h1>/ )
	assert.match( first, /<h2>1\.2\. Sub<\/h2>/ )
	assert.match( first, /<h3>1\.2\.1\. Deep<\/h3>/ )
	assert.match( second, /<h1>2\. Two<\/h1>/ )
	assert.match( second, /<h3>2\.1\.1\. Skipped a level<\/h3>/ )

} )
