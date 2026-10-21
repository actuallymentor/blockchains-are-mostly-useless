// Import markdown-it and generate two instances
import mdit from 'markdown-it'
const mdEPUB = new mdit( { html: true, xhtmlOut: true } )
const mdPDF = new mdit( { html: true, xhtmlOut: true } )
const mdEmail = new mdit( { html: true, xhtmlOut: true } )

// Import relevant plugins
import footnotes  		from 'markdown-it-footnote'
import anchors 	  		from 'markdown-it-anchor' // Required for linkable toc
import hierarchy  		from './hierarchy.js' // Add hierarchy numbers to headings. e,g, 1.1 Chapter 1.2 Subsection
import implicitFigures 	from 'markdown-it-implicit-figures'

// Apply relevant plugins to the markdown package
mdEPUB.use( footnotes )
mdEPUB.use( hierarchy )

// Pdf headings need ids for the generated toc
mdPDF.use( footnotes )
// mdPDF.use( hierarchy )
// Plain ascii ids, so toc links and target-counter() never trip over encoding
mdPDF.use( anchors, {
	slugify: title => title.toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' )
} )
mdPDF.use( implicitFigures, {
	figcaption: true
} )

// Use footnotes
mdEmail.use( footnotes )

export const pdfMarkdown = mdPDF
export const epubMarkdown = mdEPUB
export const emailMarkdown = mdEmail