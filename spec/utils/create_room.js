'use strict';
module.exports = function(utils) {

	    utils.test('Create room id returns a random id.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	utils.getBrowser('owner',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/rooms/createid'
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var room = JSON.parse(body);
		            expect(room.id.length).toBe(7);
		            utils.roomID = room.id;
		            done();
		            // Check DB Objects
		            /*utils.Log.count({'url':'/rooms/createid',
		            		  'date':{'$gte':requestDate},
		            		  'method':'POST'}).exec(function(e,n){
		            	expect(e).toBeNull();
		            	expect(n).toBeGreaterThan(0);
			            utils.Room.count({'roomId':room.id}).exec(function(e,n){
			            	expect(n).toBe(0);
			            	done();
			            });
		            });*/
		    	});
	    	});
	    });
	    
	    utils.test('Owner WebSocket connection done.',function(done) {
        	// WebSocket Connect !!
        	utils.connect('owner',utils.browsers.owner.usrid);
	    	utils.addListener('owner','get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
	    });

	    utils.test('The owner joins the room.',function(done) {
	    	utils.addListener('owner','get_peers',function(join){
	    		expect(join.you.length).toBeGreaterThan(0);
	    		utils.owner = join.you;
	    		done();
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
	    
	    utils.test('Create final room gets the previous id.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/create',
	    		  form:    {roomId: utils.roomID, name: 'Owner', connectionId: utils.owner, avatar: 'test/avatar'}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            utils.room = JSON.parse(body);
	            expect(utils.room.roomId).toBe(utils.roomID);
	            expect(utils.room.access.moderated).toBe(false);
	            done();
	            // Check DB Objects
	            /*utils.Log.count({'url':'/rooms/create',
	            		  'date':{'$gte':requestDate},
	            		  'method':'POST'}).exec(function(e,n){
	            	expect(e).toBeNull();
	            	expect(n).toBeGreaterThan(0);
		            utils.Room.count({'roomId':utils.roomID}).exec(function(e,n){
		            	expect(n).toBe(1);
		            	done();
		            });
	            });*/
	            
	    	});
	    });
	    
	    utils.test('The room is active.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/'+utils.owner+'/isActive',
	    		  form:    {id: utils.roomID, cid: utils.owner}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.status).toBe('active');
	            done();
	    	});
	    });

	    utils.test('The chat is empty.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/chat',
	    		  form:    {id: utils.roomID, pag: null}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.chat.length).toBe(0);
	            expect(st.page).toBe(0);
	            done();
	    	});
	    });

	    utils.test('The users is empty.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    {id: utils.roomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(0);
	            done();
	    	});
	    });

	    utils.test('The room is joinable.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/isJoinable',
	    		  form:    {id: utils.roomID}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.joinable).toBe(true);
	            expect(st.locked).toBe(false);
	            expect(st.private).toBe(false);
	            done();
	    	});
	    });
	
};
