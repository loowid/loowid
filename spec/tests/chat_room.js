'use strict';
module.exports = function(request,test,utils) {

	describe('Chat room', function() {
		
		require('../utils/create_room')(request,test,utils);
		
		require('../utils/join_room')(request,test,utils,['viewer0']);
	    
	    test('Viewer send chat typing alert.', function(done) {
	    	utils.addListener('owner','chat_typing',function(typing){
	    		expect(typing.id).toBe(utils.viewer0);
	    		done();
	    	});
	    	utils.ws.viewer0.send(JSON.stringify({
				'eventName': 'chat_typing',
				'data': { 'room': utils.roomID }
	    	}));
	    });
	    
	    test('Viewer send chat message.', function(done) {
	    	var testMsg = 'Hello owner this is client!!';
	    	utils.addListener('owner','chat_message',function(msg){
	    		expect(msg.id).toBe(utils.viewer0);
	    		expect(msg.text).toBe(testMsg);
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

	    var messageCount = 128;
	    var pageSize = 50;
	    test('Viewer send '+messageCount+' chat messages.', function(done) {
	    	var testMsg = 'Message number ';
	    	utils.checkDone = messageCount;
	    	utils.addListener('owner','chat_message',function(msg){
	    		expect(msg.id).toBe(utils.viewer0);
	    		expect(msg.text.indexOf(testMsg)).toBe(0);
	    		utils.multipleDone(done);
	    	});
	    	for (var k=0; k<messageCount; k+=1) {
		    	utils.ws.viewer0.send(JSON.stringify({
					'eventName': 'chat_message',
					'data': { 
						'room': utils.roomID,
						'text': testMsg+k
					}
		    	}));
	    	}
	    });
	    
	    var getRegExp = function() { return /.*\[([a-z]+([0-9]*))\].*/g; };
	    var chpag = function(done) {
	    	var match = getRegExp().exec(jasmine.getEnv().currentSpec.description);
	    	var page = match?Number(match[1]):0;
	    	var nextPage = Math.max(messageCount-(pageSize*(page+1))+1,0);
	    	var currentSize = Math.min(pageSize,messageCount-(pageSize*page)+1);
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/chat',
	    		  form:    {id: utils.roomID, pag: match?page:null }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.chat.length).toBe(currentSize);
	            expect(st.page).toBe(nextPage);
	            done();
	    	});
	    };

	    test('Get initial chat page.',chpag);
	    for (var n=1; n<(messageCount+1)/50; n+=1) {
	    	test('Get ['+n+'] chat page.',chpag);
	    }
	    
	});	
	
};
