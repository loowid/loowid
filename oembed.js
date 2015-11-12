/*
 * List of domains that will be explored looking for oembed objects
 * All domains are search with and without www at the beginning.
 */
var OEmbedProviders = {
	domains: [
	         'vimeo.com',
	         'youtube.com',
	         'codepen.io',
	         'dailymotion.com',
	         'ustream.tv',
	         'animoto.com',
	         'hulu.com',
	         'slideshare.net',
	         'ted.com',
	         'circuitlab.com',
	         'soundcloud.com',
	         'sketchfab.com',
	         'vine.co',
	         'collegehumor.com'
	         ]
};
// This works in node and browser
if(typeof exports !== 'undefined'){
	exports.domains = OEmbedProviders.domains;
}