import publish from './modules/publisher.js'
import { promises as fs } from 'fs'
import * as sass from 'sass'
import { resolve } from 'path'

const { verbose, dirty } = process.env
const here = import.meta.dirname

const path = {
	styles: resolve( `${ here }/modules/styles` ),
	fonts: resolve( `${ here }/fonts` ),
	source: resolve( `${ here }/../book` ),
	assets: resolve( `${ here }/../assets` ),
	build: resolve( `${ here }/../build` )
}

// Book Meta
const meta = {
	title: 'Blockchains are mostly useless',
	author: 'Mentor Palokaj',
	publisher: 'Mentor Palokaj',
	description: 'Why blockchains are unsuited to most tasks, and in which cases they can be useful',
	url: "https://github.com/actuallymentor/blockchains-are-mostly-useless/",
	email: {
		from: 'mentor@palokaj.co',
		replyto: 'mentor@palokaj.co'
	},
	root: path.source,
	font_path: path.fonts,
	asset_path: path.assets,
	asset_prefix: '../assets', // Used in search replace of the markdown
	sendy_book_asset_path: 'https://mail.palokaj.co/uploads/blockchains-are-mostly-useless/assets/',
	cover: `${ path.assets }/cover.png`
}

const config = {
	freeChapters: [],
	premiumDripAresId: 9,
	freeDripAresId: 5 // Not using this for this book
}

// Compile every stylesheet entry point into the build folder, next to a copy of the fonts
const compileStyles = async () => {

	const entries = [ 'style', 'pdf', 'print' ]

	const [ style ] = await Promise.all( entries.map( async name => {
		if( verbose ) console.log( `Compiling ${ name }.scss` )
		const { css } = await sass.compileAsync( `${ path.styles }/${ name }.scss` )
		await fs.writeFile( `${ path.build }/${ name }.css`, css )
		return css
	} ) )

	await fs.cp( path.fonts, `${ path.build }/fonts`, { recursive: true } )

	// The epub and emails embed the shared stylesheet as a string
	return style

}

const build = async () => {

	// Start from an empty build folder unless asked not to
	if( !dirty ) await fs.rm( path.build, { recursive: true, force: true } )
	await fs.mkdir( path.build, { recursive: true } )

	const css = await compileStyles()

	await publish( path.source, path.build, { ...meta, css }, config )

	if( verbose ) console.log( 'Generation complete' )

}

build().catch( error => {
	console.error( error )
	process.exit( 1 )
} )
