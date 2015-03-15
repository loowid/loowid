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
	    
	    this.processVideoLinks = function($scope,vid,list,service) {
			// Avoid side effects copying the same video multiple times
			var realUniqueId = 'max_'+vid+'_'+(new Date()).getTime()+Math.floor(Math.random()*100);
			var miObj = {type:'video',idv:realUniqueId,loading:true,ready:false};
			self.getVideoData(service,vid,function(video){
				if (!video.error) {
					miObj.loading = false;
					miObj.ready = true;
					miObj.title = $scope.resourceBundle._('titleOpenVideoInWindow',video.title);
					miObj.thumbnail = video.thumbnail;
					miObj.videoid = video.id;
					setTimeout(function(){
						document.getElementById(realUniqueId).addEventListener ('click',function (event){
							$scope.openVideoFromService(video.title,video.url);
							event.preventDefault();
						});
					},500);
				}
			});
			list.push(miObj);
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
	    
	    this.processVideoUrls = function($scope,txt,list) {
			for (var el in this.videoServices) {
				for (var re in this.videoServices[el].regexp) {
					var matches = this.videoServices[el].regexp[re].exec(txt);
					if (matches) {
						this.processVideoLinks($scope,matches[1],list,el);
					}
				}
			}
	    };
	    
	    this.processGoogleDoc = function($scope,txt,list) {
	    	var matches = /(?:https:\/\/)?docs\.google\.com\/presentation\/d\/([^\/\s]+)\/[^\s]+/g.exec(txt);
	    	if (matches) {
	    		var doc = matches[1];
		    	var docid = 'doc_'+doc+'_'+(new Date()).getTime()+Math.floor(Math.random()*100);
		    	setTimeout(function(){
		    		document.getElementById(docid).addEventListener('click',function(evt){
		    			$scope.openIFrameService('i'+docid,$scope.resourceBundle.googledoc,'//docs.google.com/presentation/d/'+doc+'/embed?start=false&loop=false&delayms=3000');
		    			evt.preventDefault();
		    		});
		    		
		    	},500);
		    	list.push({type:'gdoc',fablack:true,title:$scope.resourceBundle.titleOpenGDocInWindow,id:docid,thumbnail:'/img/gslides.png'});
	    	}
	    };
	    
	    this.processTypeForm = function($scope,txt,list) {
	    	var matches = /(?:https:\/\/)?[^\.]+\.typeform\.com\/to\/([^\s]+)/g.exec(txt);
	    	if (matches) {
	    		var doc = matches[1];
	    		var docid = 'frm_'+doc+'_'+(new Date()).getTime()+Math.floor(Math.random()*100);
		    	setTimeout(function(){
		    		document.getElementById(docid).addEventListener('click',function(evt){
		    			$scope.openIFrameService('if'+docid,$scope.resourceBundle.typeform,'//showroom.typeform.com/to/'+doc);
		    			evt.preventDefault();
		    		});
		    		
		    	},500);
	    		list.push({type:'typeform',fawhite:true,title:$scope.resourceBundle.titleOpenTypeFormInWindow,id:docid,thumbnail:'/img/typeform.png'});
	    	}
	    };
	    
	    this.addObjects = function($scope,txt,list) {
	    	this.processTypeForm($scope,txt,list);
	    	this.processGoogleDoc($scope,txt,list);
	    	this.processVideoUrls($scope,txt,list);
	    };
	    
	    this.addItems = function($scope,txt,list) {
    		var slinks = [], embeds = [];
	    	var matches = txt.match(/(((https?:\/\/)?(((?!-)[A-Za-z0-9-:]{1,63}[@]{0,1}[A-Za-z0-9-]*(?!-)\.)+[A-Za-z]{2,6})(:\d+)?(\/([-\w/_\.\,]*(\?\S+)?)?)*)(#\S*)?(?!@))/g);
	    	if (matches) {
	    		var mtxt = txt;
	    		for (var i=0; i<matches.length; i+=1) {
	    			var ind = mtxt.indexOf(matches[i]);
	    			var pre = mtxt.substring(0,ind);
	    			var post = mtxt.substring(ind+matches[i].length);
	    			if (pre) {
	    				slinks.push({type:'text',text:pre});
	    			}
	    	    	if (matches[i].indexOf('@')>0 && matches[i].indexOf(':')<0) {
	    	    		slinks.push({type:'link',to:'mailto:'+matches[i],text:matches[i]});
	    	    	} else {
	    	    		slinks.push({type:'link',to:(matches[i].indexOf('http')===0?matches[i]:'http://'+matches[i]),text:matches[i]});
	    	    	}
	    	    	this.addObjects($scope,matches[i],embeds);
	    			if (post && i===matches.length-1) {
	    				slinks.push({type:'text',text:post});
	    			}
	    			mtxt = post;
	    		}
	    	} else {
	    		slinks.push({type:'text',text:txt});
	    	}
    		list.push({list:slinks,embed:embeds});
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
	        		//m.list.push(this.parseUrls($scope,data.text));
	        		this.addItems($scope,data.text,m.list);
	        	}
	        	uiHandler.messages.push(m);
	        } else {
	        	if (!data.text) {
	        		uiHandler.messages[messageIndex].istyping = true;	
	        	} else {
	        		uiHandler.messages[messageIndex].istyping = false;
	        		this.addItems($scope,data.text,uiHandler.messages[messageIndex].list);
	        		//uiHandler.messages[messageIndex].list.push(this.parseUrls($scope,data.text));
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
}]);