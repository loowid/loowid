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
		
	    utils.test('Stream added and proposal chain.', function(done) {
	    	utils.checkDone = 2;
	    	var nextId = getNextId(utils.owner);
	    	var nextName = getIdName(nextId);
	    	var nextNextId = getNextId(nextId);
	    	var nextNextName = getIdName(nextNextId);
	    	utils.addListener(nextName,'r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(1);
	    		expect(proposal.offers[0].origin).toBe(utils.owner);
	    		expect(proposal.offers[0].mediatype).toBe('video');
	    		expect(proposal.offers[0].target).toBe(nextNextId);
		    	utils.ws[nextName].send(JSON.stringify({
					'eventName': 'rtc_status_update',
					'data': {
						'room': utils.roomID,
						'peerId': utils.owner,
						'source': 'video',
						'origin': utils.owner,
						'produced': false,
						'status': 'connected'
					}
		    	}));
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
		    	utils.ws[nextNextName].send(JSON.stringify({
					'eventName': 'rtc_status_update',
					'data': {
						'room': utils.roomID,
						'peerId': nextId,
						'source': 'video',
						'origin': utils.owner,
						'produced': false,
						'status': 'connected'
					}
		    	}));
		    	utils.multipleDone(done);
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
		    	utils.multipleDone(done);
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
	    	// Click share webcam
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_added',
				'data': {
					'room': utils.roomID,
					'origin': utils.owner,
					'type':'video'
				}
	    	}));
	    });
	    
	    var removedUser = null;
	    utils.test('Someone leaves the room.', function(done) {
	    	var nextId = getNextId(utils.owner);
	    	var nextName = getIdName(nextId);
	    	var nextNextId = getNextId(nextId);
	    	removedUser = nextName;
	    	utils.addListener('owner','r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(1);
	    		expect(proposal.offers[0].origin).toBe(utils.owner);
	    		expect(proposal.offers[0].mediatype).toBe('video');
	    		expect(proposal.offers[0].target).toBe(nextNextId);
		    	done();
	    	});
	    	utils.disconnect(nextName);
	    });


	    utils.test('Someone joins the room.', function(done) {
	    	utils.checkDone = 2;
	    	var fpn = function(proposal){
	    		expect(proposal.offers.length).toBe(1);
	    		expect(proposal.offers[0].origin).toBe(utils.owner);
	    		expect(proposal.offers[0].mediatype).toBe('video');
	    		expect(proposal.offers[0].target).toBe(utils[removedUser]);
	    		utils.multipleDone(done);
	    	};
	    	var users = ['owner','viewer0','viewer1'];
	    	for (var k=0; k<users.length; k+=1) {
	    		if (users[k] !== removedUser) {
	    			utils._events[users[k]] = [];
	    			utils.addListener(users[k],'r_proposal',fpn);
	    		}
	    	}
	    	utils.connect(removedUser,utils.browsers[removedUser].usrid);
	    	utils.addListener(removedUser,'get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	        	utils.addListener(removedUser,'get_peers',function(join){
	        		expect(join.you.length).toBeGreaterThan(0);
	        		utils[removedUser] = join.you;
	    	    	utils.multipleDone(done);
	        	});
		    	utils.ws[removedUser].send(JSON.stringify({
					'eventName': 'join_room',
					'data': {
						'room': utils.roomID,
						'pwd': utils.room.access.passwd,
						'reload': true
					}
		    	}));
	    	});
	    });

	});	
	
};
