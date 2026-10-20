import { promises as fs } from 'fs'

/**
 * List the chapter markdown files of a folder in reading order
 * Only files starting with a number count, sorted numerically so "10.0" comes after "2.0"
 * @param {String} path - folder holding the chapters
 * @returns {Promise<String[]>} full paths
 */
const mds = async path => {

	const files = await fs.readdir( path )

	return files
		.filter( file => file.endsWith( '.md' ) && /^\d/.test( file ) )
		.sort( ( a, b ) => a.localeCompare( b, 'en', { numeric: true } ) )
		.map( file => `${ path }/${ file }` )

}

export default mds
