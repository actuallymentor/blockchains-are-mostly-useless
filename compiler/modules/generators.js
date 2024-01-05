import { promises as fs } from 'fs'
import { exec, execSync } from 'child_process'
import epub from 'epub-gen'
import pdf from 'html5-to-pdf'
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer'

const { verbose, debug } = process.env
// const chrome_path = `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
const automated_chromium_path = execSync( `which chromium || which chromium-browser || true` ).toString().trim()
const automated_chrome_path = execSync( `which google-chrome || true` ).toString().trim()
const manual_chromium_path = `/usr/local/bin/chromium` // output of which chromium
const browser_path = automated_chromium_path || automated_chrome_path || manual_chromium_path
if( verbose ) console.log( 'Using browser path: ', browser_path, `based on chromium path ${ automated_chromium_path }, chrome path ${ automated_chrome_path }` )

export const makeEpub = async ( content, meta, output ) => new epub( {
	...meta,
	version: 3,
	content: content,
	appendChapterTitles: false,
	output: `${output}/${meta.title}.epub`,
	verbose: false
} ).promise.then( f => console.log( 'Epub generation success' ), e => { throw e } )


const buildPdf = async pdf => {

	try {

		if( verbose ) console.log( 'START: open pdf instance' )
		await pdf.start()
		
		if( verbose ) console.log( 'START: Build pdf ' )
		await pdf.build()
		
		if( verbose ) console.log( 'END: build pdf instance' )
		await pdf.close()

	} catch( e ) {
		console.error( 'buildPdf error: ', e )
	}
	
}

export const makeToc = ( tocHtml, meta, output ) => {

	if ( process.env.nopdf ) return true

	if( verbose ) console.log( 'START: Making pdfs' )

	const options = {
		renderDelay: 5000,
		include: [ meta.csspath, meta.printcsspath ],
		templatePath: meta.root,
		launchOptions:{
			executablePath: browser_path
		},
		// Puppeteer pdf defs
		pdf: {
			title: meta.title,
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: false
		}
	}

	// TOC pdf
	const tocPdf = new pdf( {
		...options,
		outputPath: `${output}/${meta.title}-toc.pdf`,
		inputBody: tocHtml
	} )

	return Promise.all( [
		buildPdf( tocPdf ),
		debug && fs.writeFile( `${output}/${meta.title}-toc.html`, tocHtml )
	] )

}

export const makePdfs = async ( content, meta, output ) => {
	if ( process.env.nopdf ) return true

	if( verbose ) console.log( 'START: Making pdfs' )

	const [ pretoc, book, fullhtml ] = content

	if( debug ) await Promise.all( [
		fs.writeFile( `${output}/${meta.title}-pretoc.html`, pretoc, 'utf8' ),
		fs.writeFile( `${output}/${meta.title}-bookcontent.html`, book, 'utf8' ),
		fs.writeFile( `${output}/${meta.title}-fullhtml.html`, fullhtml, 'utf8' ),
		fs.writeFile( `${output}/${meta.title}.css`, await fs.readFile( meta.csspath, 'utf-8' ), 'utf8' )
	] )

	const options = {
		renderDelay: 1000,
		include: [ meta.csspath ],
		templatePath: meta.root,
		// Puppeteer options
		launchOptions:{
			executablePath: browser_path
		},
		// Puppeteer pdf defs
		pdf: {
			title: meta.title,
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: true,
			headerTemplate: '<span></span>',
			footerTemplate: `
			<style>
				.wrap {
					width: 100%;
					text-align: right;
					font-size: 9px;
					padding: 10px 45px;
				}
				.pageNumber {
					margin: 0;
					padding: 0;
				}
			</style>
			<div class='wrap'>
				<span class='pageNumber'></span>
			</div>`
		}
	}

	// Generate pre and post toc pdfs
	const pdfPreToc = new pdf( {
		...options,
		include: [ ...options.include, meta.printcsspath ],
		...{ pdf: { ...options.pdf, displayHeaderFooter: false, footerTemplate: '' } },
		outputPath: `${output}/${meta.title}-pretoc.pdf`,
		inputBody: pretoc
	} )

	const pdfContent = new pdf( {
		...options,
		include: [ ...options.include, meta.printcsspath ],
		outputPath: `${output}/${meta.title}-content.pdf`,
		inputBody: book
	} )

	const fullPdf = new pdf( {
		...options,
		outputPath: `${output}/${meta.title}-digital.pdf`,
		inputBody: fullhtml
	} )

	return Promise.all( [
		buildPdf( pdfPreToc ),
		buildPdf( pdfContent  ),
		buildPdf( fullPdf  )
	] )

}

export const mergePdfs = ( output, meta ) => new Promise( ( resolve, reject ) => {

	const command = `gs -dPDFSETTINGS=/printer -sProcessColorModel=DeviceGray -sColorConversionStrategy=Gray -dOverrideICC -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite`
	const args = ` -sOutputFile="${output}/${meta.title}-print.pdf" "${output}/${meta.title}-pretoc.pdf" "${output}/${meta.title}-toc.pdf" "${output}/${meta.title}-content.pdf"`

	// Merge the pdfs with ghosescript
	const run = exec( `${command} ${ args }` )
	run.on( 'exit', code => {
		if( code == 0 ) return resolve() 
		reject( `Ghostscript failed to perge PDFs, exit code: `, code )
	} )

} )

