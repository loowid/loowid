'use strict';
/*jshint -W061 */
module.exports = function(utils) {

	describe('Chat talk conversion', function() {
		
		utils.test('Get audio for chat message.', function(done) {
	    	utils.getBrowser('anon',function(browser){
		        browser.request(utils.testDomain+'/chat/talk?text=Message', function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            expect(response.headers['content-type']).toBe('audio/mpeg');
		            expect(body.length).toBeGreaterThan(1000);
		            done();
		        });
	    	});
	    });

	});
	
};
