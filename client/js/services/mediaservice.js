'use strict';
/*global rtc: true */
angular.module('mean.rooms').factory('MediaService',['Rooms','UIHandler',function(Rooms,UIHandler){

	var RATIO_4_3 = 0;
	var RATIO_16_9 = 1;

	return function (){

		var uiHandler = UIHandler;
		var self = this;
		var room = new Rooms({});

		this.screenConstraints = {
			mandatory: { chromeMediaSource: 'screen','maxHeight': 600, 'maxWidth': 800},
			optional: []
		};

		var constraints = { audio: false, video: this.screenConstraints };
		var camConstraints = { audio: false, video: true };
		var audioConstraints = { audio: true, video: false };


		this.mediasources = {
			'screen': 	{'recording': false, 'stream': undefined, 'constraints': constraints, 'playtype':'video','winratio':RATIO_16_9 ,'winscale':0.5},
			'video': 	{'recording': false, 'stream': undefined, 'constraints': camConstraints, 'playtype':'video','winratio':RATIO_4_3 ,'winscale':0.25},
			'audio': 	{'recording': false, 'stream': undefined, 'constraints': audioConstraints, 'playtype':'audio'}
		};

		this.isAnythingRecording = function (){
			return (self.mediasources.screen.recording ||
					self.mediasources.audio.recording ||
					self.mediasources.video.recording
				   );
		};

		this.possibleResolutions = [{x:800,y:600},{x:1024,y:768},{x:1280,y:720},{x:1280,y:768},{x:1280,y:800},{x:1280,y:960},{x:1280,y:1024},{x:1366,y:768},{x:1440,y:900},{x:1680,y:900},{x:1680,y:1050},{x:1910,y:1200}];
		this.resolutions = [];
		this.receivedStreams = [];

		self.mute = function(stream,mute){
			if (stream) {
				var audioTracks = stream.getAudioTracks();
				audioTracks[0].enabled = !mute;
			}
		};

		self.startRecording = function ($scope,windowHandler,source,onrecord,onclose){

			var startRecordingFn = function (){

				var mediasource = self.mediasources[source];

				mediasource.initializingMedia = true;
				rtc.createStream(source, mediasource.constraints, function(stream){
					
					mediasource.onclose = onclose;
					mediasource.stream = stream;

					if (mediasource.playtype === 'video'){
						var mediaElement = document.createElement('video');
						mediaElement.setAttribute('id','my_'+ source);
						mediaElement.style.display = 'none';
						mediaElement.setAttribute('autoplay','');
						mediaElement.setAttribute('muted','');
						
						//Wait to start until 
						rtc.attachStream (mediasource.stream,mediaElement);
										
						var windowOptions =
							{
								'mediaElement':mediaElement,
								'title': $scope.resourceBundle['wintitle'+source],
								'ratio': mediasource.winratio,
								'scale': mediasource.winscale,
								'closeable': true,
								'onopen': 	function (win){
									//Attach the window reference to the media source
									mediasource.window = win;
									mediasource.initializingMedia = false;
									mediasource.recording = true;
									mediaElement.style.display = '';
									win.winHandler.resize (mediaElement.offsetWidth);
									if (typeof onrecord !== 'undefined' && onrecord !== null) {onrecord.call (self);}
									uiHandler.safeApply($scope,function(){});

								},
								'onclose': function (win){
									uiHandler.safeApply ($scope,function(){
										self.stopMedia($scope,source);
									});
								},
								'onmaximize': function (win){
									var moveZone = document.getElementById('moveZone');
									var finalHeight = (parseInt(moveZone.offsetHeight,10)-20);
									
									var videoELement = angular.element(mediaElement);
									videoELement.addClass('maximized');
									videoELement.css ('height', finalHeight +'px');
								},
								'onrestore': function (win){
									var videoELement = angular.element(mediaElement);
									videoELement.removeClass ('maximized');
									videoELement.css ('height', '100%');
								}
							};
							
							self.createVideoWindow($scope,windowHandler,windowOptions);
						
					}else if (mediasource.playtype === 'audio'){
						mediasource.initializingMedia = false;
						mediasource.recording = true;
						if (onrecord) {onrecord.call (self);}
						uiHandler.safeApply($scope,function(){});
					}
				},function (error){
					mediasource.recording = false;
					mediasource.initializingMedia = false;
					var errmsg = '';

					if (source === 'screen'){
						if (error==='installed-disabled'){
							errmsg = $scope.resourceBundle['loowid-extension-activate'];
						}else if (error === 'not-installed'){
							errmsg = $scope.resourceBundle['loowid-extension-message'] + ' <a target="_blank"  href="https://chrome.google.com/webstore/detail/loowid-screen-capturing/' + rtc.chromeDesktopExtensionId + '" >' +$scope.resourceBundle['loowid-extension-install']   +  '  </a>';
						}
					}else{
						errmsg = $scope.resourceBundle['unablepermission'+source] +  (source ==='screen' ? $scope.resourceBundle.readmore : '');
					}
					if (errmsg !== '') { $scope.global.showError($scope,errmsg); }
					if (uiHandler.access.moderated) {
						rtc.reportErrorToOwner($scope.global.roomId,source,'cantaccess'+source);
					}
				});
			};

			if (uiHandler.isowner || !uiHandler.access.moderated ){
				startRecordingFn ();
			}else{
				uiHandler.safeApply ($scope,function (){
					if (!uiHandler.modals) { uiHandler.modals = []; }

					uiHandler.modals.push({'text': $scope.resourceBundle._('wantsyoushare'+source,uiHandler.ownerName),
										   'yes': function (index){
											   uiHandler.safeApply ($scope,function(){
												   uiHandler.modals.splice(index,1);
											   });

											   startRecordingFn ();
										   },
										   'no': function (index){
											   uiHandler.safeApply ($scope,function(){
												   uiHandler.modals.splice(index,1);
											   });
											   rtc.reportErrorToOwner($scope.global.roomId,source,'denied'+source);
										   },
										   'class':'modalform editable',
										   'done':false,
										   'avatar':uiHandler.ownerAvatar, 
										  });	
				});
			}

		};

		self.createVideoWindow = function ($scope,windowHandler,windowOptions){
			if (windowOptions.mediaElement.currentTime < 0.01 || windowOptions.mediaElement.ended){
					setTimeout (function (){
						self.createVideoWindow ($scope,windowHandler,windowOptions);
					},300);
			}else{
				windowHandler.create ($scope,windowOptions);
			}
				
		};
		
		self.stopRecording = function($scope,source){
			var mediasource = this.mediasources[source];
			if (mediasource.recording){
				//si no va hacerlo por el elemnto click
				if (mediasource.playtype === 'video'){
					mediasource.window.winHandler.close();	
				}else if (mediasource.playtype === 'audio'){
					uiHandler.safeApply ($scope,function (){
						self.stopMedia($scope,source);
					});

				}
			}	
		};

		self.stopMedia = function ($scope,source){
			var mediasource = this.mediasources[source];
			mediasource.recording = false;
			rtc.removeStream($scope.global.roomId,source);
			if (!this.isAnythingRecording()) { uiHandler.status = 'STOPPED'; }
			if (mediasource.onclose) {mediasource.onclose.call (self);}
			mediasource.onclose = null;			
			mediasource.stream = null;
		};




		this.init = function($scope,windowHandler){

			uiHandler.resolutions = self.resolutions;
			uiHandler.currentResolution = 0;
			uiHandler.showResolutionMenu = false;	
			uiHandler.isMuted = false;	
			uiHandler.modals = [];
			uiHandler.tutorials = [];
			uiHandler.canShareDesktop = (navigator.webkitGetUserMedia!==undefined);

			//Initialize resolutions

			var addedResolution = {x:0,y:0};

			for (var el in self.possibleResolutions){
				if (self.possibleResolutions[el].x <= screen.width && self.possibleResolutions[el].y <= screen.height){
					addedResolution = self.possibleResolutions[el];
					self.resolutions.push(addedResolution);
				}else{
					//if the last resolutiona added is not our resolution we also add it
					if (addedResolution.x !== screen.width || addedResolution.y !== screen.height) {
						self.resolutions.push ({x:screen.width,y:screen.height});
					}
					break;
				}
			}


			//Launcher events	
			$scope.muteAudio = function (){
				uiHandler.isMuted = true; 

				if (self.mediasources.audio.recording){
					self.mute (self.mediasources.audio.stream,true);
				}
			};

			$scope.unmuteAudio = function (){
				uiHandler.isMuted = false;

				if (self.mediasources.audio.recording){
					self.mute (self.mediasources.audio.stream,false);
				}   
			};


			$scope.changeToResolution  = function (index){
				if (self.resolutions[index]){
					uiHandler.currentResolution = index;
					var csource = self.screenConstraints.mandatory;
					csource.maxWidth = self.resolutions[index].x;
					csource.maxHeight = self.resolutions[index].y;
				}

			};

			//Initialize the resolution to the top
			$scope.changeToResolution(self.resolutions.length-1);

			$scope.isRecording = function (source){
				return self.mediasources[source].recording;
			};

			$scope.isInitializingMedia = function (source){
				return self.mediasources[source].initializingMedia;
			};

			$scope.startRecording = function (source){
				self.startRecording ($scope,windowHandler,source,uiHandler.isowner ?
									 function (){//On start broadcasting
										 room.changeRoomStatus($scope.global.roomId,'BROADCASTING',function(){
											 //Refresh the view to restore the button state          
											 uiHandler.status = 'BROADCASTING';
											 rtc.updateOwnerData ($scope.global.roomId,uiHandler.name,uiHandler.avatar,uiHandler.status,uiHandler.access);
										 });
									 } : null , uiHandler.isowner ? function (){//On close all windows
										 if (uiHandler.status === 'STOPPED'){
											 room.changeRoomStatus($scope.global.roomId,'STOPPED',function(){
												 //Refresh the view to restore the button state          
												 rtc.updateOwnerData (uiHandler.roomId,uiHandler.name,uiHandler.avatar,uiHandler.status,uiHandler.access);
											 });
										 }
									 }: null
									);
			};

			$scope.showDesktopAlertMessage = function(){
				uiHandler.safeApply ($scope,function (){
					if (!uiHandler.tutorials) { uiHandler.tutorials = []; }

					uiHandler.tutorials.push({'text': $scope.resourceBundle.justchrome,
											  'ok': function (index){
												  uiHandler.tutorials.splice(index,1);
											  },
											  'left': 100,
											  'top': 75,
											  'class':'tutorialform',
											  'done':false
											 });	
				});
			};

			$scope.changeWindowName = function(connectionId,name) {
				if (self.receivedStreams.length>0) {
					for (var i=0; i<self.receivedStreams.length; i+=1) {
						if (self.receivedStreams[i].connectionId===connectionId) {
							//Could be that the window could not be setup already because the method was called for a new status of member
							if (self.receivedStreams[i].window) { self.receivedStreams[i].window.title = name; }
						}
					}
				}
			};


			$scope.stopRecording = function (source){
				self.stopRecording ($scope,source);
			};


			$scope.askForSharing = function (connectionId,share){

				var askForSharingFn = function (){
					room.askForSharing($scope.global.roomId,uiHandler.isowner ? connectionId : rtc._me,share,function(rdo){
						if (rdo.success) {
							if (uiHandler.isowner){
								if (!uiHandler.userStatus[connectionId]){
									uiHandler.userStatus[connectionId] = {};
								}
								uiHandler.userStatus[connectionId][share] = true;
							}

							rtc.askForScreen ($scope.global.roomId,connectionId,share);
						}
					});
				};			    

				if (uiHandler.isowner){
					askForSharingFn();
				}else{
					uiHandler.safeApply ($scope,function (){
						if (!uiHandler.modals) { uiHandler.modals = []; }

						uiHandler.modals.push({'text': $scope.resourceBundle['requestownerfor'+share],
											   'yes': function (index){
												   uiHandler.modals.splice(index,1);
												   askForSharingFn();
											   },
											   'no': function (index){
												   uiHandler.modals.splice(index,1);
											   },
											   'class':'modalform editable',
											   'done':false
											  });	
					});
				}

			};

			$scope.askForStopSharing = function(connectionId,origin){
				if(uiHandler.isowner){
					room.askForStopSharing(uiHandler.roomId,connectionId,origin,function(rdo){
						if (rdo.success) {
							uiHandler.userStatus[connectionId][origin] = false;
							rtc.askForStopScreen ($scope.global.roomId,connectionId,origin);
						}
					});
				}
			};

			$scope.openVideoFromService = function (wtitle,wurl){
				$scope.openIFrameService(null,wtitle,wurl);
			};

			$scope.openIFrameService = function (wid,wtitle,wurl){
				var iframe = '<iframe src="' + wurl +
							 '" class="wframe" frameborder="0" ' + (wid?'id="'+wid+'" ':'') +
							 'webkitallowfullscreen mozallowfullscreen allowfullscreen ></iframe>';
				var iframeElement = angular.element(iframe);
				var windowOptions = {
					'mediaElement': iframeElement,
					'title': wtitle,
					'ratio': RATIO_16_9,
					'scale': 0.5,
					'closeable': true	
				};
				windowHandler.create ($scope,windowOptions);
				if (wid) {
					setTimeout(function(){
						document.getElementById(wid).className += ' wframemessage';
					},3500);
				}
			};

			/*Declar media related events */
			rtc.uniqueon('add remote stream', function(stream,connectionId,mediatype){

				var mediasource = {};
				mediasource.stream = stream;
				mediasource.connectionId = connectionId;
				mediasource.type = mediatype;
				mediasource.recording = true;


				mediasource.playtype = self.mediasources[mediatype] ? self.mediasources[mediatype].playtype : 'unknow';
				self.receivedStreams.push (mediasource); 

				var streamId = connectionId + '_' + mediatype;

				if (mediasource.playtype === 'video'){
					mediasource.winratio = self.mediasources[mediatype].winratio;
					mediasource.winscale = self.mediasources[mediatype].winscale;
					var mediaElement = document.createElement('video');
					mediaElement.setAttribute('id','remote_'+ streamId);
					mediaElement.style.display = 'none';
					mediaElement.setAttribute('autoplay','');
					mediaElement.setAttribute('muted','');
					rtc.attachStream (mediasource.stream,mediaElement);

					var windowOptions = {
						'mediaElement' :mediaElement,
						'title': $scope.getUserName(connectionId),
						'ratio': mediasource.winratio,
						'scale': mediasource.winscale, 
						'closeable': (uiHandler.isowner && uiHandler.access.moderated) ,
						'onopen': function (win){
							//Attach the window reference to the media source
							mediasource.window = win;

							mediaElement.style.display = '';
							win.winHandler.resize (mediaElement.offsetWidth);

							//Press play again for firefox
							mediaElement.play();

							uiHandler.safeApply($scope,function(){});
						},
						'onclose': function (win){
							if (uiHandler.isowner){
								uiHandler.safeApply ($scope,function(){
									$scope.askForStopSharing (connectionId,mediasource.type);
								});	
							}
						},
						'onmaximize': function (win){
							var moveZone = document.getElementById('moveZone');
							var finalHeight = (parseInt(moveZone.offsetHeight,10)-20);

							var videoELement = angular.element(mediaElement);
							videoELement.addClass('maximized');
							videoELement.css ('height', finalHeight +'px');
						},
						'onrestore': function (win){
							var videoELement = angular.element(mediaElement);
							videoELement.removeClass ('maximized');
							videoELement.css ('height', '100%');
						}
					};

					self.createVideoWindow($scope,windowHandler,windowOptions);

			}else{ 
						 var mediaElement2 = document.createElement('audio');
			mediaElement2.setAttribute('id','remote_'+ streamId);
			mediaElement2.style.display = 'none';
			mediaElement2.setAttribute('autoplay','');
			document.getElementById('remoteAudios').appendChild(mediaElement2);
			rtc.attachStream(mediasource.stream,'remote_' + streamId);
			//Press play again for firefox
			mediaElement2.play();
		}
		uiHandler.safeApply($scope,function(){});
	});


	rtc.uniqueon('stream_closed',function(data){

		for (var i=0; i< self.receivedStreams.length; i+=1){
			var mediasource = self.receivedStreams[i];

			var streamId = mediasource.connectionId + '_' + mediasource.type;
			if (mediasource.stream && streamId === (data.connectionId + '_' + data.mediatype)){
				rtc.dropPeerConnection(data.connectionId,data.mediatype,false);

				if (mediasource.playtype==='video'){
					mediasource.window.winHandler.close();
				}else{
					var el = document.getElementById('remote_' + streamId); 
					el.parentNode.removeChild(el);
					$scope.askForStopSharing (data.connectionId,mediasource.type);
				}

				self.receivedStreams.splice (i,1);
				break;
			}

		}
	});

	var removeReceivedStreams = function(connectionId) {
		for (var j = 0 ; j < self.receivedStreams.length ; j+=1){
			var mediasource = self.receivedStreams [j];

			if (mediasource.connectionId === connectionId){
				var streamId = mediasource.connectionId + '_' + mediasource.type;
				rtc.dropPeerConnection(connectionId,mediasource.type,false);

				if (mediasource.playtype ==='video'){
					mediasource.window.winHandler.close();
				}else{
					var el2 = document.getElementById('remote_'+streamId);
					el2.parentNode.removeChild(el2);
				}

				self.receivedStreams.splice (j,1);
				j-=1;
			}
		}
	};

	rtc.uniqueon('disconnect stream',function(connectionId){

		//If any body disconnects we try to remove possible streams windows
		if (connectionId){
			//we turn off all their streams 

			for (var i = 0; i< uiHandler.users.length; i+=1){

				if (connectionId === uiHandler.users[i].connectionId || connectionId === uiHandler.ownerConnectionId){
					removeReceivedStreams(connectionId);
					break;
				}   
			}

		}
	});

	//Request sharing signaling events
	rtc.uniqueon ('share_request',function (data){
		//Someone rising hand
		if (uiHandler.isowner){

			uiHandler.safeApply ($scope,function (){
				if (!uiHandler.modals) { uiHandler.modals = []; }

				uiHandler.modals.push({'text': $scope.resourceBundle._('requestfor'+data.source,$scope.getUserName(data.id)),
									   'yes': function (index){
										   uiHandler.modals.splice(index,1);
										   $scope.askForSharing(data.id,data.source);
									   },
									   'no': function (index){
										   uiHandler.modals.splice(index,1);
										   rtc.reportErrorToUser($scope.global.roomId,data.id,data.source);
									   },
									   'class':'modalform editable',
									   'done':false,
									   'avatar': $scope.getUser(data.id).avatar
									  });	
			});
		}else{
			$scope.startRecording(data.source);
		}

	}); 

	//Define the behaviour of a stop_request is received because is sent by the own viewer
	rtc.uniqueon('stop_request',function (data){
		//Look for status to change the controls of the user
		if (uiHandler.isowner){
			if (uiHandler.userStatus[data.connectionId] &&  uiHandler.userStatus[data.connectionId][data.source]){
				uiHandler.userStatus[data.connectionId][data.source] = false;	
			}
		}else{
			if (data.connectionId === rtc._me){ // In that case he has to stop request take care with other requests
				$scope.stopRecording(data.source);
			}
		}

	});

	rtc.uniqueon('error_produced',function (data){
		//Look for status to change the controls of the user
		if (uiHandler.isowner && uiHandler.userStatus[data.connectionId] &&  uiHandler.userStatus[data.connectionId][data.origin]){
			uiHandler.userStatus[data.connectionId][data.origin] = false;  
			var errMessage = $scope.resourceBundle._(data.type,$scope.getUserName(data.connectionId));
			$scope.global.showError($scope,errMessage);
		}else if (uiHandler.isowner){
			var errMessage2 = $scope.getUserName(data.connectionId) + ' ' + $scope.resourceBundle['deny'+data.type+'request'];
			$scope.global.showError($scope,errMessage2);
		}

		uiHandler.safeApply($scope,function(){});

	});	

};
													 };
													 }]);