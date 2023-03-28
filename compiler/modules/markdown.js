// Import markdown-it and generate two instances
import mdit from 'markdown-it'
const mdEPUB = new mdit( { html: true, xhtmlOut: true } )
const mdPDF = new mdit( { html: true, xhtmlOut: true } )
const mdEmail = new mdit( { html: true, xhtmlOut: true } )

// Import relevant plugins
import footnotes  		from 'markdown-it-footnote'
import toc 		  		from 'markdown-it-table-of-contents'
import anchors 	  		from 'markdown-it-anchor' // Required for linkable toc
import hierarchy  		from 'markdown-it-hierarchy' // Add hierarchy numbes to headings. e,g, 1.1 Chapter 1.2 Subsection
import implicitFigures 	from 'markdown-it-implicit-figures'

// Apply relevant plugins to the markdown package
mdEPUB.use( footnotes )
mdEPUB.use( hierarchy )

// Since the epub already has a built in TOC we only include toc stuff for the pfd gen
mdPDF.use( footnotes )
// mdPDF.use( hierarchy )
mdPDF.use( toc )
mdPDF.use( anchors )
mdPDF.use( implicitFigures, {
	figcaption: true
} )

// Use footnotes
mdEmail.use( footnotes )

export const pdfMarkdown = mdPDF
export const epubMarkdown = mdEPUB
export const emailMarkdown = mdEmail