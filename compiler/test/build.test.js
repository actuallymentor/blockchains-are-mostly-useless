/**
 * Checks the finished build in ../build, run after `npm start`
 * Needs poppler-utils (pdftotext, pdfinfo, pdffonts, pdfimages) and unzip
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'child_process'
import { existsSync, statSync, readFileSync } from 'fs'
import { createHash } from 'crypto'

const build = `${ import.meta.dirname }/../../build`
const title = 'Blockchains are mostly useless'
const file = suffix => `${ build }/${ title }${ suffix }`

// Poppler cli helpers, stderr is noisy about long pdf name tokens so it is dropped
const run = ( command, ...args ) => execFileSync( command, args, { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ] } )
const pageText = ( pdf, page ) => run( 'pdftotext', '-f', page, '-l', page, '-layout', pdf, '-' )
const squash = text => text.replace( /\s+/g, ' ' ).trim()
const sha256 = bytes => createHash( 'sha256' ).update( bytes ).digest( 'hex' )
const assets = `${ import.meta.dirname }/../../assets`

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

test( 'epub lists every chapter in its toc and hides none of them', () => {

	const epub = file( '.epub' )
	const toc = run( 'unzip', '-p', epub, 'OEBPS/toc.xhtml' )
	const css = run( 'unzip', '-p', epub, 'OEBPS/style.css' )

	// Same chapters as the pdf toc, in order
	const chapters = tocEntries( file( '-digital.pdf' ) ).map( ( { heading } ) => heading )
	const listed = Array.from( toc.matchAll( /class="table-of-content">\s*<a [^>]*>([^<]+)</g ), ( [ , title ] ) => squash( title ) )

	assert.deepEqual( listed, chapters )
	assert.doesNotMatch( css, /#toc[^{]*\{[^}]*display:\s*none/ )

} )

test( 'epub and email csvs exist', () => {

	assert.ok( statSync( file( '.epub' ) ).size > 100_000 )

	// Sendy import: header plus one row per section
	const csv = readFileSync( `${ build }/emails-courseTemplate.csv`, 'utf8' )
	assert.match( csv, /^id,ares_id,from_name/ )
	assert.ok( csv.split( '\n' ).length > 10 )

} )

test( 'the selected eight illustrations reach the pdf inputs and epub unchanged', () => {

	const { illustrations } = JSON.parse( readFileSync( `${ assets }/illustrations/selected-art.json`, 'utf8' ) )
	assert.deepEqual( illustrations.map( image => image.style_id ), [ 'S34', 'S39', 'S41', 'S43', 'S46', 'S51', 'S53', 'S57' ] )
	const epub_images = run( 'unzip', '-Z1', file( '.epub' ) ).split( '\n' ).filter( name => /^OEBPS\/images\/.*\.png$/.test( name ) )
	const epub_hashes = new Set( epub_images.map( name => sha256( execFileSync( 'unzip', [ '-p', file( '.epub' ), name ], { maxBuffer: 8 * 1024 * 1024 } ) ) ) )

	for( const image of illustrations ) {
		assert.equal( sha256( readFileSync( `${ assets }/illustrations/${ image.file }` ) ), image.sha256, `${ image.style_id } source differs from the selection` )
		assert.equal( sha256( readFileSync( `${ build }/assets/illustrations/${ image.file }` ) ), image.sha256, `${ image.style_id } missing or stale in pdf inputs` )
		assert.ok( epub_hashes.has( image.sha256 ), `${ image.style_id } missing or changed in epub` )
	}

} )

test( 'the KDP wrap fits this exact print interior and embeds its fonts', () => {

	const report = JSON.parse( readFileSync( `${ build }/cover-preflight.json`, 'utf8' ) )
	const pages = Number( run( 'pdfinfo', file( '-print.pdf' ) ).match( /Pages:\s+(\d+)/ )[ 1 ] )
	const kdp_pages = Math.ceil( pages / 2 ) * 2
	const spine = kdp_pages * 0.0025
	const expected_points = [ ( 12 + spine + 0.25 ) * 72, 9.25 * 72 ]
	const info = run( 'pdfinfo', file( '-kdp-cover.pdf' ) )
	const dimensions = info.match( /Page size:\s+([\d.]+) x ([\d.]+) pts/ ).slice( 1 ).map( Number )

	assert.match( info, /Pages:\s+1\s/ )
	assert.ok( dimensions.every( ( value, index ) => Math.abs( value - expected_points[ index ] ) < 0.01 ), 'wrap does not fit the current page count' )
	assert.equal( report.interior_pages, pages )
	assert.equal( report.kdp_pages, kdp_pages )
	assert.equal( report.paper, 'cream' )
	assert.equal( report.ink, 'black' )
	assert.equal( report.interior_bleed, false )
	assert.deepEqual( report.trim_inches, [ 6, 9 ] )
	assert.equal( report.bleed_inches, 0.125 )
	assert.ok( Math.abs( report.spine_inches - spine ) < 0.0001 )
	assert.ok( report.wrap_inches.every( ( value, index ) => Math.abs( value * 72 - dimensions[ index ] ) < 0.01 ) )
	assert.equal( report.interior_sha256, sha256( readFileSync( file( '-print.pdf' ) ) ), 'preflight belongs to a different interior build' )
	assert.equal( report.front_sha256, sha256( readFileSync( `${ assets }/cover.png` ) ), 'preflight belongs to a different front cover' )
	if( kdp_pages < 80 ) assert.equal( report.spine_text, false )

	const fonts = run( 'pdffonts', file( '-kdp-cover.pdf' ) ).split( '\n' ).slice( 2 ).filter( Boolean )
	assert.ok( fonts.length > 0, 'back-cover typography must be present' )
	assert.ok( fonts.every( row => /\s(yes)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/.test( row ) ), 'cover has unembedded fonts' )

} )

test( 'cover exports exist and preflight distinguishes native detail from raster DPI', () => {

	const report = JSON.parse( readFileSync( `${ build }/cover-preflight.json`, 'utf8' ) )
	const source = readFileSync( `${ assets }/cover.png` )
	const pixels = [ source.readUInt32BE( 16 ), source.readUInt32BE( 20 ) ]
	const native_ppi = Math.min( pixels[ 0 ] / 6, pixels[ 1 ] / 9 )

	assert.equal( report.selected_front, 'C12-F' )
	assert.deepEqual( report.front_source_pixels, pixels )
	assert.ok( Math.abs( report.front_native_ppi - native_ppi ) < 0.01, 'native PPI must describe the source, not the enlarged export' )
	assert.equal( report.raster_export_ppi, 300 )
	if( native_ppi < 300 ) assert.ok( report.warnings.some( warning => /below 300 PPI/.test( warning ) ), 'low native resolution needs an explicit warning' )

	for( const suffix of [ '-front-cover.pdf', '-front-cover.png', '-front-cover.jpg', '-back-cover.pdf', '-back-cover.png', '-kdp-cover.png', '-kdp-cover.jpg' ] ) {
		assert.ok( statSync( file( suffix ) ).size > 10_000, `${ suffix } missing or empty` )
	}

	for( const suffix of [ '-front-cover', '-back-cover' ] ) {
		const info = run( 'pdfinfo', file( `${ suffix }.pdf` ) )
		assert.match( info, /Pages:\s+1\s/ )
		assert.match( info, /Page size:\s+432 x 648 pts/ )
	}

} )
