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
	    
	    test('Owner WebSocket connection done.',function(done) {
	    	utils.addListener('owner','get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
        	// WebSocket Connect !!
        	utils.connect('owner');
	    });

	    test('The owner joins the room.',function(done) {
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
	    
	    test('Create final room gets the previous id.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/create',
	    		  form:    {roomId: utils.roomID, name: 'Owner', connectionId: utils.owner, avatar: 'test/avatar'}
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
	    
	    test('The room is active.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
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

	    test('The chat is empty.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
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

	    test('The users is empty.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    {id: utils.roomID, pag: null}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(0);
	            done();
	    	});
	    });

	    test('The room is joinable.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/isJoinable',
	    		  form:    {id: utils.roomID, pag: null}
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

	    test('Viewer WebSocket connection done.',function(done) {
	    	utils.addListener('viewer','get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
        	// WebSocket Connect !!
        	utils.connect('viewer');
	    });
	    
	    test('One viewer joins the room.',function(done) {
	    	utils.addListener('owner','new_peer_connected',function(peer){
		    	utils.addListener('owner','peer_list_updated',function(peer){
		    		expect(peer.socketId).toBe(utils.viewer);
		    		done();
		    	});
	    	});
	    	utils.addListener('viewer','get_peers',function(join){
	    		expect(join.you.length).toBeGreaterThan(0);
	    		utils.viewer = join.you;
		    	utils.ws.viewer.send(JSON.stringify({
					'eventName': 'peer_list_updated',
					'data': { 'room': utils.roomID }
		    	}));
	    	});
	    	utils.ws.viewer.send(JSON.stringify({
				'eventName': 'join_room',
				'data': {
					'room': utils.roomID,
					'pwd': '',
					'reload': true
				}
	    	}));
	    });

	    test('Viewer joins the room to get info.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/join',
	    		  form:    {id: utils.roomID, avatar: 'img/hero.png', connectionId: utils.viewer , name: 'Client'}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.status).toBe('OPENED');
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.guests.length).toBe(1);
	            expect(st.guests[0].name).toBe('Client');
	            expect(st.guests[0].status).toBe('CONNECTED');
	            done();
	    	});
	    });
	    
	    test('The users is not empty.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    {id: utils.roomID, pag: null}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(1);
	            expect(st[0].sessionId).toBeUndefined();
	            done();
	    	});
	    });
	    
	    test('Viewer send chat typing alert.', function(done) {
	    	utils.addListener('owner','chat_typing',function(typing){
	    		expect(typing.id).toBe(utils.viewer);
	    		done();
	    	});
	    	utils.ws.viewer.send(JSON.stringify({
				'eventName': 'chat_typing',
				'data': { 'room': utils.roomID }
	    	}));
	    });
	    
	    test('Viewer send chat message.', function(done) {
	    	var testMsg = 'Hello owner this is client!!';
	    	utils.addListener('owner','chat_message',function(msg){
	    		expect(msg.id).toBe(utils.viewer);
	    		expect(msg.text).toBe(testMsg);
	    		done();
	    	});
	    	utils.ws.viewer.send(JSON.stringify({
				'eventName': 'chat_message',
				'data': { 
					'room': utils.roomID,
					'text': testMsg
				}
	    	}));
	    });
	    
	    test('The chat is not empty.', function(done) {
	    	var requestDate = new Date();
	    	requestDate.setTime(requestDate.getTime() - 1000);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/chat',
	    		  form:    {id: utils.roomID, pag: null}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.chat.length).toBe(1);
	            expect(st.page).toBe(0);
	            done();
	    	});
	    });

	});	
	
};
