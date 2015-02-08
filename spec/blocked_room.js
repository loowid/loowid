'use strict';
module.exports = function(request,test,utils) {

	describe('BLocked room', function() {
		
		require('./utils/create_room')(request,test,utils);
		
		require('./utils/join_room')(request,test,utils,['viewer0','viewer1']);
	    
	    test('Owner block the room.', function(done) {
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/editShared',
	    		  form:    { id: utils.roomID, access: { shared: 'LINK', passwd: 'pwd', moderated: false, locked: true, permanent: false, permanentkey: 'pkey', keywords: [] } }
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

	    test('Owner update the room.', function(done) {
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
	    
	    test('The room is not joinable.', function(done) {
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
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
	    
	});	
	
};
