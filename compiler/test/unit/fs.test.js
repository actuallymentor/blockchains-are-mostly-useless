import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import mds from '../../modules/fs.js'

test( 'chapters are numbered markdown files in numeric order', async () => {

	const dir = await fs.mkdtemp( `${ tmpdir() }/chapters-` )
	const files = [ '10.0 - late.md', '2.0 - early.md', '0.1 - toc.md', 'notes.md', '3.0 - draft.txt' ]
	await Promise.all( files.map( file => fs.writeFile( `${ dir }/${ file }`, '' ) ) )

	const paths = await mds( dir )
	const names = paths.map( path => path.slice( dir.length + 1 ) )

	assert.deepEqual( names, [ '0.1 - toc.md', '2.0 - early.md', '10.0 - late.md' ] )

	await fs.rm( dir, { recursive: true } )

} )
