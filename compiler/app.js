import publish from './modules/publisher.js'
import { compileStyles } from './modules/styles.js'
import { promises as fs } from 'fs'
import { path, meta, config } from './book.config.js'

const { verbose, dirty } = process.env

const build = async () => {

	// Start from an empty build folder unless asked not to
	if( !dirty ) await fs.rm( path.build, { recursive: true, force: true } )
	await fs.mkdir( path.build, { recursive: true } )

	const css = await compileStyles( path )

	await publish( path.source, path.build, { ...meta, css }, config )

	if( verbose ) console.log( 'Generation complete' )

}

build().catch( error => {
	console.error( error )
	process.exit( 1 )
} )
