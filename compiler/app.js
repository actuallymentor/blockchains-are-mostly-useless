import publish from './modules/publisher'
import { promises as fs, existsSync as exists } from 'fs'
import sass from 'sass'
import { resolve } from 'path'

const { verbose, dirty } = process.env

// Book Meta
const getmeta = async path => ( 
	{ 
		title: 'Blockchains are mostly useless',
		author: 'Mentor Palokaj',
		publisher: 'Mentor Palokaj',
		url: "https://github.com/actuallymentor/blockchains-are-mostly-useless/",
		email: {
			from: 'mentor@palokaj.co',
			replyto: 'mentor@palokaj.co'
		},
		css: await fs.readFile( path.css, 'utf8' ),
		csspath: path.css,
		printcsspath: path.printcsspath,
		root: path.source,
		asset_path: `${__dirname}/../assets`,
		// root: await fs.realpath( __dirname ),
		cover: `${__dirname}/../assets/cover.png`,
		verbose: false
	}
)

const path = {
	sass: resolve( `${__dirname}/modules/styles/style.scss` ),
	css: resolve( `${__dirname}/modules/style.css` ),
	printsass: resolve( `${__dirname}/modules/styles/print.scss` ),
	printcsspath: resolve( `${__dirname}/modules/print.css` ),
	source: resolve( `${ __dirname }/../book` ),
	build: resolve( `${ __dirname }/../build` )
}

const config = {
	tocHeadings: [
		// { match: 'string', heading: 'string' }
	],
	freeChapters: [],
	premiumDripAresId: 9,
	freeDripAresId: 5 // Not using this for this book
}

const sassify = async ( infile, outfile ) => {
	console.log( 'Sassifying: ', infile, ' to ', outfile )
	try {
		const { css } = await sass.compileAsync( infile )
		await fs.writeFile( outfile, css )
	} catch( e ) {
		console.log( 'SASSification error: ', e )
	}
}

// Build the css from sass
export default Promise.all( [
	sassify( path.sass, path.css ),
	sassify( path.printsass, path.printcsspath )
] )
// Make the build folder if it does not yet exist
.then( async f => {

	if( verbose ) console.log( 'Sassification complete' )
	if( dirty ) return

	// Remove old files
	if( exists( path.build ) ) {
		const files = await fs.readdir( path.build )
		if( files ) await Promise.all( files.map( file => fs.unlink( `${ path.build }/${ file }` ) ) )

		return verbose && console.log( 'Directory cleaned' ) // No need to continue
	}

	return fs.mkdir( path.build, { recursive: true } )

} )
// Get the css and generate a meta data object
.then( f => getmeta( path ) )
// Read and transform the book
.then( meta => {
	if( verbose ) console.log( 'Start book transforms with' )
	return publish( path.source, path.build, meta, config )
} )
// Feedback
.then( f => verbose && console.log( 'Generation complete' ) )
.catch( err => {
	console.log( err )
	process.exit( 1 )
} )