'use strict';
module.exports = function(utils) {

	describe('Three room', function() {
		
		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
	    
	    utils.test('The room has two guests.', function(done) {
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/users',
	    		  form:    { id: utils.roomID }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.length).toBe(2);
	            expect(st[0].sessionid).toBe('');
	            expect(st[0].connectionId).toBe(utils.viewer0);
	            expect(st[0].status).toBe('CONNECTED');
	            expect(st[1].sessionid).toBe('');
	            expect(st[1].connectionId).toBe(utils.viewer1);
	            expect(st[1].status).toBe('CONNECTED');
	            done();
	    	});
	    });

	    utils.test('Another Viewer send chat typing alert.', function(done) {
	    	utils.checkDone = 2;
	    	utils.addListener('owner','chat_typing',function(typing){
	    		expect(typing.id).toBe(utils.viewer1);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer0','chat_typing',function(typing){
	    		expect(typing.id).toBe(utils.viewer1);
	    		utils.multipleDone(done);
	    	});
	    	utils.ws.viewer1.send(JSON.stringify({
				'eventName': 'chat_typing',
				'data': { 'room': utils.roomID }
	    	}));
	    });
	    
	    utils.test('Another Viewer send chat message.', function(done) {
	    	var testMsg = 'Hello owner this is client1!!';
	    	utils.checkDone = 2;
	    	utils.addListener('owner','chat_message',function(msg){
	    		expect(msg.id).toBe(utils.viewer1);
	    		expect(msg.text).toBe(testMsg);
	    		utils.multipleDone(done);
	    	});
	    	utils.addListener('viewer0','chat_message',function(msg){
	    		expect(msg.id).toBe(utils.viewer1);
	    		expect(msg.text).toBe(testMsg);
	    		utils.multipleDone(done);
	    	});
	    	utils.ws.viewer1.send(JSON.stringify({
				'eventName': 'chat_message',
				'data': { 
					'room': utils.roomID,
					'text': testMsg
				}
	    	}));
	    });
	    
	});	
	
};
