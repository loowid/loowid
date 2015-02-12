'use strict';
module.exports = function(request,test,utils,vid) {

	var getRegExp = function() { return /.*\[([a-z]+([0-9]*))\].*/g; };
	
	var getListener = function(id,id2,done) {
		return function(peer){
	    	utils.addListener(id,'peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils[id2]);
	    		utils.multipleDone(done);
	    	});
    	};
	};
	
	var nws = function(done) {
		var match = getRegExp().exec(jasmine.getEnv().currentSpec.description);
    	utils.addListener(match[1],'get_updated_config',function(ice){
    		expect(ice.iceServers.length).toBeGreaterThan(0);
    		done();
    	});
    	// WebSocket Connect !!
    	utils.connect(match[1]);
    };
	
    var njr = function(done) {
    	var match = getRegExp().exec(jasmine.getEnv().currentSpec.description);
    	var x = (match[2]-0);
    	utils.checkDone = x+1;
    	utils.addListener('owner','new_peer_connected',function(peer){
	    	utils.addListener('owner','peer_list_updated',function(peer){
	    		expect(peer.socketId).toBe(utils[match[1]]);
	    		utils.multipleDone(done);
	    	});
    	});
    	for (var h=0; h<x; h+=1) {
	    	utils.addListener(vid[h],'new_peer_connected',getListener(vid[h],match[1],done));
    	}
    	utils.addListener(match[1],'get_peers',function(join){
    		expect(join.you.length).toBeGreaterThan(0);
    		utils[match[1]] = join.you;
	    	utils.ws[match[1]].send(JSON.stringify({
				'eventName': 'peer_list_updated',
				'data': { 'room': utils.roomID }
	    	}));
    	});
    	utils.ws[match[1]].send(JSON.stringify({
			'eventName': 'join_room',
			'data': {
				'room': utils.roomID,
				'pwd': utils.room.access.passwd,
				'reload': true
			}
    	}));
    };
    
    var njri = function(done) {
    	var match = getRegExp().exec(jasmine.getEnv().currentSpec.description);
    	var requestDate = new Date();
    	requestDate.setTime(requestDate.getTime() - 1000);
    	request.post({
    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.csrf},
    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/join',
    		  form:    {id: utils.roomID, avatar: 'img/hero.png', connectionId: utils[match[1]] , name: match[1]}
    	}, function(error, response, body){
            expect(error).toBeNull();
            expect(response.statusCode).toBe(200);
            var st = JSON.parse(body);
            expect(st.status).toBe('OPENED');
            expect(st.roomId).toBe(utils.roomID);
            expect(st.guests.length).toBe(Number(match[2])+1);
            for (var t=0; t<=Number(match[2]); t+=1) {
	            expect(st.guests[t].name).toBe('viewer'+t);
	            expect(st.guests[t].sessionid).toBe('');
	            expect(st.guests[t].status).toBe('CONNECTED');
	            expect(st.guests[t].connectionId).toBe(utils['viewer'+t]);
            }
            done();
    	});
    };
    
	for (var x=0; x<vid.length; x+=1) {
	    test('New ['+vid[x]+'] websocket connection done.',nws);
	    test('New ['+vid[x]+'] peer connected the room.',njr);
	    test('New ['+vid[x]+'] joins the room to get info.', njri);
	}
	
};
