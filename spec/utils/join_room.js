'use strict';
module.exports = function(utils,vid) {

	var getRegExp = function() { return /.*\[([a-z]+([0-9]*))\].*/g; };
	
	var getListener = function(nid,done) {
		return function(peer){
			checkExpected(peer.socketId,nid,done);
    	};
	};
	
	var checkExpected = function(id,nid,done) {
		if (utils[nid]) {
			if (utils[nid]===id) {
				utils.multipleDone(done);
			}
		} else {
			// Wait until ws id is ready
			setTimeout(function(){
				checkExpected(id,nid,done);
			},60);
		}
	};
	
	var nob = function(done) {
		var match = getRegExp().exec(jasmine.getEnv().currentSpec.description);
		utils.getBrowser(match[1],function(browser){
			done();
		});
	};
	
	var nws = function(done) {
		var match = getRegExp().exec(jasmine.getEnv().currentSpec.description);
    	// WebSocket Connect !!
    	utils.connect(match[1],utils.browsers[match[1]].usrid);
    	utils.addListener(match[1],'get_updated_config',function(ice){
    		expect(ice.iceServers.length).toBeGreaterThan(0);
    		done();
    	});
    };
    
    var njr = function(done) {
    	var match = getRegExp().exec(jasmine.getEnv().currentSpec.description);
    	var x = Number(match[2]-0);
    	utils.checkDone = (2*x)+3;
    	utils.addListener('owner','new_peer_connected',function(peer){
    		checkExpected(peer.socketId,match[1],done);
    	});
    	utils.addListener('owner','peer_list_updated',function(peer){
    		checkExpected(peer.socketId,match[1],done);
    	});
    	for (var h=0; h<x; h+=1) {
	    	utils.addListener(vid[h],'new_peer_connected',getListener(match[1],done));
	    	utils.addListener(vid[h],'peer_list_updated',getListener(match[1],done));
    	}
    	utils.addListener(match[1],'get_peers',function(join){
    		expect(join.you.length).toBeGreaterThan(0);
    		utils[match[1]] = join.you;
	    	utils.ws[match[1]].send(JSON.stringify({
				'eventName': 'peer_list_updated',
				'data': { 'room': utils.roomID }
	    	}));
	    	utils.multipleDone(done);
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
    	utils.browsers[match[1]].request.post({
  		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers[match[1]].csrf},
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
		utils.test('New ['+vid[x]+'] open the browser.',nob);
	    utils.test('New ['+vid[x]+'] websocket connection done.',nws);
	    utils.test('New ['+vid[x]+'] peer connected the room.',njr);
	    utils.test('New ['+vid[x]+'] joins the room to get info.', njri);
	}
	
};
