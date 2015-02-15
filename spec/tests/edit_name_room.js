'use strict';
module.exports = function(utils) {

	describe('Edit names', function() {

		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
		
		utils.test('The owner change his name.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/editName',
	    		  form:    {id: utils.roomID, avatar:'img/hero.png' , name: 'NewOwner' }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.guests.length).toBe(2);
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.owner.name).toBe('NewOwner');
	            done();
	    	});
	    });
	    
	    utils.test('Owner update the room.', function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('NewOwner');
	    		expect(own.status).toBe('OPENED');
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer1','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('NewOwner');
	    		expect(own.status).toBe('OPENED');
	    		utils.multipleDone(done);
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'update_owner_data',
				'data': {
					'room': utils.roomID,
					'ownerName': 'NewOwner',
					'ownerAvatar': 'img/heroe.png',
					'status': 'OPENED'
				}
	    	}));
	    });

	    utils.test('The viewer change his name.', function(done) {
	    	utils.browsers.viewer0.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.viewer0.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/'+utils.viewer0+'/editName',
	    		  form:    {id: utils.roomID, avatar:'img/hero.png' , name: 'NewViewer', cid: utils.viewer0 }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.guests.length).toBe(2);
	            expect(st.guests[0].name).toBe('NewViewer');
	            expect(st.guests[0].status).toBe('CONNECTED');
	            expect(st.guests[0].connectionId).toBe(utils.viewer0);
	            expect(st.guests[0].sessionid).toBe('');
	            expect(st.guests[1].name).toBe('viewer1');
	            expect(st.guests[1].status).toBe('CONNECTED');
	            expect(st.guests[1].connectionId).toBe(utils.viewer1);
	            expect(st.guests[1].sessionid).toBe('');
	            done();
	    	});
	    });
	    
	    utils.test('Viewer update the guests list.', function(done) {
	    	utils.addListener('owner','peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils.viewer0);
	    		done();
	    	});
	    	utils.addListener('viewer1','peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils.viewer0);
	    		done();
	    	});
	    	utils.ws.viewer0.send(JSON.stringify({
				'eventName': 'peer_list_updated',
				'data': {
					'room': utils.roomID
				}
	    	}));
	    });

	    utils.test('The room has one guests with new name.', function(done) {
	    	utils.browsers.viewer0.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.viewer0.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    {id: utils.roomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(2);
	            expect(st[0].sessionid).toBe('');
	            expect(st[0].connectionId).toBe(utils.viewer0);
	            expect(st[0].status).toBe('CONNECTED');
	            expect(st[0].name).toBe('NewViewer');
	            expect(st[1].sessionid).toBe('');
	            expect(st[1].connectionId).toBe(utils.viewer1);
	            expect(st[1].status).toBe('CONNECTED');
	            expect(st[1].name).toBe('viewer1');
	            done();
	    	});
	    });

	    utils.test('The viewer cannot change other name.', function(done) {
	    	utils.browsers.viewer0.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.viewer0.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/'+utils.viewer1+'/editName',
	    		  form:    {id: utils.roomID, avatar:'img/hero.png' , name: 'NewViewer', cid: utils.viewer1 }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(403);
	            var st = JSON.parse(body);
	            expect(st.error).toBe('Invalid session.');
	            done();
	    	});
	    });
	    
	    
	});	
	
};
