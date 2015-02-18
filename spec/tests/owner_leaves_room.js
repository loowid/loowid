'use strict';
module.exports = function(utils) {

	describe('Owner leaves room', function() {
		
		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0']);
	    
	    utils.test('Owner leaves the room.', function(done) {
	    	/*utils.checkDone = 2;
	    	 * This event only fire if you are in the same node
	    	utils.addListener('viewer0','remove_peer_connected',function(peer){
	    		expect(peer.socketId).toBe(utils.owner);
	    		utils.multipleDone(done);
	    	});*/
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('DISCONNECTED');
	    		//utils.multipleDone(done);
	    		done();
	    	});
	    	utils.disconnect('owner');
	    });
	    
	    utils.test('Owner WebSocket re-connection done.',function(done) {
        	// WebSocket Connect !!
        	utils.connect('owner',utils.browsers.owner.usrid);
	    	utils.addListener('owner','get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
	    });
    	
	    var conditions = [];
	    
	    utils.test('The owner re-joins the room.',function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('viewer0','new_peer_connected',function(peer){
	    		conditions.push({received:peer.socketId,id:'owner'});
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('owner','get_peers',function(join){
	    		utils.owner = join.you;
	    		utils.multipleDone(done);
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
	    
	    utils.test('Check owner peer.',function(done){
	    	expect(conditions.length).toBe(1);
	    	expect(conditions[0].received).toBe(utils[conditions[0].id]);
	    	done();
	    });
	    
	    utils.test('Owner re-joins the room to get info.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
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
	    
	    utils.test('The owner update his data.',function(done) {
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
