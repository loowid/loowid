'use strict';
module.exports = function(request,test,utils) {

	describe('Owner leaves room', function() {
		
		require('../utils/create_room')(request,test,utils);
		
		require('../utils/join_room')(request,test,utils,['viewer0']);
	    
	    test('Owner leaves the room.', function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('viewer0','remove_peer_connected',function(peer){
	    		expect(peer.socketId).toBe(utils.owner);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('DISCONNECTED');
	    		utils.multipleDone(done);
	    	});
	    	utils.disconnect('owner');
	    });
	    
	    test('Owner WebSocket re-connection done.',function(done) {
	    	utils.addListener('owner','get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
        	// WebSocket Connect !!
        	utils.connect('owner');
	    });
	    
	    test('The owner re-joins the room.',function(done) {
	    	utils.addListener('viewer0','new_peer_connected',function(peer){
	    		utils.owner = peer.socketId;
		    	utils.addListener('owner','get_peers',function(join){
		    		expect(join.you).toBe(utils.owner);
		    		done();
		    	});
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
	    
	    test('Owner re-joins the room to get info.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/join',
	    		  form:    {id: utils.roomID, avatar: 'img/hero.png', connectionId: utils.owner , name: 'REOwner'}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.status).toBe('OPENED');
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.guests.length).toBe(1);
	            expect(st.guests[0].name).toBe('viewer0');
	            expect(st.guests[0].sessionid).toBe('');
	            expect(st.guests[0].status).toBe('CONNECTED');
	            done();
	    	});
	    });
	    
	    test('The owner update his data.',function(done) {
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('OPENED');
	    		done();
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'update_owner_data',
				'data': {
					'room': utils.roomID,
					'ownerName': 'Owner',
					'ownerAvatar': 'img/heroe.png',
					'status': 'OPENED'
				}
	    	}));
	    });

	});	
	
};
