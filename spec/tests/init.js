'use strict';
/*jshint -W061 */
module.exports = function(utils) {

	describe('Server is working', function() {
		
	    utils.test('Hello call is working.', function(done) {
	    	utils.getBrowser('owner',function(browser){
		        browser.request(utils.testDomain+'/rooms/hello', function(error, response, body){
		            expect(response.headers['loowid-node']).toBe(browser.node);
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var hello = JSON.parse(body);
		            expect(hello.status).toBe(200);
		            done();
		        });
	    	});
	    });

	});
	
};
