'use strict';
module.exports = function(utils) {

	describe('Blocked chat', function() {
		
		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0']);
	    
		utils.test('Owner blocks the chat.', function(done) {
	    	var acc = utils.room.access;
	    	acc.chat = true;
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/editShared',
	    		  form:    { id: utils.roomID, access: acc }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.guests.length).toBe(1);
	            expect(st.access.chat).toBe(true);
	            expect(st.guests[0].sessionid).toBe('');
	            expect(st.guests[0].connectionId).toBe(utils.viewer0);
	            expect(st.guests[0].status).toBe('CONNECTED');
	            done();
	    	});
	    });

		utils.test('Owner update the room.', function(done) {
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

		utils.test('Viewer cannot send chat typing alert.', function(done) {
	    	utils.addListener('viewer0','chat_message',function(typing){
	    		expect(typing.id).toBe('||@@||');
	    		expect(typing.text).toBe('The chat is closed.');
	    		done();
	    	});
	    	utils.ws.viewer0.send(JSON.stringify({
				'eventName': 'chat_typing',
				'data': { 'room': utils.roomID }
	    	}));
	    });
	    
		utils.test('Viewer cannot send chat message.', function(done) {
	    	var testMsg = 'Hello owner this is client!!';
	    	utils.addListener('viewer0','chat_message',function(msg){
	    		expect(msg.id).toBe('||@@||');
	    		expect(msg.text).toBe('The chat is closed.');
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
	    
		utils.test('The chat is empty.', function(done) {
	    	utils.browsers.viewer0.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.viewer0.csrf},
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
