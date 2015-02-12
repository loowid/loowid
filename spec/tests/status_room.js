'use strict';
module.exports = function(request,test,utils) {

	describe('Change status room', function() {

		require('../utils/create_room')(request,test,utils);
		
		require('../utils/join_room')(request,test,utils,['viewer0','viewer1']);
		
	    test('The owner change room status.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
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
	    
	    test('Owner update the room.', function(done) {
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

	    test('The viewer cannot change room status.', function(done) {
	    	utils.Room.find({roomId:utils.roomID},function(err,r){
	    		// Change sessionid to verify can not change room status
	    		var room = r[0];
	    		room.owner.sessionid = 'XXXXXX';
	    		room.save(function(e,ro){
			    	request.post({
			    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
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
	    });
	    
	    
	});	
	
};
