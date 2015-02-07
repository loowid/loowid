'use strict';
angular.module('mean.rooms').controller('RoomsController', ['$scope', '$routeParams', '$location', 'Global', 'Rooms','$timeout', 'ngI18nResourceBundle','ngI18nConfig','$document','UIHandler', function ($scope, $routeParams, $location, Global, Rooms, $timeout,ngI18nResourceBundle, ngI18nConfig, $document, UIHandler) {
	
	var uiHandler = UIHandler;
	$scope.ui = uiHandler;
    $scope.global = Global;
    $scope.ui.question = 'none';

    document.getElementById('noscript').style.display = 'none';
    
    var room = new Rooms({});
    
    uiHandler.supportedLocales = ngI18nConfig.supportedLocales;
    uiHandler.defaultLocale = ngI18nConfig.defaultLocale;
    uiHandler.basePath = ngI18nConfig.basePath;
    uiHandler.cache = ngI18nConfig.cache;
    uiHandler.step = 1;

    ngI18nResourceBundle.get().success(function (resourceBundle) {
            $scope.resourceBundle = resourceBundle;
            $scope.resourceBundle._ = $scope.global._;
    });
    uiHandler.liveRooms = [];
    uiHandler.liveRoomsCurrent = 0;
    $scope.gotoRoom = function(id) {
    	$location.path('r/' + id);
    };
    
    $scope.create = function() {
		if ($scope.termsaccepted || $scope.isRoomAvailable()){

		  document.getElementById('noscript').style.display = '';
		  $scope.global.sessionclosed = false;
		  if ($scope.isRoomAvailable()) {
			   $location.path('r/' + $scope.global.roomId + '/join');   
		  }else {
			   uiHandler.creating=true;
			   room.create(uiHandler.name,function(id,gav,av,acc,dueDate){
				   $scope.global.roomId = id;
				   $scope.global.name = uiHandler.name;
				   $scope.global.avatar = av;
				   $scope.global.access = acc;
				   $scope.global.gravatar = gav;
				   $scope.global.roomDueDate = dueDate; 
			       uiHandler.permanenturl = $location.$$protocol+ '://'+ $location.$$host +  '/#!/r/' + $scope.global.access.permanentkey + '/claim';
				   $location.path('r/' + id + '/join');
			   });
		   }
		}else{
			$scope.termsnotaccepted = true;
		}
    };

	$scope.clickterms = function ($event){
		var checkbox = $event.target;
		$scope.termsnotaccepted =  !checkbox.checked;
	};

	$scope.setupExternal = function (){
      $scope.global.roomId = uiHandler.roomId =  $routeParams.roomId;
      document.getElementById('noscript').style.display = '';
      $scope.global.sessionclosed = false;
       
	   room.claimforroom ($scope.global.roomId,function(rdo){
           uiHandler.creating=true;
           $scope.global.name = uiHandler.name;
       	   $scope.global.roomId = uiHandler.roomId = rdo.id;
	       $location.path(rdo.url);
	   },function() {
		   // Error claiming room
		   $scope.global.roomId = uiHandler.roomId =  '';
		   $location.path('/');
	   });

   };

   uiHandler.name = room.rememberUser();

   $scope.resetName = function() {
	   room.resetName();
	   uiHandler.name = room.rememberUser();
   };
   
   $scope.join = function() {
       var roomId = $scope.global.roomId;
       var po = ($location.$$port===80 || $location.$$port===443)?'':':'+$location.$$port;
       uiHandler.screenurl = $location.$$protocol+ '://'+ $location.$$host + po + '/#!/r/' + roomId;
       $location.path('r/' +roomId + '/join');
   };

   $scope.isRoomAvailable = function() {
	   return $scope.global.roomId && $scope.global.roomId.length>0;
   };

   $scope.isValidBrowser = function() {
	   return $scope.global.isValidSender();
   };

   $scope.isSessionClosed = function (){
      var sessionclosed =  $scope.global.sessionclosed ? true : false;
      return sessionclosed;
   };

   $scope.init = function(){
   };


}]);
