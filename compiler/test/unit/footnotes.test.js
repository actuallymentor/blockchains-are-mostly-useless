import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pdfMarkdown } from '../../modules/markdown.js'
import { inlineFootnotes } from '../../modules/html-decorators.js'

test( 'footnotes move below the paragraph, list or table that references them', () => {

	const markdown = [
		'A paragraph^[first note].',
		'- a list item^[second note]',
		'| a | b |\n| - | - |\n| cell^[third note] | x |'
	].join( '\n\n' )

	const html = inlineFootnotes( pdfMarkdown.render( markdown ) )

	// The bottom footnote section is gone
	assert.doesNotMatch( html, /footnotes-sep/ )

	// Each note follows its container
	assert.match( html, /<\/p><div id='fn1' class='inline_footnote'><sup class='inline_sup'>\[1\]<\/sup>first note/ )
	assert.match( html, /<\/ul><div id='fn2' class='inline_footnote'>.*second note/ )
	assert.match( html, /<\/table><div id='fn3' class='inline_footnote'>.*third note/ )

} )
