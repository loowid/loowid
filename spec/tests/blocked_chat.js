'use strict';
module.exports = function(request,test,utils) {

	describe('Blocked chat', function() {
		
		require('../utils/create_room')(request,test,utils);
		
		require('../utils/join_room')(request,test,utils,['viewer0']);
	    
	    test('Owner block the chat.', function(done) {
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/editShared',
	    		  form:    { id: utils.roomID, access: { shared: 'LINK', chat: true, passwd: 'pwd', moderated: false, locked: true, permanent: false, permanentkey: 'pkey', keywords: [] } }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.guests.length).toBe(1);
	            expect(st.access.locked).toBe(true);
	            expect(st.guests[0].sessionid).toBe('');
	            expect(st.guests[0].connectionId).toBe(utils.viewer0);
	            expect(st.guests[0].status).toBe('CONNECTED');
	            done();
	    	});
	    });

	    test('Owner update the room.', function(done) {
	    	utils.addListener('viewer0','owner_data_updated',function(own){
	    		expect(own.ownerCid).toBe(utils.owner);
	    		expect(own.ownerName).toBe('Owner');
	    		expect(own.status).toBe('OPENED');
	    		expect(own.access.chat).toBe(true);
	    		done();
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'update_owner_data',
				'data': {
					'room': utils.roomID,
					'ownerName': 'Owner',
					'ownerAvatar': 'img/heroe.png',
					'status': 'OPENED',
					'access': {
						'chat':true
					}
				}
	    	}));
	    });

	    test('Viewer send chat typing alert.', function(done) {
	    	utils.addListener('viewer0','chat_message',function(typing){
	    		expect(typing.id).toBe('||@@||');
	    		done();
	    	});
	    	utils.ws.viewer0.send(JSON.stringify({
				'eventName': 'chat_typing',
				'data': { 'room': utils.roomID }
	    	}));
	    });
	    
	    test('Viewer send chat message.', function(done) {
	    	var testMsg = 'Hello owner this is client!!';
	    	utils.addListener('viewer0','chat_message',function(msg){
	    		expect(msg.id).toBe('||@@||');
	    		done();
	    	});
	    	utils.ws.viewer0.send(JSON.stringify({
				'eventName': 'chat_message',
				'data': { 
					'room': utils.roomID,
					'text': testMsg
				}
	    	}));
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

	    
	});	
	
};
