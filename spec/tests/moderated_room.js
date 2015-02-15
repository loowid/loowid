'use strict';
module.exports = function(utils) {

	describe('Moderated room', function() {

		require('../utils/create_room')(utils);

		require('../utils/join_room')(utils,['viewer0','viewer1']);

	    utils.test('Owner made the room moderated.', function(done) {
	    	var acc = utils.room.access;
	    	acc.moderated = true;
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
	            expect(st.access.moderated).toBe(true);
	            utils.claimUrl = st.access.permanentkey;
	            utils.claimedRoom = utils.roomID;
	            done();
	    	});
	    });
	    
	    utils.test('Viewer cannot send offers.', function(done) {
	    	utils.addListener('owner','receive_offer',function(off){
	    		expect(true).toBe(false);
	    	});
	    	utils.addListener('viewer1','receive_offer',function(off){
	    		expect(true).toBe(false);
	    	});
	    	utils.ws.viewer0.send(JSON.stringify({
				'eventName': 'send_offer',
				'data': {
					'room': utils.roomID,
					'mediatype': 'video',
					'socketId': utils.owner,
					'sdp': {'sdp':'v=0','type':'offer'}
				}
	    	}));
	    	utils.ws.viewer0.send(JSON.stringify({
				'eventName': 'send_offer',
				'data': {
					'room': utils.roomID,
					'mediatype': 'video',
					'socketId': utils.viewer1,
					'sdp': {'sdp':'v=0','type':'offer'}
				}
	    	}));
	    	// Wait just in case offer is received
	    	setTimeout(done,500);
	    });

	    utils.test('Owner can send offers.', function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('viewer0','receive_offer',function(off){
	    		expect(off.sdp.type).toBe('offer');
	    		expect(off.socketId).toBe(utils.owner);
	    		expect(off.mediatype).toBe('video');
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer1','receive_offer',function(off){
	    		expect(off.sdp.type).toBe('offer');
	    		expect(off.socketId).toBe(utils.owner);
	    		expect(off.mediatype).toBe('video');
	    		utils.multipleDone(done);
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'send_offer',
				'data': {
					'room': utils.roomID,
					'mediatype': 'video',
					'socketId': utils.viewer0,
					'sdp': {'sdp':'v=0','type':'offer'}
				}
	    	}));
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'send_offer',
				'data': {
					'room': utils.roomID,
					'mediatype': 'video',
					'socketId': utils.viewer1,
					'sdp': {'sdp':'v=0','type':'offer'}
				}
	    	}));
	    });
	    
	});	
	
};
