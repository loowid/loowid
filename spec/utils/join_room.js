'use strict';
module.exports = function(utils,vid) {

	var getRegExp = function() { return /.*\[([a-z]+([0-9]*))\].*/g; };
	
	var conditions = [];
	var joins = [];
	
	var getListener = function(name,id,done) {
		return function(peer){
			conditions.push({name:name,received:peer.socketId,id:id});
			utils.multipleDone(done);
    	};
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
    		conditions.push({name:'owner.npc',received:peer.socketId,id:match[1]});
    		utils.multipleDone(done);
    	});
    	utils.addListener('owner','peer_list_updated',function(peer){
    		conditions.push({name:'owner.plu',received:peer.socketId,id:match[1]});
    		utils.multipleDone(done);
    	});
    	for (var h=0; h<x; h+=1) {
	    	utils.addListener(vid[h],'new_peer_connected',getListener(vid[h]+'.npc',match[1],done));
	    	utils.addListener(vid[h],'peer_list_updated',getListener(vid[h]+'.plu',match[1],done));
    	}
    	utils.addListener(match[1],'get_peers',function(join){
    		expect(join.you.length).toBeGreaterThan(0);
    		utils[match[1]] = join.you;
    		joins.push({id:match[1],value:join.you});
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
	
	var isMemberOfTheRoom = function(id,uid,name) {
		var ismember = utils.owner === id;
		var fid = 'owner';
		for (var x=0; x<vid.length && !ismember; x+=1) {
			if (utils[vid[x]]===id) {
				fid = vid[x];
				ismember = true;
			}
		}
		if (ismember && uid!==fid) {
			console.log('Soy '+name+', me llega el ID de '+fid+' pero esperaba el id de '+uid);
		}
		return ismember;
	};
	
    utils.test('Check all peers.',function(done){
    	// Peer messages will be 2+4+6+8+10...
    	var checked = 0;
    	for (var k=0; k<conditions.length; k+=1) {
    		if (isMemberOfTheRoom(conditions[k].received,conditions[k].id,conditions[k].name)) {
        		checked += 1;
    			expect(conditions[k].received).toBe(utils[conditions[k].id]);
    		}
    	}
    	expect(checked).toBe(vid.length*(vid.length+1));
    	done();
    });
	
};
