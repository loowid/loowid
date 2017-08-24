'use strict';
/*global rtc: true */
angular.module('mean.rooms').controller('RecordController', ['$scope', '$routeParams', '$location', 'Global','Rooms','$timeout','ngI18nResourceBundle','ngI18nConfig','$cookieStore','$sce','FileService','ChatService','MediaService','WindowHandler','UserHandler','UIHandler',function ($scope, $routeParams, $location, Global, Rooms, $timeout,ngI18nResourceBundle, ngI18nConfig, $cookieStore,$sce,FileService,ChatService,MediaService,WindowHandler,UserHandler,UIHandler) {

	var uiHandler = UIHandler;
	$scope.global = Global;
	$scope.ui = uiHandler;

    var room = new Rooms({});
    var fileService = new FileService();
    var chatService = new ChatService();
    var mediaService = new MediaService();
    var windowHandler = new WindowHandler();
    var userHandler = new UserHandler();

    uiHandler.isowner = true;

    document.getElementById('noscript').style.display = 'none';

    //We had three objects stream to handle the diferent stream sources webcam/screen

	uiHandler.connNew = '';
	uiHandler.connectedClass = '';
	uiHandler.chatClass = '';
	uiHandler.dashConn = '';
	uiHandler.dashChat = '';

	uiHandler.shareDesktopStatus='unknown';

	// Handle error
	uiHandler.errorClass = '';
	uiHandler.errorMessage = '';

	$scope.global.setupI18N($scope,ngI18nResourceBundle,ngI18nConfig);

    //Controles de salao

	$scope.hideError = function() {
		$scope.global.hideError($scope);
	};

    window.onfocus = function() {
    	uiHandler.focused = true;
    };

    window.onblur = function() {
    	uiHandler.focused = false;
    };

    uiHandler.focused = true;

    $scope.configureRoom = function() {

        room.editShared($scope.global.roomId, uiHandler.access, function(rdo){
            $scope.global.access = angular.copy(uiHandler.access);
            rtc.updateOwnerData(uiHandler.roomId,uiHandler.name,uiHandler.avatar,uiHandler.status,uiHandler.access);
            if (uiHandler.enabledChat !==  uiHandler.access.chat) {
                chatService.alertChatStatus($scope,rdo.access.chat?'disabled':'enabled');
            }
            $scope.enableEditAccess();
        });
    };


    $scope.fireUser = function (index){
         var users = [];
         if (typeof(index) === 'string'){
            users.push(index);
         }else{
            users.push(uiHandler.users[index].connectionId);
         }

         var fUser  = function (){
              room.moveRoom(uiHandler.roomId,users,function(rdo){
                if (rdo.success) {
                    uiHandler.roomId = $scope.global.roomId = rdo.toRoomId;
                    $location.search('r',uiHandler.roomId);
                    uiHandler.screenurl = $scope.getScreenUrl();
                    rtc.moveRoom(uiHandler.roomId,rdo.fromRoomId,users);
                }
            });
         };

         uiHandler.safeApply ($scope,function (){
            if (!uiHandler.modals) { uiHandler.modals = []; }

            uiHandler.modals.push({'text': '<strong>' + $scope.getUserName(users[0]) + '</strong> ' + $scope.resourceBundle.fireuser,
                'yes': function (index){
                    uiHandler.safeApply ($scope,function(){
                        uiHandler.modals.splice(index,1);
                    });

                    fUser();
                },
                'no': function (index){
                    uiHandler.safeApply ($scope,function(){
                        uiHandler.modals.splice(index,1);
                    });

                },
                'class':'modalform editable',
                'done':false,
                'avatar': $scope.getUser(users[0]).avatar
            });
        });
    };

    $scope.sharePermanentUrl = function(value) {
    	uiHandler.sharePermanentUrl(value,this);
    };

    $scope.enableEditAccess = function() {
    	uiHandler.access = angular.copy($scope.global.access);
        uiHandler.editAccess = !uiHandler.editAccess;
        uiHandler.enabledChat =  uiHandler.access.chat;

        if (uiHandler.editAccess) {
        	uiHandler.editAccessClass = 'editable';
            setTimeout(function(){document.getElementById('chgacctitle').focus();},100);
        } else {
        	uiHandler.editAccessClass = '';
            setTimeout(function(){document.getElementById('chgacctitle').blur();},100);
        }
        return false;
    };

    $scope.roomLeave = function (clean){
        var leaveFn = function (){
            rtc.reset();
            $scope.global.roomId ='';
            $location.search('r',null);
            $location.path('/');
        };

        if (uiHandler.status==='DISCONNECTED') {
            leaveFn ();
        }else {
            uiHandler.safeApply ($scope,function (){
                if (!uiHandler.modals) { uiHandler.modals = []; }

                uiHandler.modals.push({'text': $scope.resourceBundle.errorleavetheroom,
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


    //control de media
	$scope.lastCharsUrl = function (url){
		return url.substring (url.length -10);
	};

	$scope.getScreenUrl = function() {
		return $location.$$protocol+ '://'+ $location.$$host + $scope.global.getUrlPort($location) + '/r/' + $scope.global.roomId;
	};

 	$scope.init = function (){
    	var rid = $location.search().r || $routeParams.roomId;

    	uiHandler.roomId = $scope.global.roomId = rid;
    	uiHandler.screenurl = $scope.getScreenUrl();

		// Show Timeout CountDown
		window.clearInterval($scope.global.countDownInterval);
		$scope.global.countDownInterval = window.setInterval(function(){
			var now      = new Date();
			var dueDate  = new Date($scope.global.roomDueDate);
            var hours    = Math.floor(Math.abs(dueDate - now) / 36e5);
            var days     = Math.floor( hours / 24 );
            var mins     = Math.floor((Math.abs(dueDate - now) - (hours * 36e5)) / 6e4);
            var secs     = Math.floor((Math.abs(dueDate - now) - (hours * 36e5) - (mins * 6e4)) / 1e3);
                hours    = ( hours % 24 );

            uiHandler.countDown = (days>9?days:'0'+days) + ' ' + $scope.resourceBundle.days + ' ' +  (hours>9?hours:'0'+hours)+ ' ' + $scope.resourceBundle.hours +' '+(mins>9?mins:'0'+mins)+ ' ' + $scope.resourceBundle.minutes + ' '+(secs>9?secs:'0'+secs)+ ' ' + $scope.resourceBundle.seconds;
			uiHandler.safeApply($scope,function(){});
		},1000);

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

		//look if who is selecting the room is valid
		room.isRoomAvailable(uiHandler.roomId, function(result){
			uiHandler.roomStatus = result.status;

            //Initialize userHandler options
            userHandler.init ($scope);

			if (uiHandler.roomStatus === 'inactive'){
				 	//$scope.global.sessionclosed=true;
				 	if (result.owner) {
				 		room.joinPass($scope.global.roomId,'',true);

                        var joinUsr = room.join($scope.global.roomId,function(results){
                        	uiHandler.roomStatus = 'active';
						 	$scope.global.sessionclosed=false;
						 	uiHandler.users = results.guests;
						 	uiHandler.name = results.owner.name;
						 	uiHandler.avatar = results.owner.avatar;
						 	uiHandler.hero = room.getHero(uiHandler.avatar);
						 	uiHandler.gravatar = results.owner.gravatar;
						 	uiHandler.status = results.status;
						 	uiHandler.access = results.access;
						 	uiHandler.gravatar = results.owner.gravatar;
						 	$scope.global.roomDueDate = results.dueDate;
					    	$scope.global.access = uiHandler.access;
					    	uiHandler.permanenturl = $location.$$protocol+ '://'+ $location.$$host + $scope.global.getUrlPort($location) + '/#!/r/' + uiHandler.access.permanentkey + '/claim';
                            $scope.global.name = uiHandler.name;
					    	$scope.global.avatar = uiHandler.avatar;
					    	$scope.global.gravatar = uiHandler.gravatar;
						 	rtc.updateOwnerData (uiHandler.roomId,uiHandler.name,uiHandler.avatar,uiHandler.status,uiHandler.access);
						 	room.notifyIn($scope);
		   					room.chat($scope.global.roomId,function(resu){
		   						uiHandler.chatPage = resu.page;
		   						chatService.init ($scope,resu.chat);
		                        if (window.innerWidth <= 800 ){
		                            $scope.toggleChat();
		                        }
		   					});
			            });

                        uiHandler.name = joinUsr.name;
                        uiHandler.avatar = joinUsr.avatar;
                        uiHandler.gravatar = joinUsr.gravatar;
                        uiHandler.hero = joinUsr.hero;
			            $scope.global.name = uiHandler.name;
			            $scope.global.gravatar = uiHandler.gravatar;

                        if (window.innerWidth <= 800 ){
                            $scope.toggleConnected();
                        }

				 	} else {
				 		// Probably is a viewer trying to use join url
				 		$location.path('r/'+$scope.global.roomId);
				 	}
   			} else {
   				// Owner trying to open multiple tabs not allowed
   				if (result.owner || !rtc._me) {
   					$location.path('r/'+$scope.global.roomId+'/owner');
   				} else {
   					room.notifyIn($scope);
   					room.chat($scope.global.roomId,function(results){
   						uiHandler.chatPage = results.page;
   						chatService.init ($scope,results.chat);
                        if (window.innerWidth <= 800 ){
                        	// Let user see welcome message
                            setTimeout(function(){
                            	$scope.toggleConnected();
                            	$scope.toggleChat();
                            },1800);
                        }
   					});
   				}
   			}

		},function (error){
			if (rtc._me) { $scope.roomLeave(true); }
			else {
				uiHandler.roomStatus = 'inactive';
				$scope.global.roomId ='';
				$scope.global.sessionclosed =true;
				$location.search('r',null);
		 		$location.path('/');
			}
		});


        fileService.init ($scope);
		windowHandler.init ($scope);
        mediaService.init ($scope,windowHandler);

        angular.element(document).ready(function () {
        	if (window.addthis && window.addthis.layers && window.addthis.layers.refresh) {
        		window.addthis.layers.refresh();
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
