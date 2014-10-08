//Rooms service used for articles REST endpoint
angular.module('mean.rooms').factory("Rooms", ['$resource','$http','$window', function($resource,$http,$window) {
    return function (){
    	
		var csrf = window.csrf;
		var room = $resource('/rooms/:roomId/:connectionId/:cmd', 
	    	{roomId:'@id', connectionId: '@cid'},
	    	{
	    		create: {method: "POST", params:{cmd: 'create'}, headers:{'x-csrf-token':csrf}},
	    		createid: {method: "POST", params:{cmd: 'createid'}, headers:{'x-csrf-token':csrf}},
	    		join: {method:"POST", params: {cmd:'join'}, headers:{'x-csrf-token':csrf}},
	            users: {method: "POST", params: {cmd: 'users'}, isArray:true, headers:{'x-csrf-token':csrf}},
	            editOwnerName: {method: "POST", params: {cmd: 'editName'}, headers:{'x-csrf-token':csrf}},
	            editShared: {method: "POST", params: {cmd: 'editShared'}, headers:{'x-csrf-token':csrf}},
	            changeRoomStatus: {method: "POST", params: {cmd: 'changeRoomStatus'}, headers:{'x-csrf-token':csrf}},
	            editGuestName: {method: "POST", params: {cmd: 'editName'}, headers:{'x-csrf-token':csrf}},
	            isRoomAvailable: {method: "POST", params: {cmd: 'isActive'}, headers:{'x-csrf-token':csrf}},
	            isRoomJoinable: {method: "POST", params: {cmd: 'isJoinable'}, headers:{'x-csrf-token':csrf}},
	            askForSharing: {method: "POST", params: {cmd: 'askForSharing'}, headers:{'x-csrf-token':csrf}},
	            askForStopSharing: {method: "POST", params: {cmd: 'askForStopSharing'}, headers:{'x-csrf-token':csrf}},
	            moveRoom: {method: "POST", params: {cmd: 'move'},headers:{'x-csrf-token':csrf}},
	            keepSession: {method: "POST", params: {cmd: 'keep'},headers:{'x-csrf-token':csrf}},
                claimforroom: {method: "POST", params:{cmd: 'claimforroom'},headers:{'x-csrf-token':csrf}},
				
	        });
		
    	this.rememberUser = function() {
    		var userName = (typeof(Storage)!=="undefined")?localStorage.loowidUserName:null;
    		if (!userName) {
    			userName = $window.getSuperHero();
    		}
           	return userName;
    	}
    	
    	this.makeId = function(){
    	    var text = "";
    	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    	    for( var i=0; i < 7; i++ )
    	        text += possible.charAt(Math.floor(Math.random() * possible.length));
    	    return text;
    	}
    	
    	this.getGravatar = function() {
    		var gravatarEmail = (typeof(Storage)!=="undefined")?localStorage.loowidGravatarEmail:null;
    		if (!gravatarEmail) {
    			gravatarEmail = '';
    		}
    		return gravatarEmail;
    	}

    	this.saveGravatar = function(gravatar) {
     	   if (typeof(Storage)!=="undefined") localStorage.loowidGravatarEmail = gravatar;
     	}
    	
    	this.saveName = function(name) {
    	   if (typeof(Storage)!=="undefined") localStorage.loowidUserName = name;
    	}
    	
    	this.resetName = function() {
    		if (typeof(Storage)!=="undefined") localStorage.loowidUserName = '';
    	}

        this.getWebSocketUrl = function() {
            return location.origin.replace(/^http/, 'ws')
        		.replace(/\.rhcloud\.com/,'.rhcloud.com:8'+(location.origin.indexOf('https')>=0?'443':'000'))
        		.replace(/www\.loowid\.com/,'loowid-oscloud.rhcloud.com:8'+(location.origin.indexOf('https')>=0?'443':'000'));
        }
		
		this.create = function (name,success,ownerToken){
            var gravatar = this.getGravatar();
            var host = this.getWebSocketUrl();
			this.saveName(name);
			
			//Go to the ws host and ask for a rest service in order to set the cookie
			var connectFunction = function (){
				
				room.createid({},function(obj){
					var newId = obj.id;
					
					rtc.on('connections',function(){
						room.create ({roomId: newId, name: name,connectionId: rtc._me, avatar: $window.getGravatarImg(gravatar)},function(newRoom){
							success(newRoom.roomId,gravatar,$window.getGravatarImg(gravatar),newRoom.access);
						}); 
					});
					rtc.connect(host, newId);
					
				});
				return 200;	
			};
			
			
			
			if (location.origin.indexOf ('www\.loowid\.com') > -1){
			
				var wsproxyinit = $resource ('https\\://loowid-oscloud.rhcloud.com:443/rooms/hello',{},{
					hello: {method: "JSONP", params:{callback: 'JSON_CALLBACK'}, isArray: false}
				});
				
				wsproxyinit.hello ({},function (){
					connectFunction();	
				},function (erro){
					return 504;
				});
			}else{
				connectFunction ();
			}
		};

        this.claimforroom = function (roomId,success){
            room.claimforroom ({id: roomId}, function (rdo){
                success(rdo);
            });
        }
        
		this.join = function (roomId,success){
			var userName = this.rememberUser();
			var gravatar = this.getGravatar();
            //Connections event is fired just when you perform all the connection process
            rtc.on('connections',function(conns){
           		room.join ({id: roomId, name: userName, connectionId: rtc._me, avatar: $window.getGravatarImg(gravatar)},success);
            });
			return {name:userName,avatar:$window.getGravatarImg(gravatar),gravatar:gravatar};
		};

		this.joinPass = function(roomId,passwdVal,reload) {
            var host = this.getWebSocketUrl();
            var connectFunction = function (){
				rtc.connect(host, roomId, passwdVal, reload);
			};
			
			if (location.origin.indexOf ('www\.loowid\.com') > -1){
			
				var wsproxyinit = $resource ('https\\://loowid-oscloud.rhcloud.com:443/rooms/hello',{},{
					hello: {method: "JSONP", params:{callback: 'JSON_CALLBACK'}, isArray: false}
				});
				
				wsproxyinit.hello ({},function (){
					connectFunction();	
				},function (erro){
					return 504;
				});
			}else{
				connectFunction ();
			}	
				
		}
		
        this.users = function (roomId,success){
            if (roomId){ 
                room.users ({id: roomId},success);
            }
        };

        this.editOwnerName = function (roomId, name, gravatar, success) {
        	this.saveName(name);
        	this.saveGravatar(gravatar);
        	room.editOwnerName({id:roomId, name:name, avatar: $window.getGravatarImg(gravatar)},success);
        };

        this.editShared = function (roomId, acc, success) {
        	room.editShared({id:roomId, access:acc},success);
        };

        this.changeRoomStatus = function (roomId,status,success){
            room.changeRoomStatus({id:roomId, status:status},success);   
        };

        this.editGuestName = function (roomId, name, gravatar, success) {
        	this.saveName(name);
        	this.saveGravatar(gravatar);
        	room.editGuestName({id:roomId, cid: rtc._me, name:name, avatar: $window.getGravatarImg(gravatar)},success);
        };

        this.getConnectionId = function() {
        	return rtc._me;
        }
        
        this.isRoomAvailable = function (roomId,success,failure){
            var connectionId = rtc._me ? rtc._me : 'not valid id';
            room.isRoomAvailable ({id: roomId, cid: connectionId},success,failure);
        };

        this.isRoomJoinable = function (roomId,success,failure){
            room.isRoomJoinable ({id: roomId},success,failure);
        };

        this.askForSharing = function (roomId,connectionId,share,success,failure){
            room.askForSharing({id: roomId, cid: connectionId, source: share},success,failure);
        };

        this.askForStopSharing = function (roomId,connectionId,share,success,failure){
        	room.askForStopSharing({id: roomId, cid: connectionId, source: share},success,failure);
        };

        this.moveRoom = function (roomId,userids,success,failure){
        	room.moveRoom({id: roomId, list: userids},success,failure);
        };

        this.keepSession = function (success,failure) {
        	room.keepSession(success,failure);
        }
     };

}]);
