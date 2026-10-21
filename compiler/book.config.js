/**
 * Everything specific to this book lives here
 * The compiler reads chapters from book/, images from assets/ and writes to build/
 */
import { resolve } from 'path'

const here = import.meta.dirname

export const path = {
	styles: resolve( `${ here }/modules/styles` ),
	fonts: resolve( `${ here }/fonts` ),
	source: resolve( `${ here }/../book` ),
	assets: resolve( `${ here }/../assets` ),
	build: resolve( `${ here }/../build` )
}

// Book Meta
export const meta = {
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

export const config = {
	freeChapters: [],
	premiumDripAresId: 9,
	freeDripAresId: 5 // Not using this for this book
}
