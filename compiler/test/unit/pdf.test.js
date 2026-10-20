import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makePdfHtmls } from '../../modules/pdf.js'

const meta = { title: 'Book', author: 'Me', asset_prefix: '../assets' }

test( 'pdf html has front matter, a toc of every chapter and the content', () => {

	const { print, digital } = makePdfHtmls( meta, [
		'<p>Copyright</p>',
		'[[TOC]]',
		'# Chapter one\n\n![x](../assets/a.png)',
		'# Chapter, two?\n\n## Not in toc'
	] )

	// Toc links resolve to the slugged h1 ids
	assert.match( print, /<li><a href="#chapter-one">Chapter one<\/a><\/li><li><a href="#chapter-two">Chapter, two\?<\/a><\/li>/ )
	assert.match( print, /<h1 id="chapter-two"/ )
	assert.doesNotMatch( print, /href="#not-in-toc"/ )

	// Assets point into the build folder, stylesheets per variant
	assert.match( print, /src="assets\/a.png"/ )
	assert.match( print, /href="print.css"/ )
	assert.doesNotMatch( digital, /href="print.css"/ )

} )

test( 'pdf html refuses books without a toc placeholder', () => {
	assert.throws( () => makePdfHtmls( meta, [ '# Only content' ] ), /\[\[TOC\]\]/ )
} )
