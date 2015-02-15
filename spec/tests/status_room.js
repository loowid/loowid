'use strict';
module.exports = function(utils) {

	describe('Change status room', function() {

		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
		
	    utils.test('The owner change room status.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/changeRoomStatus',
	    		  form:    {id: utils.roomID, status:'BROADCASTING' }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.guests.length).toBe(2);
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.status).toBe('BROADCASTING');
	            done();
	    	});
	    });
	    
	    utils.test('Owner update the room.', function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('BROADCASTING');
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer1','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('BROADCASTING');
	    		utils.multipleDone(done);
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'update_owner_data',
				'data': {
					'room': utils.roomID,
					'ownerName': 'Owner',
					'ownerAvatar': 'img/heroe.png',
					'status': 'BROADCASTING'
				}
	    	}));
	    });

	    utils.test('The viewer cannot change room status.', function(done) {
	    	utils.browsers.viewer0.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.viewer0.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/changeRoomStatus',
	    		  form:    {id: utils.roomID, status:'STOPPED' }
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
