import publish from './modules/publisher'
import { promises as fs, existsSync as exists } from 'fs'
import sass from 'sass'
import { resolve } from 'path'

const { verbose, dirty } = process.env

// Book Meta
const getmeta = async path => ( 
	{ 
		title: 'Nothing Burger',
		author: 'Mentor Palokaj',
		publisher: 'Mentor Palokaj',
		url: "https://nothingburgerbook.com/#buyingoptions",
		email: {
			from: 'mentor@nothingburgerbook.com',
			replyto: 'mentor@nothingburgerbook.com'
		},
		css: await fs.readFile( path.css, 'utf8' ),
		csspath: path.css,
		printcsspath: path.printcsspath,
		root: path.source,
		// root: await fs.realpath( __dirname ),
		cover: `${__dirname}/../assets/cover.jpg`,
		verbose: false
	 }
)

const path = {
	sass: resolve( `${__dirname}/modules/styles/style.scss` ),
	css: resolve( `${__dirname}/modules/style.css` ),
	printsass: resolve( `${__dirname}/modules/styles/print.scss` ),
	printcsspath: resolve( `${__dirname}/modules/print.css` ),
	source: resolve( `${ __dirname }/..` ),
	build: resolve( `${ __dirname }/../build` )
}

const config = {
	tocHeadings: [
		{ match: 'Fasting means no calories for a while', heading: 'Basic fasting science' },
		{ match: 'Tracking your progress during a fast', heading:'Preparing for your fast' },
		{ match: 'Playbook day -2 and -1', heading: 'Day by day playbook' },
		{ match: 'Time restricted feeding', heading: 'Fasting in the rest of your life' }
	],
	freeChapters: [ '# Fasting is possibly healthy', '# Pre-fasting shopping list', '# Playbook day -2 and -1' ],
	premiumDripAresId: 6,
	freeDripAresId: 5
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
	if( verbose ) console.log( 'Start book transforms' )
	return publish( path.source, path.build, meta, config )
} )
// Feedback
.then( f => verbose && console.log( 'Generation complete' ) )
.catch( err => {
	console.log( err )
	process.exit( 1 )
} )