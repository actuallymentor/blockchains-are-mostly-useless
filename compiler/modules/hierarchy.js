/**
 * markdown-it plugin: prefix headings with hierarchy numbers, e.g. "1.", "1.2.", "1.2.3."
 * Inlined replacement for the unmaintained markdown-it-hierarchy package
 *
 * Counters live on the plugin instance and persist across render() calls,
 * so rendering chapters one by one numbers them 1, 2, 3... like one document
 */
export default function hierarchy( md ) {

	// counters[ 0 ] counts h1s, counters[ 1 ] counts h2s within the current h1, etc
	const counters = []

	md.core.ruler.push( 'hierarchy', state => {

		state.tokens.forEach( ( token, index ) => {

			if( token.type != 'heading_open' ) return

			// h1 => depth 0, h2 => depth 1, ...
			const depth = Number( token.tag.slice( 1 ) ) - 1

			// Bump this level, reset everything below it
			counters[ depth ] = ( counters[ depth ] || 0 ) + 1
			counters.length = depth + 1

			// Missing parents (an h3 directly under an h1) count as 1
			const label = Array.from( counters, count => count || 1 ).join( '.' )

			// The inline token after heading_open holds the heading text
			const [ first_child ] = state.tokens[ index + 1 ].children
			if( first_child?.type == 'text' ) first_child.content = `${ label }. ${ first_child.content }`

		} )

	} )

}
