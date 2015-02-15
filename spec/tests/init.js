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

	    utils.test('Keep call returns true.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/keep'
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var keep = JSON.parse(body);
	            expect(keep.keep).toBeTruthy();
	            done();
	    	});
	    });
	
	});
	
};
