'use strict';
module.exports = function(request,test,utils) {

	describe('Create room', function() {
		
	    test('Keep call returns true.', function(done) {
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/keep'
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var keep = JSON.parse(body);
	            expect(keep.keep).toBeTruthy();
	            done();
	    	});
	    });
		
	    test('Create room id returns a random id.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/createid'
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var room = JSON.parse(body);
	            expect(room.id.length).toBe(7);
	            utils.roomID = room.id;
	            // Check DB Objects
	            utils.Log.count({'url':'/rooms/createid',
	            		  'date':{'$gte':requestDate},
	            		  'method':'POST'}).exec(function(e,n){
	            	expect(e).toBeNull();
	            	expect(n).toBe(1);
		            utils.Room.count({'roomId':room.id}).exec(function(e,n){
		            	expect(n).toBe(0);
		            	done();
		            });
	            });
	    	});
	    });
	    
	    test('Create final room gets the previous id.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/create',
	    		  form:    {roomId: utils.roomID, name: 'test',connectionId: 'socketid', avatar: 'test/avatar'}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            utils.room = JSON.parse(body);
	            expect(utils.room.roomId).toBe(utils.roomID);
	            // Check DB Objects
	            utils.Log.count({'url':'/rooms/create',
	            		  'date':{'$gte':requestDate},
	            		  'method':'POST'}).exec(function(e,n){
	            	expect(e).toBeNull();
	            	expect(n).toBe(1);
		            utils.Room.count({'roomId':utils.roomID}).exec(function(e,n){
		            	expect(n).toBe(1);
		            	done();
		            });
	            });
	            
	    	});
	    });
	    
	    test('WebSocket connection done.',function(done) {
	    	utils.addListener('get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
        	// WebSocket Connect !!
        	utils.connect();
	    });
	    
	    test('Join the room.',function(done) {
	    	utils.addListener('get_peers',function(join){
	    		expect(join.you.length).toBeGreaterThan(0);
	    		utils.owner = join.you;
	    		done();
	    	});
	    	utils.ws.send(JSON.stringify({
				'eventName': 'join_room',
				'data': {
					'room': utils.roomID,
					'pwd': '',
					'reload': ''
				}
	    	}));
	    });
	    
	});	
	
};
