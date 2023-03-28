import { promises as fs } from 'fs'

// Filter out the markdowns from a path
const mds = path => ( 
	// Read the full dir
	fs.readdir( path )
	// Filter out the mds
	.then( files => files.filter( file => file.indexOf( '.md' ) != -1 ? true : false ) )
	// Remove files that do not begin with a number
	.then( files => files.filter( file => file.match( /^\d.*/ ) == null ? false : true ) )
	// Generate full paths for the files
	.then( filenames => filenames.map( filename => `${path}/${filename}` ) )
	// Sort files by numbers
	.then( markdowns => markdowns.sort() )
)

export default mds