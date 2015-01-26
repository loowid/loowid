angular.module('mean.rooms').controller('ViewDesktopController', ['$scope', '$routeParams', '$location', 'Global', 'Rooms', '$timeout','ngI18nResourceBundle','ngI18nConfig','$sce','FileService','ChatService','MediaService','WindowHandler','UserHandler','UIHandler',function ($scope, $routeParams, $location, Global, Rooms, $timeout,ngI18nResourceBundle, ngI18nConfig,$sce,FileService,ChatService,MediaService,WindowHandler,UserHandler,UIHandler){
	var uiHandler = UIHandler;
    $scope.global = Global;
    $scope.ui = uiHandler;

    uiHandler.userType = 'remote';
    
    uiHandler.connected_class = '';
    uiHandler.chat_class = '';
    uiHandler.helpchat_class = '';
    uiHandler.remote_screen_class ='';
    
    uiHandler.dash_conn = '';
    uiHandler.dash_chat = '';
	uiHandler.isowner = false;

    document.getElementById('noscript').style.display = 'none';
    
    // Handle error
    uiHandler.error_class = '';
    uiHandler.error_message = '';
    
    var room = new Rooms({});

    var userHandler = new UserHandler ();
    var fileService = new FileService ();    
    var chatService = new ChatService ();
    var mediaService = new MediaService();
    var windowHandler = new WindowHandler();

    
    uiHandler.supportedLocales = ngI18nConfig.supportedLocales;
    uiHandler.defaultLocale = ngI18nConfig.defaultLocale;
    uiHandler.basePath = ngI18nConfig.basePath;
    uiHandler.cache = ngI18nConfig.cache;
    ngI18nResourceBundle.get().success(function (resourceBundle) {
    $scope.resourceBundle = resourceBundle;
    });
 

    $scope.hideError = function() {
        $scope.global.hideError($scope);
    }
    
    uiHandler.focused = true;
    
    window.onfocus = function() {
    	uiHandler.focused = true;
    };
    
    window.onblur = function() {
    	uiHandler.focused = false;
    }

    $scope.$on('$locationChangeStart', function(obj, next, current) { 
    	if (next.indexOf('/join')>0) {
    		rtc.reset();
    	}
    });


    
    $scope.changeOwnerConnectionId = function (id) {
    	uiHandler.ownerConnectionId = id;
    }
  
   $scope.roomLeave = function (){
        
        var leaveFn = function (){
            if (!uiHandler.passNeeded && uiHandler.joinable) rtc.reset();
            $scope.global.roomId ='';
            $location.search('r',null);
            $location.path("/");
        }

        if (uiHandler.status=='DISCONNECTED' || !uiHandler.joinable){
            leaveFn ();
        }else {
            uiHandler.safeApply ($scope,function (){
                if (!uiHandler.modals) uiHandler.modals = [];

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
                            
                    },
                    "class":'modalform editable',
                    "done":false
                }); 
            });
        }
    };
    
    $scope.addPassword = function() {
        if (!uiHandler.roomPassword) return;
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
    	uiHandler.currentConnectionId = rtc._me;
        //Be aware when a remote stream is added
        rtc.peerListUpdated($scope.global.roomId);
        uiHandler.passNeeded = false;
        uiHandler.connectionError = false;
        uiHandler.access = results.access;
		room.chat($scope.global.roomId,function(resu){
			uiHandler.chatPage = resu.page;
			chatService.init ($scope,resu.chat);
            if (window.innerWidth <= 800 ){
                $scope.toggleChat();
            }
		});
        // Set my own name
        for (var i=0; i<results.guests.length; i++) {
            if (results.guests[i].connectionId === rtc._me) {
            	uiHandler.name = results.guests[i].name;
            	uiHandler.avatar = results.guests[i].avatar;
            }
        }
        
    };
    
   
    
    $scope.init = function (){
        if ($routeParams.accessKey){
            uiHandler.roomPassword=$routeParams.accessKey
            uiHandler.passNeeded = false;
            uiHandler.connectionError = false;
            uiHandler.sendingPwd = false;
            room.joinPass($scope.global.roomId,uiHandler.roomPassword,true);
        }
        
        if (!uiHandler.roomPassword) rtc.reset();
    	var rid = $location.search().r;
    	if (!rid) rid = $scope.global.roomId?$scope.global.roomId:$routeParams.roomId;
        var roomId = $scope.global.roomId = rid;
        
        $scope.global.roomId = uiHandler.roomId = roomId;
        $scope.isowner = false;
        $scope.isRoomJoinable();

        // Keep Session with auto request every 15 min
		window.clearInterval($scope.global.keepInterval);
		$scope.global.keepInterval = window.setInterval(function(){
			room.keepSession(function(){},function(){});
		},900000);

		// Reload if is a permanent room
		window.clearInterval($scope.global.reloadInterval);
		$scope.global.reloadInterval = window.setInterval(function(){
			if (uiHandler.joinable==false && uiHandler.locked==false && uiHandler.permanent) {
				window.location.reload();
			}
		},30000);

        if ($scope.isValidBrowser()) { 
            //When this method is triggered is possible that we didn't know anything about the room 
            //We must wait until data is ready
            userHandler.init ($scope);
           	windowHandler.init ($scope);
			mediaService.init($scope,windowHandler);

            if (window.innerWidth <= 800 ){
                $scope.toogleConnected();
            }

        }else{
            $location.path("/");
        }

        rtc.on ('password_failed', function(data) {
        	uiHandler.sendingPwd = false;
        	uiHandler.passNeeded = true;
        	uiHandler.connectionError = true;
        	$scope.$apply();
            // Close socket and listeners
            rtc._socket.close();
            delete rtc._events['get_peers'];
            delete rtc._events['receive_ice_candidate'];
            delete rtc._events['new_peer_connected'];
            delete rtc._events['remove_peer_connected'];
            delete rtc._events['receive_offer'];
            delete rtc._events['receive_answer'];
        });

        
        //This function is a bit room bit user we declare it two times
        rtc.on ('owner_data_updated',function(data){
       		uiHandler.status = data.status;
    		uiHandler.access = data.access;
            var chatModified = (uiHandler.chatstatus != undefined && uiHandler.chatstatus != data.access.chat); 
            uiHandler.chatstatus = data.access.chat;
            
            if (chatModified) {
                chatService.alertChatStatus($scope,data.access.chat== true ?'enabled':'disabled');
            }
            $scope.$apply();
        });

        fileService.init ($scope);

        rtc.on('room_moved',function(data){
        	rtc.room = uiHandler.roomId =$scope.global.roomId = data.room;
           $location.search('r',data.room);
        });

        rtc.on('room_out',function(data){
        	
            uiHandler.safeApply ($scope,function (){
                if (!uiHandler.modals) uiHandler.modals = [];

                uiHandler.modals.push({'text': $scope.resourceBundle.youarefired,
                    'ok': function (index){
                        uiHandler.safeApply ($scope,function(){
                            uiHandler.modals.splice(index,1);
                        });
                        
                       uiHandler.status = 'DISCONNECTED';
                      $scope.roomLeave();
                    },
                    "class":'modalform editable',
                    "done":false
                }); 
            });
        });
    
          if ($scope.isValidBrowser()) { 
            //When this method is triggered is possible that we didn't know anything about the room 
          
            var joinUsr = room.join(roomId,$scope.joinResult);
            
            uiHandler.name = joinUsr.name;
            uiHandler.avatar = joinUsr.avatar;
            uiHandler.gravatar = joinUsr.gravatar;
            uiHandler.access = joinUsr.access;

            
            $scope.global.name = uiHandler.name;
            $scope.global.gravatar = uiHandler.gravatar;
          

        }else{
            $location.path("/");
        }

    };

    $scope.isValidBrowser = function(){
       return $scope.global.isValidReceiver();
    };


    $scope.isRoomJoinable = function (){
        room.isRoomJoinable ($scope.global.roomId,function(result){
        	uiHandler.joinable = result.joinable;
        	uiHandler.locked = result.locked;
        	uiHandler.permanent = result.permanent;
            if (result.joinable) {
            	uiHandler.passNeeded = result.private;
                if (!result.private) {
                	room.joinPass($scope.global.roomId,'',true);
                }
            }
        },function (err){
        	$scope.global.roomId ='';
        	uiHandler.joinable = false;
            $location.path("/");
        });
    };


    
}]).config(function($sceProvider) {
    $sceProvider.enabled(true);
}).directive('ngEscape', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
        });
    };
});
