angular.module('mean.rooms').factory("ChatService",['$timeout','UIHandler',function($timeout,UIHandler){
	return function (){

		var uiHandler = UIHandler;
		this.welcomePublished = false;
		var self= this;

	    this.timeAgo = function($scope,t) {
	        var t2 = (new Date()).getTime();
	        var t1 = t.getTime();
	        var secs =  parseInt((t2-t1)/(1000));
	        var mins = parseInt((t2-t1)/(1000*60));
	        return $scope.resourceBundle.timeprep + (secs>59 ? (mins + $scope.resourceBundle.minago) : (secs + $scope.resourceBundle.secago));
	    }
	    
	    this.longTimeAgo = function(newTime,lastTime) {
	        var t2 = newTime.getTime();
	        var t1 = lastTime.getTime();
	        var secs =  parseInt((t2-t1)/(1000));
	        return secs>15;
	    }
	    
	    this.getHtml = function($scope,data) {
	        if (data.id==$scope.global.bot) {
	            return data.text.replace(/(https?:\/\/[^\s]+)/g, function(url) { return '<a href="' + url + '" target="_blank">' + url + '</a>'; });
	        }
	        return data.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/(https?:\/\/[^\s]+)/g, function(url) { return '<a href="' + url + '" target="_blank">' + url + '</a>'; });
	    }
	    
	    this.addNewMessage = function($scope,data) {
	        var msgTime = new Date(data.time);
	        var messageIndex = uiHandler.messages.length-1
	        if (uiHandler.messages.length==0 || uiHandler.messages[messageIndex].id != data.id || this.longTimeAgo(msgTime,uiHandler.messages[messageIndex].time)) {
	        	uiHandler.messages.push(
	                    {'class':data.id == $scope.global.own?'self':'other',
	                        'id': data.id,
	                        'time': msgTime,
	                        'list':[this.getHtml($scope,data)]});
	        } else {
	        	uiHandler.messages[messageIndex].list.push(this.getHtml($scope,data));
	        }
	    }

	    this.alertChatStatus = function ($scope,accessChat){
			this.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle['chat'+(accessChat)],time:new Date()});
	    }
	    this.alertNotConnected = function ($scope){
	    	this.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle.notconnected,time:new Date()});
	    }
    
	    this.init = function($scope,chatmessages){
			
	    	uiHandler.messages = [];
	    	uiHandler.audible = true;

	    	$scope.enableAudio = function() {
	    		uiHandler.audible = !uiHandler.audible;
    		}

		    //Control de chat
		    $scope.sendMessage = function() {
			 	if (!uiHandler.isowner && uiHandler.passNeeded) {
			   		chatService.alertNotConected ($scope);
			        return;
			    }

		        rtc.sendChatMessage($scope.global.roomId,uiHandler.messageText);
		        uiHandler.messageText = "";
		    }

			rtc.uniqueon('chat_message',function(data){
	       		if ((uiHandler.helpchat_class=='showed' || !uiHandler.focused) && uiHandler.audible && data.id!=rtc._me) {
	        		var readText = ($scope.connectedUsers()>1)?$scope.getUser(data.id).name+', '+data.text:data.text;
	        		var audio = document.getElementById('audiotts')?document.getElementById('audiotts'):document.createElement('audio');
	        		audio.setAttribute('id', 'audiotts');
	        		audio.setAttribute('src', '/chat/talk?text=' + encodeURIComponent(readText));
	        		audio.load();
	        		audio.play();
	       		}
	        	self.addNewMessage($scope,data);
	        	$scope.$apply();
	    	});

			if (chatmessages && uiHandler.messages.length==0) {
			    for (var j=0; j< chatmessages.length; j++) {
					this.addNewMessage($scope,chatmessages[j]);
				}
			}

	    	$scope.timeAgo = function (t){
	    		return self.timeAgo($scope,t);
			};

			if (!self.welcomePublished){
				//Publish the messages
			    $timeout(function(){
			        self.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle.welcomechatmess,time:new Date()});
			        self.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle.helpuschatmess,time:new Date()});
			        self.welcomePublished =true;
			    },5000);
			}
		};
	};
}]);