'use strict';
module.exports = function(utils) {

	describe('Viewer leaves room', function() {
		
		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
	    
	    utils.test('Viewer leaves the room.', function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('owner','peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils.viewer0);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer1','peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils.viewer0);
	    		utils.multipleDone(done);
	    	});
	    	utils.disconnect('viewer0');
	    });
	    
	    utils.test('The room has two guests one disconnected.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    {id: utils.roomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(2);
	            expect(st[0].sessionid).toBe('');
	            expect(st[0].connectionId).toBe(utils.viewer0);
	            expect(st[0].status).toBe('DISCONNECTED');
	            expect(st[1].sessionid).toBe('');
	            expect(st[1].connectionId).toBe(utils.viewer1);
	            expect(st[1].status).toBe('CONNECTED');
	            done();
	    	});
	    });

	});	
	
};
