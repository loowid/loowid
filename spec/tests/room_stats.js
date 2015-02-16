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
	            var st = JSON.parse(body);
	            expect(st.length).toBeGreaterThan(0);
	            expect(st[0]._id.year).toBe(new Date().getFullYear());
	            expect(st[0].count).toBeGreaterThan(0);
	            done();
	        });
	    });

	});
	
};