export const makeCssifiedHtml = ( output, meta ) => {
	return fs.readFile( `${output}/${meta.title}.html`, 'utf8' )
	.then( html => `<style>${meta.css}</style>${html}` )
	.then( newhtml => fs.writeFile( `${output}/${meta.title}.html`, newhtml ) )
}

export const courseTemplate = ( entry, meta ) => `
	<!DOCTYPE html>
	<html>
	<head>
		<title>${ entry.title }</title>
		<style>${ meta.css }</style>
	</head>
	<body style="font-family:helvetica neue, Arial, sanf-serif; font-size: 13px;">
		<p>Hello [Name,fallback=there],</p>

		<p>This email is part of the free service that will send you a snippet of the <em>${ meta.title }</em> book every day. Note:</i></p>

		<ul>
			<li>Some emails will be short, others much longer. Most are 1-6 minutes.</i>
			<li>You can <a href="[webversion]">read this email in your browser</a></li>
			<li>It's ok to forward this email, it's not tied back to your purchase</li>
			<li>If you have any questions, ask me anything on <a href='http://twitter.com/actuallymentor'>Twitter</a> or reply to this email.</li>
		</ul>

		<hr />
		
		<h2>${ entry.title }</h2>

		${ entry.html }

		<br />

		<p>Have a great day [Name,fallback=],</p>

		<p>Mentor Palokaj<br />
		Author of <a href="${ meta.url }"><em>${ meta.title }</em></a></p>

		<hr />

		<p><em>If you don't want to receive these emails anymore, I respect your desire for a clean inbox. Click <a href="[unsubscribe]">here</a> to unsubscribe.</em></p>
	</body>
	</html>
`

export const freeTemplate = ( entry, meta, i ) => `
	<!DOCTYPE html>
	<html>
	<head>
		<title>${ entry.title }</title>
		<style>${ meta.css }</style>
	</head>
	<body style="font-family:helvetica neue, Arial, sanf-serif; font-size: 13px;">
		<p>Hello [Name,fallback=there],</p>

		<p>This email is part of the 3 free chapters of <em><a href="${ meta.url }">${ meta.title }</a></em> you requested.</p>

		<ul>
			<li>If you have any questions, ask me anything on <a href='http://twitter.com/home?status=${encodeURI( '@actuallymentor I have a question: ' )}'>Twitter</a> or reply to this email.</li>
			<li>Like what you're reading? <a href="${ meta.url }">Click here</a> to see where you can buy the book.</li>
		</ul>

		<hr />
		
		<h2>${ entry.title }</h2>

		${ entry.html }

		<br />

		<p>Have a great day [Name,fallback=],</p>

		<p>Mentor Palokaj<br />
		Author of <a href="${ meta.url }"><em>${ meta.title }</em></a></p>

		<hr />

		<p><em>If you don't want to receive these emails anymore, I respect that. Click <a href="[unsubscribe]">here</a> to unsubscribe.</em></p>
	</body>
	</html>
`

export const makeEmailCsv = ( htmls, meta, output, template, aresid ) => {

	if( verbose ) console.log( 'START: Create email csv' )

	// Create csv writer
	const csvWriter = createCsvWriter( {
	    path: `${ output }/emails-${template.name}.csv`,
	    header: [
	    	{ 'id': 'id', title: 'id' },
	    	{ id: 'list', title: 'ares_id' },
	       	{ id: 'from', title: 'from_name' },
	       	{ id: 'frommail', title: 'from_email' },
	       	{ id: 'replyto', title: 'reply_to' },
	       	{ id: 'title', title: 'title' },
	       	{ id: 'text', title: 'plain_text' },
	       	{ id: 'html', title: 'html_text' },
	       	{ id: 'query', title: 'query_string' },
	       	{ id: 'timing', title: 'time_condition' },
	       	{ id: 'timezone', title: 'timezone' },
	       	{ id: 'created', title: 'created' },
	       	{ id: 'recipients', title: 'recipients' },
	       	{ id: 'opens', title: 'opens' },
	       	{ id: 'wysiwyg', title: 'wysiwyg' },
	       	{ id: 'opens_tracking', title: 'opens_tracking' },
	       	{ id: 'links_tracking', title: 'links_tracking' },
	       	{ id: 'enabled', title: 'enabled' }
	    ]
	} )

	// Defaut values
	const defEntry = {
		// id: '',

		'list': aresid,
		'from': 'Mentor',
		'frommail': meta.email.from,
		'replyto': meta.email.replyto,
		// 'title': '',
		// 'text': '',
		// 'html': '',
		// 'query': '',
		// 'timing': '',
		// 'timezone': '',
		// Unix timestamp
		'created': `${ Math.round((new Date()).getTime() / 1000) }`,
		// 'recipients': '',
		// 'opens': '',
		'wysiwyg': '1',
		'opens_tracking': '1',
		'links_tracking': '1',
		'enabled': '1'
	}

	// Sendy structured records
	let records = htmls.map( ( entry, i ) => ( {
		...defEntry,
		title: `${ entry.title.trim() } (${Math.ceil( entry.html.split(' ').length / 150 )} minute read)`,
		html: Buffer.from( template( entry, meta ).trim() ).toString('base64'),
		timing: `+${i} days`
	} ) )

	if( verbose ) console.log( 'END: Writing csv to file' )
	// This returns a promise
	return csvWriter.writeRecords( records )
}