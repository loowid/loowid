'use strict';
module.exports = function(utils) {

	describe('Blocked room', function() {
		
		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
	    
		utils.test('Owner block the room.', function(done) {
	    	var acc = utils.room.access;
	    	acc.locked = true;
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/editShared',
	    		  form:    { id: utils.roomID, access: acc }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.guests.length).toBe(2);
	            expect(st.access.locked).toBe(true);
	            expect(st.guests[0].sessionid).toBe('');
	            expect(st.guests[0].connectionId).toBe(utils.viewer0);
	            expect(st.guests[0].status).toBe('CONNECTED');
	            expect(st.guests[1].sessionid).toBe('');
	            expect(st.guests[1].connectionId).toBe(utils.viewer1);
	            expect(st.guests[1].status).toBe('CONNECTED');
	            done();
	    	});
	    });

	    utils.test('Owner update the room.', function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('OPENED');
	    		expect(own.access.locked).toBe(true);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer1','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('OPENED');
	    		expect(own.access.locked).toBe(true);
	    		utils.multipleDone(done);
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'update_owner_data',
				'data': {
					'room': utils.roomID,
					'ownerName': 'Owner',
					'ownerAvatar': 'img/heroe.png',
					'status': 'OPENED',
					'access': {
						'locked':true
					}
				}
	    	}));
	    });
	    
	    utils.test('The room is not joinable.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/isJoinable',
	    		  form:    {id: utils.roomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.joinable).toBe(false);
	            expect(st.locked).toBe(true);
	            expect(st.permanent).toBe(false);
	            done();
	    	});
	    });
	    
	    utils.test('Owner leave the romm.',function(done) {
        	// WebSocket Disconnect !!
	    	utils.checkDone = 2;
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('DISCONNECTED');
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer1','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('DISCONNECTED');
	    		utils.multipleDone(done);
	    	});
	    	utils.disconnect('owner');
	    });

	    utils.test('Owner websocket connection again.',function(done) {
        	// WebSocket Connect !!
        	utils.connect('owner',utils.browsers.owner.usrid);
	    	utils.addListener('owner','get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
	    });

	    utils.test('The owner joins the room again.',function(done) {
	    	utils.addListener('owner','get_peers',function(join){
	    		expect(join.you.length).toBeGreaterThan(0);
	    		utils.owner = join.you;
	    		done();
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'join_room',
				'data': {
					'room': utils.roomID,
					'pwd': '',
					'reload': true
				}
	    	}));
	    });
	    
	});	
	
};
