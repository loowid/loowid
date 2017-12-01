'use strict';
/*global rtc: true */
/*global OEmbedProviders: true */
angular.module('mean.rooms').factory('ChatService',['$timeout','UIHandler','Rooms','Notification','$http',function($timeout,UIHandler,Rooms,Notification,$http){
	return function (){

		var uiHandler = UIHandler;
		this.welcomePublished = false;
		var self= this;
		var room = new Rooms({});

		this.oembedData = {};

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

	    this.getOEmbedData = function(url,callb) {
	    	var retrieve = $http({
	    			method:'post',
	    			url:'/chat/oembed',
	    			data:{
	    				url:url
	    			},
	    			headers:{'x-csrf-token':window.csrf}
	    	});
	    	retrieve.success(function(response) {
	    		callb(response);
	        }).error(function() {
	        	callb(null);
	        });
	    };

	    this.processOEmbedUrl = function($scope,url,list) {
			var realUniqueId = 'embed_'+(new Date()).getTime()+Math.floor(Math.random()*100);
			var miObj = {type:'oembed',idv:realUniqueId,loading:true,ready:false};
			var thumb = 'thumbnail_url';
	    	self.getOEmbedData(url,function(oembed){
	    		if (!oembed.error) {
					miObj.loading = false;
					miObj.ready = true;
					miObj.title = $scope.resourceBundle._('titleOpenVideoInWindow',oembed.title);
					var thumbUrl = oembed[thumb] || oembed.thumbnail;
					miObj.thumbnail = thumbUrl?thumbUrl:'';
					miObj.link = url;
					//miObj.videoid = video.id;
					setTimeout(function(){
						document.getElementById(realUniqueId).addEventListener ('click',function (event){
							$scope.openOEmbedFromService(oembed);
							event.preventDefault();
						});
					},500);
	    		} else {
					miObj.loading = false;
					miObj.ready = false;
	    		}
	    	});
			list.push(miObj);
	    };

	    this.getOEmbedProvidersRegExp = function() {
	    	var domains = '';
	    	for (var d=0;d<OEmbedProviders.domains.length;d+=1) {
	    		domains += (domains===''?'':'|')+'(www\.)?'+OEmbedProviders.domains[d].replace('.','\\.');
	    	}
	    	return new RegExp('(^|^https?://)('+domains+')/.+','g');
	    };

	    this.processOEmbedUrls = function($scope,txt,list) {
	    	var matches = self.getOEmbedProvidersRegExp().exec(txt);
	    	if (matches) {
	    		self.processOEmbedUrl($scope,txt,list);
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
		    	list.push({type:'edoc',fablack:true,title:$scope.resourceBundle.titleOpenGDocInWindow,id:docid,thumbnail:'/img/gslides.png', link: txt});
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
	    		list.push({type:'edoc',fawhite:true,title:$scope.resourceBundle.titleOpenTypeFormInWindow,id:docid,thumbnail:'/img/typeform.png', link: txt});
	    	}
	    };

	    this.processEtherpad = function($scope,txt,list) {
	    	var matches = /(?:https?:\/\/)?(beta\.etherpad\.org|etherpad\.udl\.cat)\/p\/([^\s]+)/g.exec(txt);
	    	if (matches) {
	    		var host = matches[1];
	    		var doc = matches[2];
		    	var docid = 'doc_'+doc+'_'+(new Date()).getTime()+Math.floor(Math.random()*100);
		    	setTimeout(function(){
		    		document.getElementById(docid).addEventListener('click',function(evt){
		    			$scope.openIFrameService('i'+docid,$scope.resourceBundle.etherpad,'//'+host+'/p/'+doc+'?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false');
		    			evt.preventDefault();
		    		});

		    	},500);
		    	list.push({type:'edoc',fawhite:true,title:$scope.resourceBundle.titleOpenEtherpadInWindow,id:docid,thumbnail:'/img/etherpad.png',link: txt });
	    	}
	    };

	    this.addObjects = function($scope,txt,list) {
	    	this.processTypeForm($scope,txt,list);
	    	this.processGoogleDoc($scope,txt,list);
	    	this.processEtherpad($scope,txt,list);
	    	this.processOEmbedUrls($scope,txt,list);
	    };

	    this.getAllSelectors = function() {
	        var ret = [];
	        for(var i = 0; i < document.styleSheets.length; i+=1) {
	        	try {
		            var rules = document.styleSheets[i].rules || document.styleSheets[i].cssRules;
		            for(var x in rules) {
		                if(typeof rules[x].selectorText === 'string') {
		                	ret.push(rules[x].selectorText);
		                }
		            }
	        	} catch (e) {
	        		// Firefox throw security error in other domain rules
	        	}
	        }
	        return ret;
	    };

	    this.selectorExists = function(selector) {
	        var selectors = this.getAllSelectors();
	        for(var i = 0; i < selectors.length; i+=1) {
	            if(selectors[i] === selector) {
	            	return true;
	            }
	        }
	        return false;
	    };

		this.emoticonsData = {
				'<3':'heart',
				':o)':'monkey_face',
				':*':'kiss',
				':-*':'kiss',
				'<\/3':'broken_heart',
				'=)':'smiley',
				'=-)':'smiley',
				'C:':'smile',
				'c:':'smile',
				':D':'smile',
				':-D':'smile',
				':>':'laughing',
				':->':'laughing',
				';)':'wink',
				';-)':'wink',
				':)':'blush',
				'(:':'blush',
				':-)':'blush',
				'8)':'sunglasses',
				':|':'neutral_face',
				':-|':'neutral_face',
				':\\\\':'confused',
				':-\\\\':'confused',
				':/':'confused',
				':-/':'confused',
				':p':'stuck_out_tongue',
				':-p':'stuck_out_tongue',
				':P':'stuck_out_tongue',
				':-P':'stuck_out_tongue',
				':b':'stuck_out_tongue',
				':-b':'stuck_out_tongue',
				';p':'stuck_out_tongue_winking_eye',
				';-p':'stuck_out_tongue_winking_eye',
				';b':'stuck_out_tongue_winking_eye',
				';-b':'stuck_out_tongue_winking_eye',
				';P':'stuck_out_tongue_winking_eye',
				';-P':'stuck_out_tongue_winking_eye',
				'):':'disappointed',
				':(':'disappointed',
				':-(':'disappointed',
				'>:(':'angry',
				'>:-(':'angry',
				':\'(':'cry',
				'D:':'anguished',
				':o':'open_mouth',
				':-o':'open_mouth'
			};

		this.getEmoticonsRegExp = function() {
			var pattern = '';
			for (var e in this.emoticonsData) {
				if (this.emoticonsData.hasOwnProperty(e)) {
					pattern += e.replace(/\*/g,'\\*').replace(/\)/g,'\\)').replace(/\(/g,'\\(').replace(/\|/g,'\\|') + '|';
				}
			}
			return new RegExp('(^|\\s)('+pattern.substring(0,pattern.length-1)+')(\\s|$)','g');
		};

	    this.emoticonItems = function($scope,txt,list) {
	    	var matches = txt.match(this.getEmoticonsRegExp());
	    	if (matches) {
	    		var mtxt = txt;
	    		for (var i=0; i<matches.length; i+=1) {
	    			var ind = mtxt.indexOf(matches[i]);
	    			var pre = mtxt.substring(0,ind);
	    			var post = mtxt.substring(ind+matches[i].length);
	    			if (pre) {
	    				list.push({type:'text',text:pre});
	    			}
	    			var selector = this.emoticonsData[matches[i].trim()].replace(/_/g,'-');
	    			if (this.selectorExists('.twa-'+selector)) {
	    				list.push({type:'emoji',twaclass:'twa twa-lg twa-'+selector, base: matches[i]});
	    			} else {
	    				list.push({type:'text',text:matches[i]});
	    			}
	    			if (post && i===matches.length-1) {
	    				list.push({type:'text',text:post});
	    			}
	    			mtxt = post;
	    		}
	    	} else {
	    		list.push({type:'text',text:txt});
	    	}
	    };

	    this.emojiItems = function($scope,txt,list) {
	    	var matches = txt.match(/\:[a-z0-9\_\+\-]+\:/g);
	    	if (matches) {
	    		var mtxt = txt;
	    		for (var i=0; i<matches.length; i+=1) {
	    			var ind = mtxt.indexOf(matches[i]);
	    			var pre = mtxt.substring(0,ind);
	    			var post = mtxt.substring(ind+matches[i].length);
	    			if (pre) {
	    				this.emoticonItems($scope,pre,list);
	    			}
	    			var selector = matches[i].substring(1,matches[i].length-1).replace(/_/g,'-').replace(/^\+1$/g,'thumbsup').replace(/^\-1$/g,'thumbsdown');
	    			if (this.selectorExists('.twa-'+selector)) {
	    				list.push({type:'emoji',twaclass:'twa twa-lg twa-'+selector, base: matches[i]});
	    			} else {
	    				list.push({type:'text',text:matches[i]});
	    			}
	    			if (post && i===matches.length-1) {
	    				this.emoticonItems($scope,post,list);
	    			}
	    			mtxt = post;
	    		}
	    	} else {
	    		this.emoticonItems($scope,txt,list);
	    	}
	    };

	    this.addItems = function($scope,txt,list) {
    		var slinks = [], embeds = [];
	    	var matches = txt.match(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g);
	    	if (matches) {
	    		var mtxt = txt;
	    		for (var i=0; i<matches.length; i+=1) {
	    			var ind = mtxt.indexOf(matches[i]);
	    			var pre = mtxt.substring(0,ind);
	    			var post = mtxt.substring(ind+matches[i].length);
	    			if (pre) {
	    				this.emojiItems($scope,pre,slinks);
	    			}
	    	    	if (matches[i].indexOf('@')>0 && matches[i].indexOf(':')<0) {
	    	    		slinks.push({type:'link',to:'mailto:'+matches[i],text:matches[i]});
	    	    	} else {
	    	    		slinks.push({type:'link',to:(matches[i].indexOf('http')===0?matches[i]:'http://'+matches[i]),text:matches[i]});
	    	    	}
	    	    	this.addObjects($scope,matches[i],embeds);
	    			if (post && i===matches.length-1) {
	    				this.emojiItems($scope,post,slinks);
	    			}
	    			mtxt = post;
	    		}
	    	} else {
	    		this.emojiItems($scope,txt,slinks);
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
	        		this.addItems($scope,data.text,m.list);
	        	}
	        	uiHandler.messages.push(m);
	        } else {
	        	if (!data.text) {
	        		uiHandler.messages[messageIndex].istyping = true;
	        	} else {
	        		uiHandler.messages[messageIndex].istyping = false;
	        		this.addItems($scope,data.text,uiHandler.messages[messageIndex].list);
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

	    	var tips = 0;
	    	var tipObjects = ['https://www.youtube.com/watch?v=7mWX_KLo7iA',':)',
	    	                  'https://docs.google.com/presentation/d/1QSGn19Pg7EllzzsLj0pGdZOsEMRkgvgAgvP7YP_UvKQ/share',
	    	                  ':heart:','https://vimeo.com/79834337','https://showroom.typeform.com/to/ggBJPd',
	    	                  'https://soundcloud.com/forss/flickermood',
	    	                  'http://www.ted.com/talks/amy_webb_how_i_hacked_online_dating',
	    	                  'http://www.slideshare.net/um_mncs/en-20-minutos-charla-loowid',
	    	                  'http://codepen.io/RomainJeff/pen/myRWeo','https://github.com/loowid/loowid/wiki'];

	    	$scope.enableAudio = function() {
	    		uiHandler.audible = !uiHandler.audible;
    		};

	        $scope.toggleChat = function() {
	        	uiHandler.chatClass=(uiHandler.chatClass==='collapsed')?'':'collapsed';
	        	uiHandler.dashChat=(uiHandler.chatClass==='collapsed')?'chat_collapsed':'';
	        };

	        $scope.chatTip = function(more) {
	        	if (!$scope.resourceBundle['chattip'+tips]) {
	        		tips = 0;
	        		self.addNewMessage($scope,{id:$scope.global.bot,text:':information_source: '+$scope.resourceBundle.nomoretips+' :weary:',time:new Date()});
	        	} else {
		        	self.addNewMessage($scope,{id:$scope.global.bot,text:':information_source: '+$scope.resourceBundle._('chattip'+tips,tipObjects[tips]),time:new Date()});
		        	if (more) {
		        		self.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle._('chattipmore',':information_source:'),time:new Date()});
		        	}
		        	tips += 1;
	        	}
	        };

	        $scope.changeSpeechVoice = function() {
        		for (var i = 0; i<$scope.ui.speechVoiceList.length; i+=1) {
        			self.addNewMessage($scope,{id:$scope.global.bot,text:($scope.ui.speechVoiceList[i].default?':speaker: ':':sound: ')+$scope.ui.speechVoiceList[i].name,time:new Date()});
        		}
	        };

	        $scope.changeSound = function($event) {
	        	var choosedVoiceName = angular.element($event.target).parent().parent().next().children().html().substring(1);
	        	for (var i = 0; i<$scope.ui.speechVoiceList.length; i+=1) {
	        		if ($scope.ui.speechVoiceList[i].name === choosedVoiceName) {
	        			$scope.ui.speechVoice = $scope.ui.speechVoiceList[i];
	        			$scope.global.speechText($scope,choosedVoiceName);
	        		}
	        	}
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
        		$scope.global.speechText($scope,readText);
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
			        self.addNewMessage($scope,{id:$scope.global.bot,text:$scope.resourceBundle.showchattips+' :point_right: :information_source:',time:new Date()});
			        self.welcomePublished =true;
			    },1000);
			    $timeout(function(){ self.checkTypingIcons(); },2000);
			}

		};
	};
}]);
