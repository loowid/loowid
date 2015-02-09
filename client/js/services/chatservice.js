'use strict';
/*global rtc: true */
angular.module('mean.rooms').factory('ChatService',['$timeout','UIHandler','Rooms','Notification',function($timeout,UIHandler,Rooms,Notification){
	return function (){

		var uiHandler = UIHandler;
		this.welcomePublished = false;
		var self= this;
		var room = new Rooms({});

		this.formatDate = function($scope,t,fm) {
		   var yyyy = t.getFullYear().toString();
		   var mm = (t.getMonth()+1).toString();
		   var dd  = t.getDate().toString();
		   var mi = t.getMinutes().toString();
		   var hh = t.getHours().toString();
		   var dm = $scope.resourceBundle.dateformat
		   			.replace('yyyy',yyyy)
		   			.replace('mm',(mm[1]?mm:'0'+mm[0]))
		   			.replace('dd',(dd[1]?dd:'0'+dd[0]));
		   var tm = $scope.resourceBundle.timeformat
		   			.replace('hh',(hh[1]?hh:'0'+hh[0]))
		   			.replace('mi',(mi[1]?mi:'0'+mi[0]));
		   return fm?dm+' '+tm:tm;
		};
		
	    this.timeAgo = function($scope,t) {
	        var t2 = (new Date()).getTime();
	        var t1 = t.getTime();
	        var secs =  parseInt((t2-t1)/(1000));
	        var mins = parseInt((t2-t1)/(1000*60));
	        if (secs>59) {
        		return (mins>59)?this.formatDate($scope,t,(mins>60*24)):$scope.resourceBundle._('timeprep',mins);
	        } else {
        		return (secs>30)?$scope.resourceBundle.lessthanaminute:$scope.resourceBundle.justnow;
	        }
	    };
	    
	    this.longTimeAgo = function(newTime,lastTime) {
	        var t2 = newTime.getTime();
	        var t1 = lastTime.getTime();
	        var secs =  parseInt((t2-t1)/(1000));
	        return secs>15;
	    };
	    
	    
	    
	    this.link = function(url) {
	    	return '<a href="' + url + '" target="_blank">' + url + '</a>';
	    };
	    
	    this.parseUrls = function($scope,txt) {
	    	
			var youtube = function(url,vid) {
	    		var frame = '<a href id="max_'+ vid +'"><img src="//img.youtube.com/vi/' + vid + '/0.jpg" width="100%" height="100%" frameborder="0" allowfullscreen></img></a><p class="videoLabel">'+$scope.resourceBundle.youtubeVideo+'</p>';
	    
				var openyoutube = function (event){
					$scope.openVideoFromYoutube(vid);
					event.preventDefault();
				};

				setTimeout (function (){
					var element = document.getElementById ('max_' + vid);
					element.addEventListener ('click',openyoutube);
				},300);

				return frame;

			};
			
			
			return txt.replace(/https?:\/\/www\.youtube\.com\/watch\?v=([^\s]+)/g, youtube)
					  .replace(/https?:\/\/m\.youtube\.com\/watch\?v=([^\s]+)/g, youtube)
	    			  .replace(/https?:\/\/youtu\.be\/([^\s]+)/g, youtube)
	    			  .replace(/(https?:\/\/[^\s]+)/g, this.link);
	    };
	    
		
		
	    this.getHtml = function($scope,data) {
	        if (data.id===$scope.global.bot) {
	            return this.parseUrls($scope,data.text);
	        }
	        return this.parseUrls($scope,data.text.replace(/&/g,'&amp;').replace(/</g,'&lt;'));
	    };
	    
	    this.addToQueue = function(data) {
	    	if (!uiHandler.messageQueue) {
	    		uiHandler.messageQueue = [];
	    	}
	    	uiHandler.messageQueue.push(data);
	    };
	    
	    this.processQueue = function() {
	    	if (uiHandler.messageQueue) {
	    		for (var j=0; j<uiHandler.messageQueue.length; j+=1) {
	    			rtc.fire('chat_message',uiHandler.messageQueue[j]);
	    		}
	    		uiHandler.messageQueue = [];
	    	}
	    };
	    
	    this.addNewMessage = function($scope,data) {
	        var msgTime = new Date(data.time);
	        var messageIndex = uiHandler.messages.length-1;
	        if (uiHandler.messages.length===0 || uiHandler.messages[messageIndex].id !== data.id || this.longTimeAgo(msgTime,uiHandler.messages[messageIndex].time)) {
	        	var m = {'class':data.id === $scope.global.own?'self':'other',
                        'id': data.id,
                        'time': msgTime,
                        'istyping': !data.text,
                        'list':[]};
	        	if (data.text) {
	        		this.checkTypingIcons(data.id);
	        		m.list.push(this.getHtml($scope,data)); 
	        	}
	        	uiHandler.messages.push(m);
	        } else {
	        	if (!data.text) {
	        		uiHandler.messages[messageIndex].istyping = true;	
	        	} else {
	        		uiHandler.messages[messageIndex].istyping = false;
	        		uiHandler.messages[messageIndex].list.push(this.getHtml($scope,data));
	        	}
	        }
	    };

	    this.checkTypingIcons = function(id) {
	    	var nowTime = new Date();
	    	for (var i=0; i<uiHandler.messages.length; i+=1) {
	    		if (uiHandler.messages[i] === id || this.longTimeAgo(nowTime,uiHandler.messages[i].time)) {
	    			uiHandler.messages[i].istyping = false;
	    			if (uiHandler.messages[i].list.length===0) {
	    				uiHandler.messages.splice(i,1);
	    			}
	    		}
	    	}
	    	if (!id) {
	    		$timeout(function(){ self.checkTypingIcons(); },2000);
	    	}
	    };
	    
	    this.alertChatStatus = function ($scope,accessChat){
			this.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle['chat'+(accessChat)],time:new Date()});
	    };
	    
	    this.alertNotConnected = function ($scope){
	    	this.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle.notconnected,time:new Date()});
	    };
    
	    this.init = function($scope,chatmessages){
			
	    	var chSrv = this;
	    	
	    	uiHandler.messages = [];
	    	uiHandler.audible = true;

	    	$scope.enableAudio = function() {
	    		uiHandler.audible = !uiHandler.audible;
    		};
	    	
	        $scope.toggleChat = function() { 
	        	uiHandler.chatClass=(uiHandler.chatClass==='collapsed')?'':'collapsed';
	        	uiHandler.dashChat=(uiHandler.chatClass==='collapsed')?'chat_collapsed':'';
	        };

	    	$scope.sendTyping = function() {
			 	if (!uiHandler.isowner && uiHandler.passNeeded) {
			 		chSrv.alertNotConected ($scope);
			        return;
			    }
			 	if (uiHandler.messageText) {
			 		var now = new Date();
				 	if (!self.lastTyping || self.longTimeAgo(now,self.lastTyping)) {
				 		self.lastTyping = now;
				 		rtc.sendChatTyping($scope.global.roomId);
				 	}
			 	}
	    	};
	    	
		    //Control de chat
		    $scope.sendMessage = function() {
			 	if (!uiHandler.isowner && uiHandler.passNeeded) {
			 		chSrv.alertNotConected ($scope);
			        return;
			    }
			 	if (uiHandler.messageText) {
			 		rtc.sendChatMessage($scope.global.roomId,uiHandler.messageText);
			 		uiHandler.messageText = '';
			 	}
		    };
		    
		    angular.element(document.querySelector('#chat_discussion')).on('scroll', function(evt) {
		    	if (!evt.target.scrollTop && uiHandler.chatPage>0 && !uiHandler.chatLoading) {
		    		uiHandler.chatLoading = true;
		    		setTimeout(function() {
				    	room.chatPage($scope.global.roomId,uiHandler.chatPage,function(rdo){
				    		var previousMessages = uiHandler.messages;
				    		uiHandler.chatPage = rdo.page;
				    		uiHandler.messages = []; 
				    		for (var i=0; i<rdo.chat.length; i+=1) {
				    			self.addNewMessage($scope,rdo.chat[i]);
				    		}
				    		for (var j=0; j<previousMessages.length; j+=1) {
				    			uiHandler.messages.push(previousMessages[j]);
				    		}
				    		uiHandler.chatLoading = false;
				    		self.processQueue();
				    	});
		    		},1500); // Is too fast to see that something is happening !!
		    	}
		    });

		    var sendHtml5Notification = function(data) {
       		    var notification = new Notification($scope.getUser(data.id).name, {
   		            body: data.text.length>50?data.text.substring(0,50)+'...':data.text,
   		            icon: $scope.getUser(data.id).avatar,
   		            delay: 3000
	   		    });
	   	        notification.$on('click', function () {
	   	        	if (!uiHandler.focused) { window.focus(); }
	   	        	if (uiHandler.chatClass!=='') { $scope.toggleChat(); }
	   	        });
		    };
		    
		    var sendAudioNotification = function(data) {
        		var readText = ($scope.connectedUsers()>1)?$scope.getUser(data.id).name+', '+data.text:data.text;
        		var audio = document.getElementById('audiotts')?document.getElementById('audiotts'):document.createElement('audio');
        		audio.setAttribute('id', 'audiotts');
        		audio.setAttribute('src', '/chat/talk?text=' + encodeURIComponent(readText));
        		audio.load();
        		audio.play();
		    };
		    
			rtc.uniqueon('chat_message',function(data){
				if (uiHandler.chatLoading) {
					self.addToQueue(data);
					return;
				}
	       		if ((uiHandler.chatClass!=='' || !uiHandler.focused) && data.id!==rtc._me) {
	       			if (uiHandler.notificationReady) {
	       				sendHtml5Notification(data);
	       			} else if (uiHandler.audible) {
	       				sendAudioNotification(data);
	       			}
	       		}
	        	self.addNewMessage($scope,data);
	        	uiHandler.safeApply($scope,function(){});
	    	});

			rtc.uniqueon('chat_typing',function(data){
	        	self.addNewMessage($scope,data);
	        	uiHandler.safeApply($scope,function(){});
	    	});

			if (chatmessages && uiHandler.messages.length===0) {
			    for (var j=0; j< chatmessages.length; j+=1) {
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
			    },1000);
			    $timeout(function(){ self.checkTypingIcons(); },2000);
			}
			
		};
	};
}]).filter('to_trusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);