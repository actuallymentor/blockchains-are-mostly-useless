import { epubMarkdown, emailMarkdown } from './markdown.js'
import { footnoteMd, footnoteSingle, addVersioningData } from './html-decorators.js'
import { promises as fs } from 'fs'

const { verbose } = process.env

// Convert markdown chapters to the chapter objects html-to-epub expects: { title, data, ... }
export const makeEpubHtml = async ( mdstrs, sourcepath, meta ) => {

	if( verbose ) console.log( 'START: Making epub html' )

	const asset_path = await fs.realpath( meta.asset_path || `${ sourcepath }/assets` )

	// Readers ship their own navigation, so the file with the [[TOC]] placeholder is dropped
	// and everything before it becomes front matter shown ahead of the reader's toc
	const toc_index = mdstrs.findIndex( mdstr => mdstr.includes( '[[TOC]]' ) )

	const chapters = mdstrs.map( ( mdstr, index ) => {

		if( index == toc_index ) return

		// Chapter title comes from the first markdown h1
		const [ title ] = mdstr.match( /(?<=^# ).*/m ) || []
		const front = index < toc_index

		return {
			title: title || meta.title,
			excludeFromToc: !title,
			beforeToc: front,
			// html-to-epub embeds local images when they are file:// urls
			data: addVersioningData( epubMarkdown.render( mdstr ) ).replaceAll( meta.asset_prefix || './assets', `file://${ asset_path }` )
		}

	} ).filter( Boolean )

	if( verbose ) console.log( 'END: Epub html done' )

	return footnoteMd( chapters )
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