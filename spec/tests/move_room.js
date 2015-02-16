'use strict';
module.exports = function(utils) {

	describe('Move room', function() {
		
		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
	    
	    utils.test('The owner moves to another room.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/move',
	    		  form:    {id: utils.roomID, list:[utils.viewer1]}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.success).toBe(true);
	            expect(st.fromRoomId).toBe(utils.roomID);
	            expect(st.toRoomId.length).toBe(7);
	            utils.toRoomID = st.toRoomId; 
	            done();
	    	});
	    });

	    utils.test('The owner send move signal to everybody.', function(done) {
	    	utils.checkDone = 4;
	    	utils.addListener('owner','peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils.viewer1);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer0','peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils.viewer1);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer0','room_moved',function(move){
	    		expect(move.room).toBe(utils.toRoomID);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer1','room_out',function(move){
	    		expect(move.room).toBe(utils.roomID);
	    		utils.disconnect('viewer1');
	    		utils.multipleDone(done);
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'move_room',
				'data': { 
					'toRoom': utils.toRoomID,
					'fromRoom': utils.roomID,
					'list': [utils.viewer1]
				}
	    	}));
	    });

	    utils.test('The room has two guests one disconnected.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.toRoomID+'/users',
	    		  form:    {id: utils.toRoomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(2);
	            expect(st[0].sessionid).toBe('');
	            expect(st[0].connectionId).toBe(utils.viewer0);
	            expect(st[0].status).toBe('CONNECTED');
	            expect(st[1].sessionid).toBe('');
	            expect(st[1].connectionId).toBe(utils.viewer1);
	            expect(st[1].status).toBe('DISCONNECTED');
	            done();
	    	});
	    });
	    
	    utils.test('The old room is not available.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    {id: utils.toRoomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(404);
	            var st = JSON.parse(body);
	            expect(st.error).toBe('Failed to load the room: '+utils.roomID);
	            done();
	    	});
	    });
	    
	});	
	
};
