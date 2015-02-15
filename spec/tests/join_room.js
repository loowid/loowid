'use strict';
module.exports = function(utils) {

	describe('Join room', function() {

		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0']);

	    utils.test('The users is not empty.', function(done) {
	    	utils.browsers.viewer0.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.viewer0.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    {id: utils.roomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(1);
	            expect(st[0].sessionid).toBe('');
	            done();
	    	});
	    });

	    utils.test('Cannot check users if not valid user.', function(done) {
	    	utils.getBrowser('hacker',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
		    		  form:    {id: utils.roomID}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.length).toBeUndefined(1);
		            done();
		    	});
	    	});
	    });

	});	
	
};
