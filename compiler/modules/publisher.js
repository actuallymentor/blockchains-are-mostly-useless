import mds from './fs.js'
import { promises as fs } from 'fs'
import { makeEpubHtml, makeEmailHtml } from './markdown-to-html.js'
import { makeEpub, makeEmailCsv, courseTemplate, freeTemplate } from './generators.js'
import { makePdfHtmls, makePdfs } from './pdf.js'
import taim from 'taim'

const { onlypdf, onlyepub, onlycsv } = process.env

// Which outputs to build, the only* env flags narrow it down to one
const wants = {
	epub: !onlypdf && !onlycsv,
	pdf: !onlyepub && !onlycsv,
	csv: !onlypdf && !onlyepub
}

/**
 * Read the chapter markdowns in reading order
 * @param {String} input - book folder
 * @returns {Promise<String[]>} markdown per chapter
 */
export const readBook = async input => {

	const paths = await mds( input )
	const markdowns = await Promise.all( paths.map( path => fs.readFile( path, 'utf8' ) ) )

	// Footnotes are written as [^text] in the book, markdown-it-footnote wants inline ^[text]
	return markdowns.map( md => md.replace( /\[\^/g, '^[' ) )

}

const publisher = async ( input, output, meta, config ) => {

	const { freeChapters } = config
	const strings = await readBook( input )

	await Promise.all( [

		wants.epub && taim( 'Epub', makeEpubHtml( strings, input, meta ).then( html => makeEpub( html, meta, output ) ) ),

		wants.pdf && taim( 'Pdfs', makePdfs( makePdfHtmls( meta, strings ), meta, output ) ),

		wants.csv && taim( 'Email csvs', Promise.all( [
			makeEmailHtml( strings, undefined, [ 'Free stuff notice', '[[TOC]]', '# How to read this book' ], meta )
				.then( html => makeEmailCsv( html, meta, output, courseTemplate, config.premiumDripAresId ) ),
			makeEmailHtml( strings, freeChapters, [], meta )
				.then( html => makeEmailCsv( html, meta, output, freeTemplate, config.freeDripAresId ) )
		] ) )

	] )

}

export default publisher
