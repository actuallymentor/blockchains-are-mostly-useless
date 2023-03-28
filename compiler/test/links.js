import expect from './modules/expect'
import { promises as fs } from 'fs'
import { normalize } from 'path'
import mds from '../modules/fs.js'
import request from 'request-promise-native'

// Match all []() markdown links
const urls = str => Array.from( str.matchAll( /(?:\[.*\])(?:\()((?:http).*?)(?:\))/g ), m => m[1] )

// Wait helper
const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) )

// CHeck if url is broken
const isBroken = link => Promise.race( [
	request( {
		uri: link.url,
		resolveWithFullResponse: true,
		headers: {
	        'User-Agent': 'Chrome/79.0.3945.117'
	    }
	} ),
	wait( 20000 ).then( f => ( { statusCode: 'throw' } ) )
] )
.then( ( { statusCode } ) => statusCode == 200 ? false : { ...link, code: statusCode } )
.catch( ( { statusCode, name, message, ...other } ) => ( { ...link, code: statusCode || name || message || other } ) )
.finally( f => {
	if( process.env.verbose ) console.log( 'Done testing ', link )
} )

describe( 'Links in the book', function( ) {

	this.timeout( 1000 * 60 * 10 )

	it( 'are all valid', async function() {

		// Get the paths to markdowns
		const paths = await mds( `${__dirname}/../../` )

		// Get markdown and fix footnoe structure to match npm module syntax
		const markdowns = await Promise.all( paths.map( async path => ( {
			path: normalize( path ), content: await fs.readFile( path, 'utf8' )
		} ) ) )

		const linksByFile = markdowns.map( md => ( {
			path: md.path,
			urls: urls( md.content )
		} ) )

		let linksWithFile = linksByFile.map( file => {
			return file.urls.map( url => ( { url: url, path: file.path } ) )
		} ).flat()

		if( process.env.verbose ) console.log( 'Validating ', linksWithFile.length, ' links' )

		const broken = await Promise.all( linksWithFile.map( link => isBroken( link ) ) )
		const filtered = broken.filter( notfalse => notfalse )

		if( process.env.verbose && filtered.length > 0 ) await fs.writeFile( `${__dirname}/../broken-links.json`, JSON.stringify( filtered, null, 2 ) )
		if( process.env.verbose && filtered.length > 0 ) console.log( filtered.length, ' links are broken: ', filtered )

		return filtered.should.have.length( 0 )

	} )

} )