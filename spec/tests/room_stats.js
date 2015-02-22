'use strict';
/*jshint -W061 */
module.exports = function(utils) {

	describe('Get room stats', function() {
		
	    utils.test('Cannot get room stats without password.', function(done) {
	    	utils.getBrowser('admin',function(browser){
		        utils.browsers.owner.request(utils.testDomain+'/stats/rooms', function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(401);
		            expect(body).toBe('Unauthorized');
		            done();
		        });
	    	});
	    });

	    utils.test('Can get room stats using basic auth.', function(done) {
	    	utils.browsers.owner.request(utils.testDomain.replace('//','//admin:admin@')+'/stats/rooms', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            done();
	        });
	    });

	    utils.test('Can get room stats by type using basic auth.', function(done) {
	    	utils.browsers.owner.request(utils.testDomain.replace('//','//admin:admin@')+'/stats/roomsbytype', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            done();
	        });
	    });

	});
	
};
