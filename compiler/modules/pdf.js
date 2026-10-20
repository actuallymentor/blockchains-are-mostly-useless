import { promises as fs } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { pdfMarkdown } from './markdown.js'
import { inlineFootnotes, decorateHrefs, addVersioningData } from './html-decorators.js'

const exec = promisify( execFile )
const { verbose, debug } = process.env

// Vivliostyle drives this exact browser build, so layout never drifts with the system Chrome
// bump deliberately, then eyeball the pagination of the output
export const browser = 'chrome@155.0.8059.84'

// Book chapters are split around the markdown file that holds the [[TOC]] placeholder
const toc_marker = '[[TOC]]'

// ///////////////////////////////
// Html
// ///////////////////////////////

// Every h1 in the content becomes a toc line; Vivliostyle fills in the page number via target-counter
const tocFromHtml = html => {

	const chapters = Array.from( html.matchAll( /<h1 id="([^"]+)"[^>]*>(.*?)<\/h1>/g ) )
	const items = chapters.map( ( [ , id, title ] ) => `<li><a href="#${ id }">${ title }</a></li>` )

	return `<nav class="toc"><h1>Table of Contents</h1><ul>${ items.join( '' ) }</ul></nav>`

}

// Markdown => html with the pdf-specific decorations: inline footnotes, link domains, version stamps
const render = ( markdown, { decorate = true } = {} ) => {
	const html = pdfMarkdown.render( markdown, {} )
	return addVersioningData( decorate ? decorateHrefs( inlineFootnotes( html ) ) : html )
}

// Both pdfs share pdf.css, the paperback adds gutters and grayscale-friendly tweaks
const stylesheets = {
	digital: [ 'pdf.css' ],
	print: [ 'pdf.css', 'print.css' ]
}

const document = ( meta, variant, body ) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>${ meta.title }</title>
	<meta name="author" content="${ meta.author }" />
	${ stylesheets[ variant ].map( href => `<link rel="stylesheet" href="${ href }" />` ).join( '\n\t' ) }
</head>
<body class="pdf ${ variant }">
${ body }
</body>
</html>`

/**
 * Build the print and digital html documents
 * @param {Object} meta - book meta, see book.config.js
 * @param {String[]} markdowns - chapter markdown strings, sorted
 * @returns {{ print: String, digital: String }} full html documents
 */
export const makePdfHtmls = ( meta, markdowns ) => {

	if( verbose ) console.log( 'START: Making pdf html' )

	// Front matter comes before the toc file, content after it
	const toc_index = markdowns.findIndex( markdown => markdown.includes( toc_marker ) )
	if( toc_index == -1 ) throw new Error( `No markdown file contains the ${ toc_marker } placeholder` )

	const front = render( markdowns.slice( 0, toc_index ).join( '\n\n' ), { decorate: false } )
	const content = render( markdowns.slice( toc_index + 1 ).join( '\n\n' ) )
	const toc = tocFromHtml( content )

	// Book markdown links ../assets relative to book/, the pdf html lives next to build/assets
	const body = `
		<section class="front">${ front }</section>
		${ toc }
		<section class="content">${ content }</section>
	`.replaceAll( `${ meta.asset_prefix }/`, 'assets/' )

	return {
		print: document( meta, 'print', body ),
		digital: document( meta, 'digital', body )
	}

}

// ///////////////////////////////
// Pdf
// ///////////////////////////////

export const vivliostyle_bin = `${ import.meta.dirname }/../node_modules/.bin/vivliostyle`

const vivliostyle = ( input, output ) => exec( vivliostyle_bin, [
	'build', input,
	'--output', output,
	'--browser', browser,
	// Vivliostyle disables the Chrome sandbox unless asked
	'--sandbox',
	'--log-level', verbose ? 'info' : 'silent'
], { maxBuffer: 1024 * 1024 * 64 } )

// KDP prints black and white, so flatten everything to grayscale with embedded fonts
const grayscale = ( input, output ) => exec( 'gs', [
	'-dPDFSETTINGS=/printer',
	'-sProcessColorModel=DeviceGray',
	'-sColorConversionStrategy=Gray',
	'-dOverrideICC',
	'-dEmbedAllFonts=true',
	'-dBATCH', '-dNOPAUSE', '-q',
	'-sDEVICE=pdfwrite',
	`-sOutputFile=${ output }`,
	input
] )

// Copy every image the html points at from the assets folder into build/assets
const copyAssets = async ( html, meta, output ) => {

	const sources = new Set( Array.from( html.matchAll( /src=["']assets\/([^"']+)["']/g ), ( [ , path ] ) => path ) )

	await Promise.all( [ ...sources ].map( path => fs.cp( `${ meta.asset_path }/${ path }`, `${ output }/assets/${ path }` ) ) )

}

// KDP cream paper is 0.0025 inch per page, spine text is only allowed from 79 pages
// see https://kdp.amazon.com/en_US/help/topic/G201953020
const reportPrintSpecs = async pdf => {

	const { stdout } = await exec( 'gs', [ '-q', '-dNODISPLAY', '-dSAFER', `--permit-file-read=${ pdf }`, '-c', `(${ pdf }) (r) file runpdfbegin pdfpagecount = quit` ] )
	const pages = Number( stdout.trim() )
	const spine = ( pages * 0.0025 ).toFixed( 4 )

	console.log( `Print pdf: ${ pages } pages, cream spine width ${ spine } inch${ pages < 79 ? ', too thin for spine text' : '' }` )
	if( pages % 2 ) console.warn( 'Print pdf has an odd page count, KDP will add a blank last page' )

}

/**
 * Write the pdf html documents and the images they use into the build folder
 * @param {{ print: String, digital: String }} htmls - from makePdfHtmls
 * @param {Object} meta - book meta, see book.config.js
 * @param {String} output - build folder
 */
export const writePdfHtmls = async ( htmls, meta, output ) => {

	// Vivliostyle only serves files below the html's folder, so referenced images move into the build
	await copyAssets( htmls.print, meta, output )

	await Promise.all( [
		fs.writeFile( `${ output }/${ meta.title }-print.html`, htmls.print ),
		fs.writeFile( `${ output }/${ meta.title }-digital.html`, htmls.digital )
	] )

}

/**
 * Render the digital and print pdfs
 * @param {{ print: String, digital: String }} htmls - from makePdfHtmls
 * @param {Object} meta - book meta, see book.config.js
 * @param {String} output - build folder
 */
export const makePdfs = async ( htmls, meta, output ) => {

	const file = suffix => `${ output }/${ meta.title }${ suffix }`

	await writePdfHtmls( htmls, meta, output )

	// Sequential on purpose: parallel runs race each other on the first browser download
	await vivliostyle( file( '-print.html' ), file( '-print-color.pdf' ) )
	await vivliostyle( file( '-digital.html' ), file( '-digital.pdf' ) )

	await grayscale( file( '-print-color.pdf' ), file( '-print.pdf' ) )

	await reportPrintSpecs( file( '-print.pdf' ) )

	// Intermediates are only useful when debugging layout
	if( !debug ) await Promise.all( [ '-print.html', '-digital.html', '-print-color.pdf' ].map( suffix => fs.rm( file( suffix ) ) ) )

}
