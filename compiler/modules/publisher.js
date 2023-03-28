import mds from './fs.js'
import { promises as fs } from 'fs'
import { makeEpubHtml, makePdfHtmls, makeEmailHtml } from './markdown-to-html'
import { makeEpub, makePdfs, makeToc, makeCssifiedHtml, makeEmailCsv, mergePdfs, courseTemplate, freeTemplate } from './generators'
import buildToc from './toc-from-pdf'
import taim from 'taim'

const { onlypdf, onlyepub, onlycsv, verbose, dry } = process.env

const publisher = async ( input, output, meta, config ) => {

	try {

		// Get the paths to markdowns
		const paths = await taim( 'Get markdown paths', mds( input ) )

		// Destructure configs
		const { tocHeadings, freeChapters } = config

		// Get markdown and fix footnoe structure to match npm module syntax
		const markdowns = await taim( 'Read markdown files', Promise.all( paths.map( path => fs.readFile( path, 'utf8' ) ) ) )
		const strings = markdowns.map( md => md.replace( new RegExp( /\[\^/, 'g'), '^[' ) )

		// Make htmls
		const [ epubHtml, pdfHtmls, fullDripCsvHtml, freeDripCsvHtml ] = await Promise.all( [
			dry || taim( 'Make epub html', makeEpubHtml( strings, input ) ),
			dry || taim( 'Make pdf html', makePdfHtmls( meta, strings, input, output ) ),
			dry || taim( 'Make email html', makeEmailHtml( strings, undefined, [ 'Free stuff notice', '[[TOC]]', '# How to read this book' ] ) ),
			dry || taim( 'Make free email html', makeEmailHtml( strings, freeChapters ) )
		] )

		// Build documents and write to disk
		await Promise.all( [
			dry || !onlypdf && !onlycsv && taim( 'Make the epub', makeEpub( epubHtml, meta, output ) ),
			dry || !onlyepub && !onlycsv && taim( 'Make the pdfs', makePdfs( pdfHtmls, meta, output ) ),
			dry || !onlypdf && !onlyepub && taim( 'Make the full csv', makeEmailCsv( fullDripCsvHtml, meta, output, courseTemplate, config.premiumDripAresId ) ),
			dry || !onlypdf && !onlyepub && taim( 'Make the free csv', makeEmailCsv( freeDripCsvHtml, meta, output, freeTemplate, config.freeDripAresId ) )
		] )

		// If pdfs were generated, make toc
		if( !onlyepub && !onlycsv ) {
			// The TOC can only be built after the first pdfs are saved
			const tocHtml = await ( dry || taim( 'Get TOC entries (json)', buildToc( output, meta, strings, tocHeadings ) ) )
			if( !dry ) await taim( 'Make the TOC', makeToc( tocHtml, meta, output ) )
			if( !dry ) await taim( 'Merge pdfs', mergePdfs( output, meta ) )
			// The cssified html relies on the html being written do disk, which happens in the makePdfHtmls function
			if( !dry ) await taim( 'Make cssified html', makeCssifiedHtml( output, meta ) )
		}

	} catch( e ) {

		console.error( 'Publishing error: ', e )

	}

}

export default publisher