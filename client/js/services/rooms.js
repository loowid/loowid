'use strict';
/*global rtc: true */
//Rooms service used for articles REST endpoint
angular.module('mean.rooms').factory('Rooms', ['$resource','$http','$window','Notification', function($resource,$http,$window,Notification) {
    return function (){
    	
		var csrf = window.csrf;
		var room = $resource('/rooms/:roomId/:connectionId/:cmd', 
	    	{roomId:'@id', connectionId: '@cid'},
	    	{
	    		create: {method: 'POST', params:{cmd: 'create'}, headers:{'x-csrf-token':csrf}},
	    		createid: {method: 'POST', params:{cmd: 'createid'}, headers:{'x-csrf-token':csrf}},
	    		join: {method:'POST', params: {cmd:'join'}, headers:{'x-csrf-token':csrf}},
	            users: {method: 'POST', params: {cmd: 'users'}, isArray:true, headers:{'x-csrf-token':csrf}},
	            editOwnerName: {method: 'POST', params: {cmd: 'editName'}, headers:{'x-csrf-token':csrf}},
	            editShared: {method: 'POST', params: {cmd: 'editShared'}, headers:{'x-csrf-token':csrf}},
	            changeRoomStatus: {method: 'POST', params: {cmd: 'changeRoomStatus'}, headers:{'x-csrf-token':csrf}},
	            editGuestName: {method: 'POST', params: {cmd: 'editName'}, headers:{'x-csrf-token':csrf}},
	            isRoomAvailable: {method: 'POST', params: {cmd: 'isActive'}, headers:{'x-csrf-token':csrf}},
	            isRoomJoinable: {method: 'POST', params: {cmd: 'isJoinable'}, headers:{'x-csrf-token':csrf}},
	            askForSharing: {method: 'POST', params: {cmd: 'askForSharing'}, headers:{'x-csrf-token':csrf}},
	            askForStopSharing: {method: 'POST', params: {cmd: 'askForStopSharing'}, headers:{'x-csrf-token':csrf}},
	            moveRoom: {method: 'POST', params: {cmd: 'move'},headers:{'x-csrf-token':csrf}},
                claimforroom: {method: 'POST', params:{cmd: 'claimforroom'},headers:{'x-csrf-token':csrf}},
	            chat: {method: 'POST', params: {cmd: 'chat'}, headers:{'x-csrf-token':csrf}},
	        });
		
    	this.rememberUser = function() {
    		var userName = (typeof(Storage)!=='undefined')?localStorage.loowidUserName:null;
    		var userHero = (typeof(Storage)!=='undefined')?localStorage.loowidUserHero:null;
   			userName = !userName?$window.getSuperHero():userName;
    		userHero = (!userHero || userHero==='undefined' || userHero==='null')?$window.getHeroImg(userName):userHero;
           	return {name:userName,hero:userHero};
    	};
    	
    	this.getHero = function(image,h) {
    		var r = /img\/(hero|heroine)\.jpg/g;
    		var g = r.exec(image);
    		return g?g[1]:h;
    	};
    	
    	this.makeId = function(){
    	    var text = '';
    	    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    	    for( var i=0; i < 7; i+=1 ) {
    	        text += possible.charAt(Math.floor(Math.random() * possible.length));
    	    }
    	    return text;
    	};
    	
    	this.getGravatar = function() {
    		var gravatarEmail = (typeof(Storage)!=='undefined')?localStorage.loowidGravatarEmail:null;
    		if (!gravatarEmail) {
    			gravatarEmail = '';
    		}
    		return gravatarEmail;
    	};

    	this.saveGravatar = function(gravatar) {
     	   if (typeof(Storage)!=='undefined') { localStorage.loowidGravatarEmail = gravatar; }
     	};
    	
    	this.saveName = function(name,hero) {
    	   if (typeof(Storage)!=='undefined') { localStorage.loowidUserName = name; localStorage.loowidUserHero = hero; }
    	};
    	
    	this.resetName = function() {
    		if (typeof(Storage)!=='undefined') { localStorage.loowidUserName = ''; localStorage.loowidUserHero = ''; }
    	};

        this.getInitWebSocketUrl = function () {
        	return (location.origin.indexOf(location.protocol+'//'+window.wsocket.host)<0)?location.protocol+'//'+window.wsocket.host+'/rooms/hello':null;
        };

        this.getWebSocketUrl = function(usrid) {
        	return 'ws'+(location.protocol.indexOf('s:')>0?'s':'')+'://'+window.wsocket.host+window.wsocket.port+(window.usrid?'/'+window.usrid:'');
        };
		
		this.create = function (name,hero,success,ownerToken){
            var gravatar = this.getGravatar();
            var self = this;
			this.saveName(name,hero);
			
			//Go to the ws host and ask for a rest service in order to set the cookie
			var connectFunction = function (){
				
				room.createid({},function(obj){
					var newId = obj.id;
					
					rtc.on('connections',function(){
						room.create ({roomId: newId, name: name,connectionId: rtc._me, avatar: $window.getGravatarImg(gravatar,hero)},function(newRoom){
							success(newRoom.roomId,gravatar,$window.getGravatarImg(gravatar,hero),newRoom.access,newRoom.dueDate);
						}); 
					});
					rtc.connect(self.getWebSocketUrl(), newId);
					
				});
				return 200;	
			};
			
			// Initialize session before connect to web socket
			var initUrl = this.getInitWebSocketUrl();
			if (initUrl){
				var wsproxyinit = $resource (initUrl,{},{
					hello: {method: 'JSONP', params:{callback: 'JSON_CALLBACK'}, isArray: false}
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

        this.claimforroom = function (roomId,success,failure){
        	var connectionId = rtc._me ? rtc._me : 'not valid id';
            room.claimforroom ({id: roomId, cid: connectionId}, function (rdo){
                success(rdo);
            },function(err){
            	failure(err);
            });
        };
        
		this.join = function (roomId,success){
			var u = this.rememberUser();
			var userName = u.name;
			var hero = u.hero;
			var gravatar = this.getGravatar();
            //Connections event is fired just when you perform all the connection process
			if (!rtc._me) {
	            rtc.on('connections',function(conns){
	           		room.join ({id: roomId, name: userName, connectionId: rtc._me, avatar: $window.getGravatarImg(gravatar,hero)},success);
	            });
			} else {
				room.join ({id: roomId, name: userName, connectionId: rtc._me, avatar: $window.getGravatarImg(gravatar,hero)},success);
			}
			return {name:userName,avatar:$window.getGravatarImg(gravatar,hero),gravatar:gravatar,hero:hero};
		};

		this.joinPass = function(roomId,passwdVal,reload) {
            var self = this;
            var connectFunction = function (){
				rtc.connect(self.getWebSocketUrl(), roomId, passwdVal, reload);
			};
			
			// Initialize session before connect to web socket
			var initUrl = this.getInitWebSocketUrl();
			if (initUrl){
				var wsproxyinit = $resource (initUrl,{},{
					hello: {method: 'JSONP', params:{callback: 'JSON_CALLBACK'}, isArray: false}
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
		
        this.users = function (roomId,success){
            if (roomId){ 
                room.users ({id: roomId},success);
            }
        };

        this.chat = function (roomId,success){
           this.chatPage(roomId,null,success);
        };

        this.chatPage = function (roomId,page,success){
            if (roomId){ 
                room.chat ({id: roomId,pag:page},success);
            }
        };

        this.editOwnerName = function (roomId, name, gravatar, hero, success) {
        	this.saveName(name,hero);
        	this.saveGravatar(gravatar);
        	room.editOwnerName({id:roomId, name:name, avatar: $window.getGravatarImg(gravatar,hero)},success);
        };

        this.editShared = function (roomId, acc, success) {
        	room.editShared({id:roomId, access:acc},success);
        };

        this.changeRoomStatus = function (roomId,status,success){
            room.changeRoomStatus({id:roomId, status:status},success);   
        };

        this.editGuestName = function (roomId, name, gravatar, hero, success) {
        	this.saveName(name,hero);
        	this.saveGravatar(gravatar);
        	room.editGuestName({id:roomId, cid: rtc._me, name:name, avatar: $window.getGravatarImg(gravatar,hero)},success);
        };

        this.getConnectionId = function() {
        	return rtc._me;
        };
        
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

        this.notifyIn = function($scope) {
   		    Notification.requestPermission(function (){
				var notification = new Notification($scope.resourceBundle.welcometo, {
						body: $scope.resourceBundle._('connectedto',$scope.global.roomId),
						icon: 'img/icons/favicon.ico',
						delay: 3000
				});
				notification.$on('error',function(){
					$scope.ui.modals.push({'text': $scope.resourceBundle.allownotifications,
						'yes': function (index){
							$scope.ui.modals.splice(index,1);
						},
						'class':'modalform editable',
						'done':false
					});	
				});
				notification.$on('click', function () {
					if (!$scope.ui.focused) { window.focus(); }
				});
				notification.$on('show', function () {
					$scope.ui.notificationReady = true;
				});
			});
        };
        
     };

}]);
