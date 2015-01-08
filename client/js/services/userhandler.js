angular.module('mean.rooms').factory("UserHandler",['Rooms','UIHandler',function(Rooms,UIHandler){
	return function (){

		var room = new Rooms({});
		var uiHandler = UIHandler;

		this.init = function ($scope){

			/* Set owner status*/
			uiHandler.userStatus = [];
			uiHandler.users = [];
			uiHandler.name = $scope.global.name;
			uiHandler.avatar = $scope.global.avatar;
			uiHandler.gravatar = $scope.global.gravatar;
			uiHandler.editName = false;
			uiHandler.editNameClass = '';
			uiHandler.status = uiHandler.isowner?'OPENED':'DISCONNECTED';
			uiHandler.access = angular.copy($scope.global.access);
		

			$scope.changeName = function() {
		        if (!uiHandler.name) { uiHandler.name = $scope.global.name; return; }
		        if (uiHandler.isowner){
					room.editOwnerName($scope.global.roomId, uiHandler.name, uiHandler.gravatar, function(rdo){
			            $scope.global.name = uiHandler.name;
			            $scope.enableEditName();
			            uiHandler.avatar = rdo.owner.avatar;
			            $scope.global.avatar = uiHandler.avatar;
			            
			            rtc.peerListUpdated(uiHandler.roomId);
			            rtc.updateOwnerData (uiHandler.roomId,uiHandler.name,uiHandler.avatar,uiHandler.status,uiHandler.access);
		        	});
		        }else{
		        	room.editGuestName($scope.global.roomId, uiHandler.name, uiHandler.gravatar, function(rdo){
            			$scope.global.name = uiHandler.name;
            			$scope.enableEditName();
			            var cid = room.getConnectionId();
			            for (var i=0; i<rdo.guests.length; i++) {
			                if (rdo.guests[i].connectionId == cid) {
			                	uiHandler.avatar = rdo.guests[i].avatar;
			                }
			            }
			            rtc.peerListUpdated($scope.global.roomId);
        			})
		        }
		    };

		    $scope.enableEditName = function() {
  				if (!uiHandler.isowner && uiHandler.passNeeded) return;
        
		        if (!uiHandler.name) { uiHandler.name = $scope.global.name; return; }
		        uiHandler.editName = !uiHandler.editName;
		        if (uiHandler.editName) {
		        	uiHandler.editNameClass = 'editable';
		            setTimeout('document.getElementById("chgname").focus();',100);
		        } else {
		        	uiHandler.editNameClass = '';
		            setTimeout('document.getElementById("chgname").blur();',100);
		        }
		        return false;
		    }

		    $scope.connectedUsers = function() {
		        var cnt = 0;
		        if (uiHandler.users) {
		            for (var i = 0; i < uiHandler.users.length; i++){
		                if (uiHandler.users[i].status == 'CONNECTED'){
		                    cnt++;
		                }
		            }
		        }
		        return cnt;
	    	};

	    	$scope.updateUsers = function(result) {
	    		uiHandler.newusers = [];
		        if (uiHandler.users) {
		            for (var i=0; i<result.length; i++) {
		                var exists = false;
		                for (var j=0; j<uiHandler.users.length; j++) {
		                    if (uiHandler.users[j].connectionId == result[i].connectionId) {
		                        exists = true;
		                        uiHandler.users[j].name = result[i].name;
		                        uiHandler.users[j].avatar = result[i].avatar;
		                        uiHandler.users[j].status = result[i].status;
		                        $scope.changeWindowName(result[i].connectionId,result[i].name);
		                    }
		                }
		                if (!exists) {
		                	uiHandler.users.push(result[i]);
		                	uiHandler.newusers.unshift(result[i]);
		                    $scope.changeWindowName(result[i].connectionId,result[i].name);
		                }
		            }
		            for (var j=0; j<uiHandler.users.length; j++) {
		            	var exists = false;
		            	for (var i=0; i<result.length; i++) {
		            		if (uiHandler.users[j].connectionId == result[i].connectionId) {
		            			exists = true;
		            		}
		            	}
		            	if (!exists) {
		            		uiHandler.users.slice(j,1);
		            	}
		            }
		        } else {
		            // If no users no windows
		        	uiHandler.newusers = result;
		        	uiHandler.users = result;
		        }
		        if (uiHandler.connected_class!='') {
		        	uiHandler.conn_new = 'connected_now';
		            setTimeout(function(){ uiHandler.conn_new = ''; uiHandler.safeApply($scope,function(){}); },3000);
		        }
		        //uiHandler.users = result;
		    };
		    
		    $scope.isOwner = function (id) {
    			return (id === uiHandler.ownerConnectionId) || ($scope.global.own === id);
    		}

    		$scope.getUser = function (connectionId){
		        if (connectionId == $scope.global.bot) return {name:'loowid',avatar:'img/icons/favicon.ico'};
		        if (rtc._me == connectionId || (connectionId == $scope.global.own && uiHandler.isowner)) return $scope.ui; 
		        if (!uiHandler.isowner && $scope.isOwner(connectionId)) return {avatar:uiHandler.ownerAvatar,name:uiHandler.ownerName};
		        if (uiHandler.users) {
		            for (var i = 0; i < uiHandler.users.length; i++){
		                if (uiHandler.users[i].connectionId == connectionId){
		                    return uiHandler.users[i];
		                }
		            }
		        }
	        	return null;
	  	 	};

	    	$scope.getUserName = function (connectionId){
	    		if (uiHandler.isowner && rtc._me == connectionId){
	    			return uiHandler.name;
	    		}else if (!uiHandler.isowner && $scope.isOwner(connectionId)){
		            return uiHandler.ownerName
		        }else{
		            var name = 'unkown user';
		       
		            for (var i = 0; i < uiHandler.users.length; i++){
		                if (uiHandler.users[i].connectionId == connectionId){
		                    name = uiHandler.users[i].name;
		                    continue; 
		                }
		            }
		        }
		        return name;
	    	};

	    	rtc.on ('owner_data_updated',function(data){
	    		uiHandler.ownerName = data.ownerName;
	    		uiHandler.ownerAvatar = data.ownerAvatar;
                $scope.changeOwnerConnectionId(data.ownerCid);
                $scope.changeWindowName(uiHandler.ownerConnectionId,uiHandler.ownerName);
                uiHandler.safeApply($scope,function(){});
            });


	    	if (rtc._events['peer_list_updated']) {
				setTimeout(function(){ rtc.fire('peer_list_updated'); },100);
			}
			
	        rtc.uniqueon('peer_list_updated',function (){
				//We should wait for a few to ensure the record is stored in the db
				room.users (uiHandler.roomId,$scope.updateUsers);
			});

			
    	};
	};
}]);