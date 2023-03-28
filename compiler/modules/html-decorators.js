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
const get_all_hrefs_regex				 = new RegExp( `(<a.*?href="[https]{1,5}:)(.*?)(>.*?)(<\/a>)`, 'ig' )

const add_fn_below_matched_section = fn_counter => {
	return function ( fullmatch, before_anchor_id, anchor_id, after_anchor_id, div_all_inline_fn, offset, inputstring ) {
		return `${fullmatch}<div id='fn${fn_counter}' class='inline_footnote'><sup class='inline_sup'>[${fn_counter}]</sup>${ get_ftnote_content( inputstring, fn_counter ) }</div>`
	}
}

export const footnoteSingle = html => { 

	let fn_counter = 1
	while( fn_counter ){

		// Generate regex of the current footnote
		let reference  = get_fn_nr_regex( fn_counter )
		let paragraph  = exists_regex( html.data, get_fn_paragraph_w_footnotes_regex( fn_counter ) ) ? get_fn_paragraph_w_footnotes_regex( fn_counter ) : false
		let table 	   = exists_regex( html.data, get_fn_table_w_footnores_regex( fn_counter ) )     ? get_fn_table_w_footnores_regex( fn_counter ) : false
		let list 	   = exists_regex( html.data, get_fn_list_w_footnotes_regex( fn_counter ) )      ? get_fn_list_w_footnotes_regex( fn_counter ) : false

		// Check if fn<current> exists in the text
		if( exists_regex( html.data, reference ) ) {

			if( paragraph )  html.data = html.data.replace( paragraph, add_fn_below_matched_section( fn_counter ) )
			if( table ) 	 html.data = html.data.replace( table, add_fn_below_matched_section( fn_counter ) )
			if( list ) 	 	 html.data = html.data.replace( list, add_fn_below_matched_section( fn_counter ) )


			// Increment counter
			fn_counter ++

		} else { 
			fn_counter = false
		}
	}
	// Once all fns are inlined, remove the fn section
	let fn_section = exists_regex( html.data, get_fn_section_regex ) ? get_fn_section_regex : false
	if( fn_section ) html.data = html.data.replace( fn_section, '' )
	return html
}

export const footnoteMd = htmls => { 

	// Add footnotes to html objects
	let footnotified = htmls.map( footnoteSingle )

	return footnotified

}

export const footnotePdf = html => {

	let fn_counter = 1
	while( fn_counter ){ 

		// Generate regex of the current footnote
		let reference  = get_fn_nr_regex( fn_counter )
		let paragraph  = exists_regex( html, get_fn_paragraph_w_footnotes_regex( fn_counter ) ) ? get_fn_paragraph_w_footnotes_regex( fn_counter ) : false
		let table 	   = exists_regex( html, get_fn_table_w_footnores_regex( fn_counter ) )     ? get_fn_table_w_footnores_regex( fn_counter ) : false
		let list 	   = exists_regex( html, get_fn_list_w_footnotes_regex( fn_counter ) )      ? get_fn_list_w_footnotes_regex( fn_counter ) : false

	    // Check if fn<current> exists in the text
		if( exists_regex( html, reference ) ) {

			if( paragraph )  html = html.replace( paragraph, add_fn_below_matched_section( fn_counter ) )
			if( table ) 	 html = html.replace( table, add_fn_below_matched_section( fn_counter ) )
			if( list ) 	 	 html = html.replace( list, add_fn_below_matched_section( fn_counter ) )


			// Increment counter
			fn_counter ++

		} else { 
			fn_counter = false
		}
	}
	// Once all fns are inlined, remove the fn section
	let fn_section = exists_regex( html, get_fn_section_regex ) ? get_fn_section_regex : false
	if( fn_section ) html = html.replace( fn_section, '' )

	return html

}

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