import { pdfMarkdown, epubMarkdown, emailMarkdown } from './markdown'
import { footnoteMd, footnotePdf, footnoteSingle, decorateHrefs, addVersioningData } from './html-decorators'
import { promises as fs } from 'fs'
import { inlineSource } from 'inline-source'

const { verbose } = process.env

// Convert MD strings to html and return them in a format friendly to the eoub module { data: <html> }
export const makeEpubHtml = async ( mdstrs, sourcepath, meta ) => {

	if( verbose ) console.log( 'START: Making epub html' )

	let assetPath = await fs.realpath( meta.asset_path || `${sourcepath}/assets` )
	let htmlarray = mdstrs.map( mdstr => {
		// Generate chapter title from the first h1
		let title = mdstr.match( /(?<=# ).*/ )

		// Make asset regex based on the meta.asset_prefix, or use ./assets/ as default
		const asset_replace_regex = new RegExp( meta.asset_prefix || './assets/', 'g' )

		return {
			// If a title exists apply it
			title: title ? title[0] : false,
			// If there is no title don't show in toc
			excludeFromToc: title ? false : true,
			// Exclude the first h1 from the chapter content because epub shows the title
			// Disabled the .replace( /(?<=^# ).*/, '' ) this since specifying appendChapterTitles: false
			// Also disabled .replace( 'href="#fn', 'epub:type="noteref" href="#' ) because iBooks is a bitch
			data: epubMarkdown.render( mdstr ).replace( asset_replace_regex, `file://${ assetPath }` )
		}
	} )

	if( verbose ) console.log( 'END: Epub html done' )


	return footnoteMd( htmlarray )
}

export const makePdfHtmls = async ( meta, mdstrs, input, output ) => { 

	if( verbose ) console.log( 'START: Making pdf html' )

	// Plit sections for parsing below
	let pretoc = [ ...mdstrs.slice( 0, 1 ) ].join( '\n\n' )
	let toc   = [ ...mdstrs.slice( 1, 2 ) ].join( '\n\n' ) // Unused
	let book  = [ ...mdstrs.slice( 2 ) ].join( '\n\n' )
	let full = mdstrs.join( '\n\n' )

	pretoc = addVersioningData( pdfMarkdown.render( pretoc ) )
	book = addVersioningData( decorateHrefs( footnotePdf( pdfMarkdown.render( book ) ) ) )
	full = addVersioningData( decorateHrefs( footnotePdf( pdfMarkdown.render( full ) ) ) )

	// Join together all strings
	const preTocHtml = `<span class='print pdf'><section class='pretoc'>${ pretoc }</section></span>`
	const contentHtml = `<span class='print pdf'><section class='content'>${ book }</section></span>`
	const fullHtml = `<span class='pdf'><section class='content'>${ full }</section></span>`

	// I'm resetting the image path to the source folder, the templatePath option in the pdf generator adds the right directory prefix
	// let pathified = html.replace( new RegExp( /\.\/assets/, 'g'), `file://${input}/assets` )

	// Inlining the images because of puppeteer
	const [ inlinedPreToc, inlinedContent, inlinedFullHtml ] = await Promise.all( [ preTocHtml, contentHtml, fullHtml ].map( html => {
		return inlineSource( html, {
			// inline all
			attribute: false,
			svgAsImage: true,
			rootpath: input
		} )
	} ) )
	
	if( verbose ) console.log( 'START: Writing pdf html to file' )
	// Write to html file
	await fs.writeFile( `${output}/${meta.title}.html`, inlinedFullHtml )

	if( verbose ) console.log( 'END: Pdf html done' )
	return [ inlinedPreToc, inlinedContent, inlinedFullHtml ]
}

export const makeEmailHtml = async ( mdstrs, filterInArray, filterOutArray, meta ) => {

	if( verbose ) console.log( 'START: Making email htmls' )

	// if( filterInArray || filterOutArray ) console.log( 'Filtering from ', mdstrs.length, ' md strings' )

	// ///////////////////////////////
	// Filtering
	// ///////////////////////////////
	if( filterInArray ) {

		// Only keep things in the filter IN array
		mdstrs = mdstrs.filter( markdown => {

			// See if any of the filters are in the markdown
			const results = filterInArray.map( criterion => markdown.includes( criterion ) )

			// Did any of them match true? Keep it.
			return results.some( result => result )

		} )

	}

	if( filterOutArray ) {

		// Discard things in the filter OUT array
		mdstrs = mdstrs.filter( markdown => {

			// Check if the markdown contains any of the filters
			const results = filterOutArray.map( criterion => markdown.includes( criterion ) )

			// Did any of them match true? Discard.
			return !results.some( result => result )

		} )

	}

	// if( filterInArray || filterOutArray ) console.log( 'To ', mdstrs.length, ' md strings' )

	// Parapgrphs placeholder
	let paragraphs = []
	// One big contat string of the mds
	let mdstring = mdstrs.join( '\n\n' )
	// Regex: don't match the # and ##, but match the title, then after match the part that comes until the next # or ##
	// #{2} matches only subheadings #{1,2} would match all
	// 0 if full match, 1 is title, 2 is content
	let paragraphRegex = new RegExp( /(?:(?:^|\n)#{2} (.*?))(?:\n)(.*?)(?=\n#{1,2} |$)/, 'gs' )
	// Run exec once
	let matchPlaceholder = paragraphRegex.exec( mdstring )

	// If exec if not yet exhausted keep execing
	while( matchPlaceholder != null ) {
		paragraphs.push(  matchPlaceholder )
		matchPlaceholder = paragraphRegex.exec( mdstring )
	}

	if( verbose && ( filterInArray || filterOutArray ) ) console.log( 'Filtering from ', mdstrs.length )


	let htmlified = paragraphs.map( paragraph => ( {
		title: paragraph[1],
		html: footnoteSingle( {
			data: emailMarkdown
					.render( paragraph[2] )
					.replace( new RegExp( meta.asset_prefix || './assets/', 'g'), meta.sendy_book_asset_path )
		} ).data
	} ) )

	if( verbose ) console.log( 'END: Email html done' )

	return htmlified

}