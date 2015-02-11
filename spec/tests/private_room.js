'use strict';
module.exports = function(request,test,utils) {

	describe('Private room', function() {

		require('../utils/create_room')(request,test,utils);

	    test('Owner made the room private.', function(done) {
	    	var acc = utils.room.access;
	    	acc.shared = 'PRIVATE';
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/editShared',
	    		  form:    { id: utils.roomID, access: acc }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.guests.length).toBe(0);
	            expect(st.access.shared).toBe('PRIVATE');
	            done();
	    	});
	    });

	    test('The room is private.', function(done) {
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/isJoinable',
	    		  form:    {id: utils.roomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.joinable).toBe(true);
	            expect(st.locked).toBe(false);
	            expect(st.private).toBe(true);
	            done();
	    	});
	    });		

		require('../utils/join_room')(request,test,utils,['viewer0']);
		
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
	            expect(st[0].connectionId).toBe(utils.viewer0);
	            expect(st[0].status).toBe('CONNECTED');
	            done();
	    	});
	    });

	});	
	
};
