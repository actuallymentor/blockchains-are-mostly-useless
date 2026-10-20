// Get the content of a footnote based on it's footnote number
const get_ftnote_content = ( html, fn_number ) => {
	let ref_html_data = new RegExp(  `(<li id="fn${fn_number}" class="footnote-item"><p>)(.*?)(<\\/p>)`, 's' )
	return ref_html_data.exec( html )[2]
}

// Check if a regex pattern exists
const exists_regex = ( html, query ) => html.search( query ) != -1

// Get the html of a reference
const get_fn_nr_regex = fn_number => new RegExp( `(<a href="#fn${fn_number}".*?>)(.*?)(<\\/a>)` )

// Complex regex to capture a footnote with surrounding paragraph, as well as potential inline footnotes
const fn_string = `((?:\\s*<div id='fn\\d+?' class='inline_footnote'>.*?<\\/div>)*)`
const get_fn_paragraph_w_footnotes_regex = fn_number => new RegExp( `(<p>.*?)("#fn${fn_number}")(.*?<\\/p>)${fn_string}` )
const get_fn_table_w_footnores_regex 	 = fn_number => new RegExp( `(<table>(?:(?!<\\/table>).)*?)("#fn${fn_number}")(.*?<\\/table>)${fn_string}`, 's' )
const get_fn_list_w_footnotes_regex 	 = fn_number => new RegExp( `(<(?:ul|ol)>(?:(?!<\\/(?:ul|ol)>).)*?)("#fn${fn_number}")(.*?<\\/(?:ul|ol)>)${fn_string}`, 's' )
const get_fn_section_regex				 = new RegExp( `<hr class="footnotes-sep".*?<\\/section>`, 's' )
const get_all_hrefs_regex				 = new RegExp( `(<a.*?href="[https]{1,5}:)(.*?)(>.*?)(</a>)`, 'ig' )

const add_fn_below_matched_section = fn_counter => {
	return function ( fullmatch, before_anchor_id, anchor_id, after_anchor_id, div_all_inline_fn, offset, inputstring ) {
		return `${fullmatch}<div id='fn${fn_counter}' class='inline_footnote'><sup class='inline_sup'>[${fn_counter}]</sup>${ get_ftnote_content( inputstring, fn_counter ) }</div>`
	}
}

/**
 * Move every footnote from the footnote section at the bottom to just below the paragraph, table or list that references it
 * @param {String} html - rendered markdown-it-footnote html
 * @returns {String} html with inline footnotes and without the footnote section
 */
export const inlineFootnotes = html => {

	for( let fn_counter = 1; exists_regex( html, get_fn_nr_regex( fn_counter ) ); fn_counter++ ) {

		// A footnote can sit in a paragraph, a table or a list, inline it below whichever holds it
		const containers = [
			get_fn_paragraph_w_footnotes_regex( fn_counter ),
			get_fn_table_w_footnores_regex( fn_counter ),
			get_fn_list_w_footnotes_regex( fn_counter )
		].filter( container => exists_regex( html, container ) )

		for( const container of containers ) html = html.replace( container, add_fn_below_matched_section( fn_counter ) )

	}

	// Once all fns are inlined, remove the fn section
	return html.replace( get_fn_section_regex, '' )

}

// Inline footnotes for a list of { data: html } chapters
export const footnoteMd = chapters => chapters.map( chapter => ( { ...chapter, data: inlineFootnotes( chapter.data ) } ) )

export const decorateHrefs = html => {

	// Grab all hrefs
	const hrefs = html.matchAll( get_all_hrefs_regex )

	for ( const href of hrefs ) {
		const [ full, pre, url, words, post ] = href

		let decorated = `${pre}${url}${words} (${ new URL( 'http://' + url ).hostname.replace( 'www.', '' ) })${post}`

		html = html.replace( full, decorated )
	}
	return html
}

export const addVersioningData = html => {

	html = html.replace( /%%LASTEDIT%%/g, process.env.lastedit )
	html = html.replace( /%%BOOKVERSION%%/g, process.env.bookversion )

	return html
}