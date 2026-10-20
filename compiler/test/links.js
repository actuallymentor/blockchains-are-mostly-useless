/**
 * Checks every external link in the book, needs network access
 * Dead links fail, links behind bot protection are only reported
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'fs'
import { basename } from 'path'
import mds from '../modules/fs.js'

const book = `${ import.meta.dirname }/../../book`

// Sites that answer bots with these codes are usually fine for humans
const blocked_codes = [ 401, 403, 429, 999 ]

// Match all [text](http...) markdown links
const urls = markdown => Array.from( markdown.matchAll( /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g ), ( [ , url ] ) => url )

const status = async url => {

	const options = {
		redirect: 'follow',
		signal: AbortSignal.timeout( 20_000 ),
		headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' }
	}

	try {

		// Some servers don't implement HEAD, retry those with GET
		const head = await fetch( url, { ...options, method: 'HEAD' } )
		if( head.ok ) return head.status
		return ( await fetch( url, options ) ).status

	} catch( error ) {
		return error.cause?.code || error.name
	}

}

// Run promises a few at a time so we don't hammer anyone
const throttled = async ( items, worker, lanes = 8 ) => {
	const results = []
	const queue = items.entries()
	const lane = async () => { for( const [ index, item ] of queue ) results[ index ] = await worker( item ) }
	await Promise.all( Array.from( { length: lanes }, lane ) )
	return results
}

test( 'links in the book are alive', { timeout: 10 * 60_000 }, async () => {

	const paths = await mds( book )
	const links = ( await Promise.all( paths.map( async path => {
		const markdown = await fs.readFile( path, 'utf8' )
		return urls( markdown ).map( url => ( { url, file: basename( path ) } ) )
	} ) ) ).flat()

	assert.ok( links.length > 0, 'found no links, is the book path right?' )

	const checked = await throttled( links, async link => ( { ...link, status: await status( link.url ) } ) )

	const blocked = checked.filter( ( { status } ) => blocked_codes.includes( status ) )
	const dead = checked.filter( ( { status } ) => !blocked_codes.includes( status ) && !( status >= 200 && status < 400 ) )

	console.log( `Checked ${ links.length } links: ${ dead.length } dead, ${ blocked.length } blocked by bot protection` )
	for( const { file, url, status } of blocked ) console.log( `  blocked ${ status } ${ url } (${ file })` )
	for( const { file, url, status } of dead ) console.log( `  DEAD ${ status } ${ url } (${ file })` )

	assert.deepEqual( dead, [] )

} )
