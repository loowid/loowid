'use strict';
module.exports = function(request,test,utils) {

	describe('Join room', function() {

		require('./utils/create_room')(request,test,utils);
		
		require('./utils/join_room')(request,test,utils,['viewer0']);
		
	    test('The users is not empty.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
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

	});	
	
};
