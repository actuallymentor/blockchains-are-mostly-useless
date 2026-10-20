import { promises as fs } from 'fs'
import * as sass from 'sass'

const { verbose } = process.env

/**
 * Compile every stylesheet entry point into the build folder, next to a copy of the fonts
 * @param {Object} path - paths from book.config.js
 * @returns {Promise<String>} the shared stylesheet, the epub and emails embed it as a string
 */
export const compileStyles = async path => {

	const entries = [ 'style', 'pdf', 'print' ]

	const [ style ] = await Promise.all( entries.map( async name => {
		if( verbose ) console.log( `Compiling ${ name }.scss` )
		const { css } = await sass.compileAsync( `${ path.styles }/${ name }.scss` )
		await fs.writeFile( `${ path.build }/${ name }.css`, css )
		return css
	} ) )

	await fs.cp( path.fonts, `${ path.build }/fonts`, { recursive: true } )

	return style

}
