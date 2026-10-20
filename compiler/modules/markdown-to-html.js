import { epubMarkdown, emailMarkdown } from './markdown.js'
import { footnoteMd, inlineFootnotes, addVersioningData } from './html-decorators.js'
import { promises as fs } from 'fs'

const { verbose } = process.env

/**
 * Convert markdown chapters to the chapter objects html-to-epub expects
 * @param {String[]} mdstrs - chapter markdowns in reading order
 * @param {String} sourcepath - book folder, fallback for the assets folder
 * @param {Object} meta - book meta, see book.config.js
 * @returns {Promise<{ title: String, data: String, beforeToc: Boolean, excludeFromToc: Boolean }[]>}
 */
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

/**
 * Split the book into emails, one per ## section
 * @param {String[]} mdstrs - chapter markdowns
 * @param {String[]} [filter_in] - keep only chapters containing one of these strings
 * @param {String[]} [filter_out] - drop chapters containing any of these strings
 * @param {Object} meta - book meta, see book.config.js
 * @returns {Promise<{ title: String, html: String }[]>} one entry per email
 */
export const makeEmailHtml = async ( mdstrs, filter_in, filter_out, meta ) => {

	if( verbose ) console.log( 'START: Making email htmls' )

	const contains_any = ( markdown, criteria ) => criteria.some( criterion => markdown.includes( criterion ) )

	const kept_chapters = mdstrs
		.filter( markdown => !filter_in || contains_any( markdown, filter_in ) )
		.filter( markdown => !filter_out || !contains_any( markdown, filter_out ) )

	// Each "## title" starts an email that runs until the next # or ## heading
	const section_regex = /(?:^|\n)## (.*?)\n(.*?)(?=\n#{1,2} |$)/gs
	const sections = Array.from( kept_chapters.join( '\n\n' ).matchAll( section_regex ) )

	// Images are served from the Sendy upload folder
	const asset_regex = new RegExp( meta.asset_prefix || './assets/', 'g' )

	const emails = sections.map( ( [ , title, markdown ] ) => ( {
		title,
		html: inlineFootnotes( emailMarkdown.render( markdown ) ).replace( asset_regex, meta.sendy_book_asset_path )
	} ) )

	if( verbose ) console.log( 'END: Email html done' )

	return emails

}
