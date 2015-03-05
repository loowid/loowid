'use strict';
/*global rtc: true */
angular.module('mean.rooms').factory('ChatService',['$timeout','UIHandler','Rooms','Notification','$http',function($timeout,UIHandler,Rooms,Notification,$http){
	return function (){

		var uiHandler = UIHandler;
		this.welcomePublished = false;
		var self= this;
		var room = new Rooms({});

		this.videoData = {};
		
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
	    	if (url.indexOf('@')>0 && url.indexOf(':')<0) {
	    		return '<a href="mailto:' + url + '" target="_blank">' + url + '</a>';
	    	} else {
	    		return '<a href="' + (url.indexOf('http')===0?url:'http://'+url) + '" target="_blank">' + url + '</a>';
	    	}
	    };
	    
	    this.getVideoData = function(service,vid,callb) {
	    	if (!this.videoData[vid]) {
		    	var retrieve = $http({
		    			method:'post',
		    			url:'/chat/video',
		    			data:{
		    				service:service,
		    				id:vid
		    			},
		    			headers:{'x-csrf-token':window.csrf}
		    	});
		    	retrieve.success(function(response) {
		    		self.videoData[vid] = response;
		    		callb(self.videoData[vid]);
		        }).error(function(response) {
		        	callb(null);
		        });
	    	} else {
	    		callb(this.videoData[vid]);
	    	}
	    };
	    
	    this.absoluteUrl = function(url) {
	    	if (url.indexOf('://')>0) {
	    		return url.substring(url.indexOf('://')+1);
	    	} else {
	    		return '//'+url;
	    	}
	    };
	    
	    this.getReplaceFunction = function($scope,service) {
			var replaceFunction = function(url,vid) {
				// Avoid side effects copying the same video multiple times
				var realUniqueId = 'max_'+vid+'_'+(new Date()).getTime()+Math.floor(Math.random()*100);
				var spinner = '<div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>';
	    		var frame = '<a href id="'+ realUniqueId +'">'+spinner+'</a>' + url;
				self.getVideoData(service,vid,function(video){
					var element = document.getElementById (realUniqueId);
					if (video.error) {
						element.parentNode.removeChild(element);
					} else {
						element.removeChild(element.getElementsByTagName('div')[0]);
						element.innerHTML = '<div class="evideo"><img src="'+video.thumbnail+'" width="100%" height="100%" title="'+video.title+'" data-videoid="'+video.id+'"></img><i class="fa fa-play-circle"></i>' + element.innerHTML;
						element.addEventListener ('click',function (event){
							$scope.openVideoFromService(video.title,video.url);
							event.preventDefault();
						});
					}
				});
				return frame;
			};
			return replaceFunction;
	    };
	    
	    this.videoServices = {
	    		'youtube': { 
	    			regexp: [/(?:https?:\/\/)?www\.youtube\.com\/watch\?v=([^\s]+)/g,/(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([^\s]+)/g,/(?:https?:\/\/)?youtu\.be\/([^\s]+)/g]
	    		},
	    		'vimeo': {
	    			regexp: [/(?:https?:\/\/)?vimeo\.com\/([0-9]+)/g,/(?:https?:\/\/)?vimeo\.com\/channels\/[^\/]+\/([0-9]+)/g]
	    		},
	    		'dailymotion': {
	    			regexp: [/(?:https?:\/\/)?www\.dailymotion\.com\/video\/([^\_]+)_.*/g]
	    		}
	    };
	    
	    this.parseVideoUrls = function($scope,txt) {
			var videoTxt = txt;
			for (var el in this.videoServices) {
				for (var re in this.videoServices[el].regexp) {
					videoTxt = videoTxt.replace(this.videoServices[el].regexp[re],this.getReplaceFunction($scope,el));
				}
			}
			return videoTxt;
	    };
	    
	    this.replaceGoogle = function($scope) {
	    	return function(url,doc) {
		    	var docid = 'doc_'+doc+'_'+(new Date()).getTime()+Math.floor(Math.random()*100);
		    	setTimeout(function(){
		    		document.getElementById(docid).addEventListener('click',function(evt){
		    			$scope.openIFrameService('i'+docid,$scope.resourceBundle.googledoc,'//docs.google.com/presentation/d/'+doc+'/embed?start=false&loop=false&delayms=3000');
		    			evt.preventDefault();
		    		});
		    		
		    	},500);
		    	return '<div class="edoc"><a id="'+docid+'" href="#"><img src="/img/gslides%2Epng"/></a></div>'+url;
	    	};
	    };
	    
	    this.replaceTypeform = function($scope) {
	    	return function(url,doc) {
		    	var docid = 'frm_'+doc+'_'+(new Date()).getTime()+Math.floor(Math.random()*100);
		    	setTimeout(function(){
		    		document.getElementById(docid).addEventListener('click',function(evt){
		    			$scope.openIFrameService('if'+docid,$scope.resourceBundle.typeform,'//showroom.typeform.com/to/'+doc);
		    			evt.preventDefault();
		    		});
		    		
		    	},500);
		    	return '<div class="edoc"><a id="'+docid+'" href="#"><img src="/img/typeform%2Epng"/></a></div>'+url;
	    	};
	    };
	    
	    this.parseUrls = function($scope,txt) {
			var newText = this.parseVideoUrls($scope,txt);
			newText = newText.replace(/(?:https:\/\/)?docs\.google\.com\/presentation\/d\/([^\/\s]+)\/[^\s]+/g,this.replaceGoogle($scope));
			newText = newText.replace(/(?:https:\/\/)?[^\.]+\.typeform\.com\/to\/([^\s]+)/g,this.replaceTypeform($scope));
			return newText.replace(/(((https?:\/\/)?(((?!-)[A-Za-z0-9-:]{1,63}[@]{0,1}[A-Za-z0-9-]*(?!-)\.)+[A-Za-z]{2,6})(:\d+)?(\/([-\w/_\.\,]*(\?\S+)?)?)*)(#\S*)?(?!@))/g, this.link);
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