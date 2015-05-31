'use strict';
module.exports = function(utils) {

	var getNextId = function(id) {
		var ids = [];
		ids.push(utils.owner);
		ids.push(utils.viewer0);
		ids.push(utils.viewer1);
		var sortIds = ids.sort();
		for (var k=0; k<sortIds.length; k+=1) {
			if (sortIds[k] === id) {
				return sortIds[((k<sortIds.length-1)?k+1:0)];
			}
		}
		return -1;
	};
	
	var getIdName = function(id) {
		return (id === utils.owner)?'owner':((id===utils.viewer0)?'viewer0':'viewer1'); 
	};
	
	describe('Test relay connector', function() {

		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
		
	    utils.test('Stream added and first proposal.', function(done) {
	    	var nextId = getNextId(utils.owner);
	    	utils.addListener('owner','r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(1);
	    		expect(proposal.offers[0].origin).toBe(utils.owner);
	    		expect(proposal.offers[0].mediatype).toBe('video');
	    		expect(proposal.offers[0].target).toBe(nextId);
	    		done();
	    	});
	    	// Set relay mode on
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'update_owner_data',
				'data': {
					'room': utils.roomID,
					'access': {
						'relay': true
					}
				}
	    	}));
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_added',
				'data': {
					'room': utils.roomID,
					'origin': utils.owner,
					'type':'video'
				}
	    	}));
	    });

	    utils.test('Stream added and proposal chain.', function(done) {
	    	var nextId = getNextId(utils.owner);
	    	var nextName = getIdName(nextId);
	    	var nextNextId = getNextId(nextId);
	    	utils.addListener(nextName,'r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(1);
	    		expect(proposal.offers[0].origin).toBe(utils.owner);
	    		expect(proposal.offers[0].mediatype).toBe('video');
	    		expect(proposal.offers[0].target).toBe(nextNextId);
		    	utils.ws[nextName].send(JSON.stringify({
					'eventName': 'rtc_status_update',
					'data': {
						'room': utils.roomID,
						'peerId': nextNextId,
						'source': 'video',
						'origin': utils.owner,
						'produced': true,
						'status': 'completed'
					}
		    	}));
	    		done();
	    	});
	    	utils.addListener('owner','r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(1);
	    		expect(proposal.offers[0].origin).toBe(utils.owner);
	    		expect(proposal.offers[0].mediatype).toBe('video');
	    		expect(proposal.offers[0].target).toBe(nextId);
		    	utils.ws.owner.send(JSON.stringify({
					'eventName': 'rtc_status_update',
					'data': {
						'room': utils.roomID,
						'peerId': nextId,
						'source': 'video',
						'origin': utils.owner,
						'produced': true,
						'status': 'completed'
					}
		    	}));
		    	utils.ws[nextName].send(JSON.stringify({
					'eventName': 'r_stream_added',
					'data': {
						'room': utils.roomID,
						'origin': utils.owner,
						'type':'video'
					}
		    	}));
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_added',
				'data': {
					'room': utils.roomID,
					'origin': utils.owner,
					'type':'video'
				}
	    	}));
	    });
	    

	    utils.test('Someone leaves the room.', function(done) {
	    	var nextId = getNextId(utils.owner);
	    	var nextName = getIdName(nextId);
	    	var nextNextId = getNextId(nextId);
	    	utils.addListener('owner','r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(1);
	    		expect(proposal.offers[0].origin).toBe(utils.owner);
	    		expect(proposal.offers[0].mediatype).toBe('video');
	    		expect(proposal.offers[0].target).toBe(nextNextId);
		    	done();
	    	});
	    	utils.ws[nextName].send(JSON.stringify({
				'eventName': 'room_leave',
				'data': utils.roomID
	    	}));
	    	utils.disconnect(nextName);
	    });

/*	    
	    utils.test('Someone joins the room.', function(done) {
	    });

	    utils.test('Stream removed.', function(done) {
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_removed',
				'data': {
					'room': utils.roomID
				}
	    	}));
	    	done();
	    });
	    
	    utils.test('Should accept.', function(done) {
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_should_accept',
				'data': {
					'room': utils.roomID
				}
	    	}));
	    	done();
	    });
	    
	    utils.test('Update info.', function(done) {
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_update_info',
				'data': {
					'room': utils.roomID
				}
	    	}));
	    	done();
	    });

	    utils.test('Stream test.', function(done) {
	    	utils.addListener('owner','r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(2);
	    		done();
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_test',
				'data': {
					'room': utils.roomID,
					'target': utils.owner,
					'offers': [ 
					            {'origin':utils.owner,'target':utils.viewer0,'type':'video'}, 
					            {'origin':utils.owner,'target':utils.viewer0,'type':'screen'} 
					          ]
				}
	    	}));
	    });
*/
	});	
	
};
