import { promises as fs } from 'fs'
import * as sass from 'sass'

const { verbose } = process.env

/**
 * Compile every stylesheet entry point into the build folder, next to a copy of the fonts
 * @param {Object} path - paths from book.config.js
 * @param {String} [output] - folder to write to, defaults to the build folder
 * @returns {Promise<String>} the shared stylesheet, the epub and emails embed it as a string
 */
export const compileStyles = async ( path, output = path.build ) => {

	const entries = [ 'style', 'pdf', 'print' ]

	const [ style ] = await Promise.all( entries.map( async name => {
		if( verbose ) console.log( `Compiling ${ name }.scss` )
		const { css } = await sass.compileAsync( `${ path.styles }/${ name }.scss` )
		await fs.writeFile( `${ output }/${ name }.css`, css )
		return css
	} ) )

	await fs.cp( path.fonts, `${ output }/fonts`, { recursive: true } )

	return style

}
