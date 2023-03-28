import pdfParser from 'pdf-parse'
import { promises as fs } from 'fs'

// Match titles by regex and return the match
const getTocEntries = async mdstrs => mdstrs.map( md => {
	const title = md.match( /(?<=# ).*/ )
	return title ? title[0] : false
} ).filter( title => !!title )

const pdfToJson = async ( output, meta ) => {
	const buffer = await fs.readFile( `${output}/${meta.title}-content.pdf` )
	const pdf = await pdfParser( buffer, { pagerender: parsePage, version: 'v2.0.550' } )

	// The text property has the relevant array of pages with text
	// The parent object contains pdf metadata
	const json = JSON.parse( `[ ${ pdf.text }{ "pageNumber": false, "text": false } ]` )
	if( process.env.debug ) await fs.writeFile( `${output}/${meta.title}-content.json`, JSON.stringify( json, null, 2 ) )
	return json

}

const parsePage = async page => {
	const textContent = await page.getTextContent( )

	// The below is a parse function taken from the package docs
	let lastY, text = '';
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY){
                text += item.str;
            }  
            else{
                text += '\n' + item.str;
            }    
            lastY = item.transform[5];
        }
	return JSON.stringify( { pageNumber: page.pageNumber, text: text } ) + ','
}

const linkFromTitle = ( title, pageNumber ) => `<a href='#${ encodeURIComponent( title.toLowerCase().replace( ' ', '-' ) ) }'>${title} - ${pageNumber}</a>`
const headingFromPrepends = ( match, prepends ) => {

	const heading = prepends.find( prepend => prepend.match == match )

}
const regEscape = regex => {
	regex = regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string, source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
	regex = regex.replace( / /g, '(?: |\\n)' ) // Make a space optionally a newline character since in the pdf it might become multiline
	return regex
}

const buildToc = async ( output, meta, mdstrs, prepends = [] ) => {

	// Get the pdf structure fron the pds and the titles frm the markdown strings
	const [ titles, pdfjson ] = await Promise.all( [ 
		getTocEntries( mdstrs ),
		pdfToJson( output, meta )
	] )

	// Regex to find the start of a chapter string
	const chapterPrefix = `^[0-9]*\\n.*?(Chapter\\n)?`

	if( process.env.debug ) console.log( titles.map( title => `${ chapterPrefix }${ regEscape( title ) }` ) )

	// Generate the html for a toc 
	const html = `<span class='print pdf'>
		<div class="center">
			<h1 id="pdftoctitle">Table of Contents</h1>
			<div class="table-of-contents">
				<ul>
					${ titles.map( title => {
						// Find the first string starting with the title ( page nr comes before the text because of pdf parser )
						// Add backup object because the last page will be empty
						const { pageNumber } = pdfjson.find( page => page.text && page.text.match( new RegExp( `${ chapterPrefix }${ regEscape( title ) }` ) ) ) || {}

						// If no page number was found for this heading do not continue
						if( !pageNumber && !process.env.debug ) throw `Found no page number for: ${ title }`

						// Generate link to chapter
						const liLink = `<li>
							${ linkFromTitle( title, pageNumber ) }
						</li>`

						// See if this chapter should have a heading
						const prepend = prepends.find( prepend => prepend.match == title )

						// If so, return both heading and link
						if( prepend ) return `
							<li><h3>${ prepend.heading }</h3></li>
							${ liLink }
						`

						// If not return just the link
						return liLink

					} ).join( '' ) }
				</ul>
			</div>
		</div>
		<!-- Add an empty page to that the content starts on the right page -->
		<div class="center"></div>
	</span>`

	return html


}

export default buildToc