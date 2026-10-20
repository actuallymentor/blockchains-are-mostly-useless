/**
 * Checks the finished build in ../build, run after `npm start`
 * Needs poppler-utils (pdftotext, pdfinfo, pdffonts, pdfimages)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'child_process'
import { existsSync, statSync, readFileSync } from 'fs'

const build = `${ import.meta.dirname }/../../build`
const title = 'Blockchains are mostly useless'
const file = suffix => `${ build }/${ title }${ suffix }`

// Poppler cli helpers, stderr is noisy about long pdf name tokens so it is dropped
const run = ( command, ...args ) => execFileSync( command, args, { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ] } )
const pageText = ( pdf, page ) => run( 'pdftotext', '-f', page, '-l', page, '-layout', pdf, '-' )
const squash = text => text.replace( /\s+/g, ' ' ).trim()

// Toc lines look like "Chapter title - 12"
const tocEntries = pdf => {

	const pages = Number( run( 'pdfinfo', pdf ).match( /Pages:\s+(\d+)/ )[1] )

	for( let page = 1; page <= pages; page++ ) {
		const text = pageText( pdf, page )
		if( !text.includes( 'Table of Contents' ) ) continue
		return Array.from( text.matchAll( /^\s*(.+?) - (\d+)\s*$/gm ), ( [ , heading, number ] ) => ( { heading: squash( heading ), page: Number( number ) } ) )
	}

	return []

}

for( const variant of [ 'print', 'digital' ] ) {

	const pdf = file( `-${ variant }.pdf` )

	test( `${ variant } pdf is a 6x9 inch book`, () => {
		assert.ok( existsSync( pdf ), `${ pdf } missing` )
		assert.match( run( 'pdfinfo', pdf ), /Page size:\s+432 x 648 pts/ )
	} )

	test( `${ variant } pdf toc points at the right pages`, () => {

		const entries = tocEntries( pdf )
		assert.ok( entries.length > 5, 'toc has too few entries' )

		for( const { heading, page } of entries ) {

			const lines = pageText( pdf, page ).split( '\n' ).map( squash ).filter( Boolean )

			// The chapter heading sits at the top of its page (it may wrap), and the folio printed on it matches
			const top = lines.slice( 0, 4 ).join( ' ' )
			assert.ok( top.includes( heading ), `"${ heading }" not at the top of page ${ page }` )
			assert.equal( lines.at( -1 ), String( page ), `page ${ page } shows folio ${ lines.at( -1 ) }` )

		}

	} )

	test( `${ variant } pdf embeds all fonts`, () => {
		const rows = run( 'pdffonts', pdf ).split( '\n' ).slice( 2 ).filter( Boolean )
		const missing = rows.filter( row => !/\s(yes)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/.test( row ) )
		assert.deepEqual( missing, [] )
	} )

}

test( 'print pdf is grayscale with print resolution images', () => {

	const rows = run( 'pdfimages', '-list', file( '-print.pdf' ) ).split( '\n' ).slice( 2 ).filter( Boolean )

	for( const row of rows ) {
		const [ page, , , , , color, , , , , , , x_ppi ] = row.trim().split( /\s+/ )
		assert.equal( color, 'gray', `colour image on page ${ page }` )
		assert.ok( Number( x_ppi ) >= 200, `low resolution (${ x_ppi } ppi) image on page ${ page }` )
	}

} )

test( 'epub and email csvs exist', () => {

	assert.ok( statSync( file( '.epub' ) ).size > 100_000 )

	// Sendy import: header plus one row per section
	const csv = readFileSync( `${ build }/emails-courseTemplate.csv`, 'utf8' )
	assert.match( csv, /^id,ares_id,from_name/ )
	assert.ok( csv.split( '\n' ).length > 10 )

} )
