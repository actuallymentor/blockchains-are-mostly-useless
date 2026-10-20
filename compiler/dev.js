/**
 * Live preview while writing: the book opens in the Vivliostyle viewer and refreshes on every save
 *
 * npm run dev            paperback layout
 * npm run dev digital    digital pdf layout
 */
import { watch, promises as fs } from 'fs'
import { spawn } from 'child_process'
import { path, meta } from './book.config.js'
import { compileStyles } from './modules/styles.js'
import { readBook } from './modules/publisher.js'
import { makePdfHtmls, writePdfHtmls, browser, vivliostyle_bin } from './modules/pdf.js'

const variant = process.argv[2] == 'digital' ? 'digital' : 'print'

// Version stamps normally come from git in npm start
process.env.lastedit ??= 'preview'
process.env.bookversion ??= 'draft'

// Regenerate the html and css that the viewer shows, the viewer reloads when they change on disk
const prepare = async () => {

	await fs.mkdir( path.build, { recursive: true } )
	await compileStyles( path )

	const markdowns = await readBook( path.source )
	await writePdfHtmls( makePdfHtmls( meta, markdowns ), meta, path.build )

}

// Saves often come in bursts, rebuild once they settle
let timer
const rebuild = () => {
	clearTimeout( timer )
	timer = setTimeout( () => prepare()
		.then( () => console.log( `Updated ${ new Date().toLocaleTimeString() }` ) )
		.catch( error => console.error( 'Preview not updated:', error.message ) ), 200 )
}

await prepare()

for( const folder of [ path.source, path.styles, path.assets ] ) watch( folder, { recursive: true }, rebuild )

// Without a display (containers, ssh) only serve the viewer, open the printed url in your own browser
const headless = process.platform == 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY

const viewer = spawn( vivliostyle_bin, [
	'preview', `${ path.build }/${ meta.title }-${ variant }.html`,
	'--browser', browser,
	'--sandbox',
	...headless ? [ '--no-open-viewer', '--host', '0.0.0.0' ] : []
], { stdio: 'inherit' } )

// The viewer lives and dies with this process, so it never lingers holding the port
viewer.on( 'exit', code => process.exit( code ?? 0 ) )
for( const signal of [ 'SIGINT', 'SIGTERM', 'SIGHUP' ] ) process.on( signal, () => viewer.kill( signal ) )
