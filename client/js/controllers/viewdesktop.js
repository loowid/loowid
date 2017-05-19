'use strict';
/*global rtc: true */
angular.module('mean.rooms').controller('ViewDesktopController', ['$scope', '$routeParams', '$location', 'Global', 'Rooms', '$timeout','ngI18nResourceBundle','ngI18nConfig','$sce','FileService','ChatService','MediaService','WindowHandler','UserHandler','UIHandler',function ($scope, $routeParams, $location, Global, Rooms, $timeout,ngI18nResourceBundle, ngI18nConfig,$sce,FileService,ChatService,MediaService,WindowHandler,UserHandler,UIHandler){
	var uiHandler = UIHandler;
    $scope.global = Global;
    $scope.ui = uiHandler;

    uiHandler.userType = 'remote';

    uiHandler.connectedClass = '';
    uiHandler.chatClass = '';
    uiHandler.remoteScreenClass ='';

    uiHandler.dashConn = '';
    uiHandler.dashChat = '';
	uiHandler.isowner = false;

    document.getElementById('noscript').style.display = 'none';

    // Handle error
    uiHandler.errorClass = '';
    uiHandler.errorMessage = '';

    var room = new Rooms({});

    var userHandler = new UserHandler ();
    var fileService = new FileService ();
    var chatService = new ChatService ();
    var mediaService = new MediaService();
    var windowHandler = new WindowHandler();

    $scope.global.setupI18N($scope,ngI18nResourceBundle,ngI18nConfig);

    $scope.hideError = function() {
        $scope.global.hideError($scope);
    };

    uiHandler.focused = true;

    window.onfocus = function() {
    	uiHandler.focused = true;
    };

    window.onblur = function() {
    	uiHandler.focused = false;
    };

    $scope.changeOwnerConnectionId = function (id) {
    	uiHandler.ownerConnectionId = id;
    };

    $scope.roomLeave = function (clean){

        var leaveFn = function (){
            if (!uiHandler.passNeeded && uiHandler.joinable) { rtc.reset(); }
            $scope.global.roomId ='';
            $location.search('r',null);
            $location.path('/');
        };

        if (uiHandler.status==='DISCONNECTED'){
            leaveFn ();
        }else {
            uiHandler.safeApply ($scope,function (){
                if (!uiHandler.modals) { uiHandler.modals = []; }

                uiHandler.modals.push({'text': $scope.resourceBundle.warningleavetheroom,
                    'yes': function (index){
                        uiHandler.safeApply ($scope,function(){
                            uiHandler.modals.splice(index,1);
                        });

                        leaveFn();
                    },
                    'no': function (index){
                        uiHandler.safeApply ($scope,function(){
                            uiHandler.modals.splice(index,1);
                        });
                        if (clean) {
                  			$location.search('r',$scope.global.previousSearch);
                  			$location.path($scope.global.previousPath);
                        }
                    },
                    'class':'modalform editable',
                    'done':false
                });
            });
        }
    };

    $scope.addPassword = function() {
        if (!uiHandler.roomPassword) { return; }
        uiHandler.passNeeded = false;
        uiHandler.connectionError = false;
        uiHandler.sendingPwd = true;
        room.joinPass($scope.global.roomId,uiHandler.roomPassword,true);
    };


    $scope.joinResult = function(results){
    	if (results.passfail) {
    		rtc.fire('password_failed');
    		return;
    	}
    	uiHandler.sendingPwd = false;
    	uiHandler.ownerName = results.owner.name;
    	uiHandler.ownerConnectionId = results.owner.connectionId;
    	uiHandler.status = results.status;
    	uiHandler.ownerAvatar = results.owner.avatar;
    	uiHandler.users = results.guests;
        uiHandler.passNeeded = false;
        uiHandler.connectionError = false;
        uiHandler.access = results.access;
        uiHandler.chatstatus = results.access.chat;
        if (!uiHandler.currentConnectionId || uiHandler.currentConnectionId !== rtc._me) {
        	room.notifyIn($scope);
        	rtc.peerListUpdated($scope.global.roomId);
        }
        uiHandler.currentConnectionId = rtc._me;
		room.chat($scope.global.roomId,function(resu){
			uiHandler.chatPage = resu.page;
			chatService.init ($scope,resu.chat);
            if (window.innerWidth <= 800 ){
            	// Let user see welcome message
            	setTimeout(function(){
            		$scope.toggleChat();
            	},1800);
            }
		});
        // Set my own name
        for (var i=0; i<results.guests.length; i+=1) {
            if (results.guests[i].connectionId === rtc._me) {
            	uiHandler.name = results.guests[i].name;
            	uiHandler.avatar = results.guests[i].avatar;
            	uiHandler.hero = room.getHero(uiHandler.avatar);
            }
        }

    };



    $scope.init = function (){
    	var rid = $location.search().r||$routeParams.roomId;
    	uiHandler.roomId = $scope.global.roomId = rid;
        $scope.isowner = false;

		// Reload if is a permanent room
		window.clearInterval($scope.global.reloadInterval);
		$scope.global.reloadInterval = window.setInterval(function(){
			if (uiHandler.joinable===false && uiHandler.locked===false && uiHandler.permanent) {
				window.location.reload();
			}
		},30000);

        $scope.isRoomJoinable(function(){

	        if ($scope.isValidBrowser()) {
	            //When this method is triggered is possible that we didn't know anything about the room
	            //We must wait until data is ready
	            userHandler.init ($scope);
	           	windowHandler.init ($scope);
				mediaService.init($scope,windowHandler);
		        fileService.init ($scope);

	            if (window.innerWidth <= 800 ){
	                $scope.toggleConnected();
	            }

	        }else{
	        	$location.search('r',null);
	            $location.path('/');
	        }

	        if (!rtc._me) {

		        rtc.on ('password_failed', function(data) {
		        	uiHandler.sendingPwd = false;
		        	uiHandler.passNeeded = true;
		        	uiHandler.connectionError = true;
		        	uiHandler.safeApply($scope,function(){});
		            // Close socket and listeners
		            if (rtc._me) { rtc.reset(); }
		        });

		        rtc.on ('room_locked', function(data) {
		        	uiHandler.sendingPwd = false;
		        	uiHandler.passNeeded = false;
		        	uiHandler.connectionError = false;
		        	uiHandler.locked = true;
		        	uiHandler.joinable = false;
		        	uiHandler.safeApply($scope,function(){});
		            // Close socket and listeners
		            if (rtc._me) { rtc.reset(); }
            		// If room is inactive or locked go out in 5 seconds.
            		setTimeout(function(){
	            		$scope.global.roomId ='';
	                	uiHandler.joinable = false;
	                	$location.search('r',null);
	                    $location.path('/');
	                    uiHandler.safeApply($scope,function(){});
            		},5000);
		        });

		        //This function is a bit room bit user we declare it two times
		        rtc.on ('owner_data_updated',function(data){
		       		uiHandler.status = data.status;
		    		uiHandler.access = data.access;
		            var chatModified = (uiHandler.chatstatus !== undefined && uiHandler.chatstatus !== data.access.chat);
		            uiHandler.chatstatus = data.access.chat;

		            if (chatModified) {
		                chatService.alertChatStatus($scope,data.access.chat?'disabled':'enabled');
		            }
		            uiHandler.safeApply($scope,function(){});
		        });

		        rtc.on('room_moved',function(data){
		        	rtc.room = uiHandler.roomId =$scope.global.roomId = data.room;
		           $location.search('r',data.room);
		        });

		        rtc.on('room_out',function(data){

		            uiHandler.safeApply ($scope,function (){
		                if (!uiHandler.modals) { uiHandler.modals = []; }

		                uiHandler.modals.push({'text': $scope.resourceBundle.youarefired,
		                    'ok': function (index){
		                        uiHandler.safeApply ($scope,function(){
		                            uiHandler.modals.splice(index,1);
		                        });

		                       uiHandler.status = 'DISCONNECTED';
		                      $scope.roomLeave();
		                    },
		                    'class':'modalform editable',
		                    'done':false
		                });
		            });
		        });

	        }

		    var joinUsr = room.join($scope.global.roomId,$scope.joinResult);

		    uiHandler.name = joinUsr.name;
		    uiHandler.avatar = joinUsr.avatar;
		    uiHandler.gravatar = joinUsr.gravatar;
		    uiHandler.access = joinUsr.access;
		    uiHandler.hero = joinUsr.hero;


		    $scope.global.name = uiHandler.name;
		    $scope.global.gravatar = uiHandler.gravatar;

        });

    };

		$scope.showStatusBar = function (user) {
				if (!user.hideBarStatus) {
					user.hideBarStatus ='';
				}

				if (user.connectionStatus) {

					user.currentConnectionStatus = user.connectionStatus.audio.out +
						user.connectionStatus.video.out +
						user.connectionStatus.screen.out;

					if (!user.lastConnectionStatus || user.lastConnectionStatus !== user.currentConnectionStatus) {
						user.lastConnectionStatus = user.currentConnectionStatus;

						if (user.hideConnectionStatus) {
							$timeout.cancel(user.hideConnectionStatus);
						}

						user.hideConnectionStatus = $timeout (function () {
								user.hideBarStatus = 'hideBar';
								delete user.hideConnectionStatus;
						},5000,true);

						user.hideBarStatus = '';
					}

					return 'shown';
				}

				return 'notshown';
		};


    $scope.isValidBrowser = function(){
       return $scope.global.isValidReceiver();
    };


    $scope.isRoomJoinable = function (done){
        room.isRoomJoinable ($scope.global.roomId,function(result){
        	if (!$scope.global.hasfailed) { rtc.reset(); }
        	$scope.global.hasfailed = false;
        	uiHandler.joinable = result.joinable;
        	uiHandler.locked = result.locked;
        	uiHandler.permanent = result.permanent;
            if (result.joinable) {
            	uiHandler.passNeeded = result.private;
                if (!result.private) {
                	if (!rtc._me) {
                		room.joinPass($scope.global.roomId,'',true);
                	}
                }
                done();
            } else {
            	if (!result.permanent) {
            		// If room is inactive or locked go out in 5 seconds.
            		setTimeout(function(){
	            		$scope.global.roomId ='';
	                	uiHandler.joinable = false;
	                	$location.search('r',null);
	                    $location.path('/');
	                    uiHandler.safeApply($scope,function(){});
            		},5000);
            	}
            }
        },function (err){
        	$scope.global.hasfailed = true;
        	if (rtc._me) { $scope.roomLeave(true); }
        	else {
        		$scope.global.roomId ='';
            	uiHandler.joinable = false;
            	$location.search('r',null);
                $location.path('/');
        	}
        });
    };

    $scope.$on('$routeUpdate', function(a,b,c){
    	if (($location.search().r || $routeParams.roomId) !== $scope.global.roomId) {
    		// Do not touch the url
    		$scope.roomLeave(true);
    	}
    });

    $scope.$on('$locationChangeStart',function(evt, absNewUrl, absOldUrl) {
    	var ind = absOldUrl.indexOf('?');
    	var last = ind>0?ind:absOldUrl.length;
    	$scope.global.previousSearch = null;
    	if (ind>0) {
    		var sch = absOldUrl.substring(ind+1).split('=');
    		if (sch[0]==='r') {
    			$scope.global.previousSearch = sch[1];
    		}
    	}
    	$scope.global.previousPath = absOldUrl.substring(absOldUrl.indexOf('/#!/')+4,last);
   	});

}]).config(function($sceProvider) {
    $sceProvider.enabled(true);
}).directive('ngEscape', function () {
    return function (scope, element, attrs) {
        element.bind('keydown keypress', function (event) {
        });
    };
});
