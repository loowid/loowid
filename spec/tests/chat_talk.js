'use strict';
/*jshint -W061 */
module.exports = function(request,test,utils) {

	describe('Chat talk conversion', function() {
		
	    test('Get audio for chat message.', function(done) {
	        request(utils.testDomain+'/chat/talk?text=Message', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(response.headers['content-type']).toBe('audio/mpeg');
	            expect(body.length).toBeGreaterThan(1000);
	            done();
	        });
	    });

	});
	
};
