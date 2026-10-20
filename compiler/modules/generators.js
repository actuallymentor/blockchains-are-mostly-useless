import { promises as fs } from 'fs'
import epub from 'epub-gen'
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer'

const { verbose, debug } = process.env
export const makeEpub = async ( content, meta, output ) => new epub( {
	...meta,
	version: 3,
	content: content,
	appendChapterTitles: false,
	output: `${output}/${meta.title}.epub`,
	verbose: false
} ).promise.then( f => console.log( 'Epub generation success' ), e => { throw e } )


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
		title: Buffer.from( `${ entry.title.trim() } (${Math.ceil( entry.html.split(' ').length / 150 )} minute read)`.trim() ).toString('base64'),
		html: Buffer.from( template( entry, meta ).trim() ).toString('base64'),
		timing: `+${i} days`
	} ) )

	if( verbose ) console.log( 'END: Writing csv to file' )
	// This returns a promise
	return csvWriter.writeRecords( records )
}