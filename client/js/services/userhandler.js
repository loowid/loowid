'use strict';
/*global rtc: true */
angular.module('mean.rooms').factory('UserHandler',['Rooms','UIHandler','Notification',function(Rooms,UIHandler,Notification){
	return function (){

		var room = new Rooms({});
		var uiHandler = UIHandler;

		var createUserStatus = function (user){
			user.connectionStatus = {
				'audio': {'in': 'none', 'out':'none'},
				'video': {'in': 'none', 'out':'none'},
				'screen': {'in': 'none', 'out':'none'}
			};

		};

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

			createUserStatus (uiHandler);

			uiHandler.getMiniClass = function(cl) {
				// Calculate connected users
				var cnt = 0;
				for (var n=0; n<this.users.length; n+=1) {
					if (this.users[n].status === 'CONNECTED') {
						cnt += 1;
					}
				}
				var addMini = '';
				var element = document.getElementById('connected');
				if (element.scrollHeight > element.clientHeight) {
					element.setAttribute('data-members',cnt);
					addMini = ' mini';
				} else {
					var dm = parseInt(element.getAttribute('data-members') || '0');
					if (dm===0 || cnt<dm) {
						element.setAttribute('data-members',0);
					} else {
						addMini = ' mini';
					}
				}
				return cl + addMini;
			};

			$scope.changeName = function() {
		        if (!$scope.editNameForm.$valid) {
		        	uiHandler.tmpName = $scope.global.name;
		        	uiHandler.tmpHero = 'img/'+uiHandler.hero+'.jpg';
		        	uiHandler.gravatar = $scope.global.gravatar;
		        	return;
		        }
		        uiHandler.name = uiHandler.tmpName;
		        uiHandler.hero = room.getHero(uiHandler.tmpHero);
		        if (uiHandler.isowner){
					room.editOwnerName($scope.global.roomId, uiHandler.name, uiHandler.gravatar, uiHandler.hero, function(rdo){
			            $scope.global.name = uiHandler.name;
			            $scope.global.gravatar = uiHandler.gravatar;
			            $scope.enableEditName();
			            uiHandler.avatar = rdo.owner.avatar;
			            $scope.global.avatar = uiHandler.avatar;
			            uiHandler.hero = room.getHero(uiHandler.avatar,uiHandler.hero);
			            rtc.peerListUpdated(uiHandler.roomId);
			            rtc.updateOwnerData (uiHandler.roomId,uiHandler.name,uiHandler.avatar,uiHandler.status,uiHandler.access);
		        	});
		        }else{
		        	room.editGuestName($scope.global.roomId, uiHandler.name, uiHandler.gravatar, uiHandler.hero, function(rdo){
            			$scope.global.name = uiHandler.name;
            			$scope.global.gravatar = uiHandler.gravatar;
            			$scope.enableEditName();
			            var cid = room.getConnectionId();
			            for (var i=0; i<rdo.guests.length; i+=1) {
			                if (rdo.guests[i].connectionId === cid) {
			                	uiHandler.avatar = rdo.guests[i].avatar;
			                	uiHandler.hero = room.getHero(uiHandler.avatar,uiHandler.hero);
			                }
			            }
			            rtc.peerListUpdated($scope.global.roomId);
        			});
		        }
		    };

		    $scope.enableEditName = function() {
  				if (!uiHandler.isowner && uiHandler.passNeeded) { return; }
		        uiHandler.tmpName = uiHandler.name;
		        uiHandler.tmpHero = 'img/'+uiHandler.hero+'.jpg';
		        uiHandler.gravatar = $scope.global.gravatar;
		        uiHandler.editName = !uiHandler.editName;
		        if (uiHandler.editName) {
		        	uiHandler.editNameClass = 'editable';
		            setTimeout(function(){document.getElementById('chgname').focus();},100);
		        } else {
		        	uiHandler.editNameClass = '';
		            setTimeout(function(){document.getElementById('chgname').blur();},100);
		        }
		        return false;
		    };

		    $scope.connectedUsers = function() {
		        var cnt = 0;
		        if (uiHandler.users) {
		            for (var i = 0; i < uiHandler.users.length; i+=1){
		                if (uiHandler.users[i].status === 'CONNECTED'){
		                    cnt+=1;
		                }
		            }
		        }
		        return cnt;
	    	};

	    	var getNewUsersFromResult = function(result) {
	            for (var i=0; i<result.length; i+=1) {
	                var exists = false;
	                for (var j=0; j<uiHandler.users.length; j+=1) {
	                    if (uiHandler.users[j].connectionId === result[i].connectionId) {
	                        exists = true;
													uiHandler.users[j].name = result[i].name;
	                        uiHandler.users[j].avatar = result[i].avatar;
	                        if (uiHandler.users[j].status !== result[i].status) {
	                        	uiHandler.newusers.unshift(result[i]);
	                        }
	                        uiHandler.users[j].status = result[i].status;
	                        $scope.changeWindowName(result[i].connectionId,result[i].name);
	                    }
	                }
	                if (!exists) {
										createUserStatus (result[i]);
										uiHandler.users.push(result[i]);
	                	uiHandler.newusers.unshift(result[i]);
	                    $scope.changeWindowName(result[i].connectionId,result[i].name);
	                }
	            }
	    	};

	    	var removeOldUsers = function(result) {
	            for (var j2=0; j2<uiHandler.users.length; j2+=1) {
	            	var exists2 = false;
	            	for (var i2=0; i2<result.length; i2+=1) {
	            		if (uiHandler.users[j2].connectionId === result[i2].connectionId) {
	            			exists2 = true;
	            		}
	            	}
	            	if (!exists2) {
	            		uiHandler.users.splice(j2,1);
	            	}
	            }
	    	};

	    	var raiseHtml5Notification = function() {
	        	var bd = '';
	        	for (var u=0; u<uiHandler.newusers.length; u+=1) {
	        		bd = uiHandler.newusers[u].name + ' ' + (uiHandler.newusers[u].status === 'CONNECTED'?'(+)':'(-)');
	        	}
	        	if (bd !== '') {
	       		    var notification = new Notification($scope.resourceBundle.usertypeviewer, {
       		            body: bd,
       		            icon: uiHandler.newusers.length>1?'img/icons/favicon.ico':uiHandler.newusers[0].avatar,
       		            delay: 3000
	       		    });
	       	        notification.$on('click', function () {
	       	        	if (!uiHandler.focused) { window.focus(); }
	       	        	if (uiHandler.connectedClass!=='') { $scope.toggleConnected(); }
	       	        });
	        	}
	    	};

	    	var raiseAudioNotification = function() {
   				// Doit traditional
        		if (!uiHandler.focused && uiHandler.audible) {
	        		var readText = $scope.resourceBundle.onlinenews;
	        		if (uiHandler.newusers.length===1) {
	        			readText = (uiHandler.newusers[0].status === 'CONNECTED')?$scope.resourceBundle._('joinroom',uiHandler.newusers[0].name):$scope.resourceBundle._('uleaveroom',uiHandler.newusers[0].name);
	        		}
	        		$scope.global.speechText($scope,readText);
        		} else {
   					uiHandler.connNew = 'connected_now';
   					setTimeout(function(){ uiHandler.connNew = ''; uiHandler.safeApply($scope,function(){}); },3000);
   				}
	    	};

	    	$scope.updateUsers = function(result) {
	    		uiHandler.newusers = [];
		        if (uiHandler.users) {
		        	getNewUsersFromResult(result);
		        	removeOldUsers(result);
		        } else {
		            // If no users no windows
		        	uiHandler.newusers = result;
		        	uiHandler.users = result;
		        }
		        if (uiHandler.connectedClass!=='' || !uiHandler.focused) {
		        	if (uiHandler.notificationReady) {
		        		raiseHtml5Notification();
		        	} else {
		        		raiseAudioNotification();
		        	}
		        }
		        //uiHandler.users = result;
		    };

		    $scope.isOwner = function (id) {
    			return (id === uiHandler.ownerConnectionId) || ($scope.global.own === id);
    		};

    		var findUser = function(connectionId) {
		        if (uiHandler.users) {
		            for (var i = 0; i < uiHandler.users.length; i+=1){
		                if (uiHandler.users[i].connectionId === connectionId){
		                    return uiHandler.users[i];
		                }
		            }
		        }
		        return null;
    		};

				rtc.uniqueon ('connection changed',function (data){
							var user = $scope.getUser(data.userid);
							if (user){
									if (!user.connectionStatus) {
										createUserStatus(user);
									}
									var direction = data.produced ? 'out': 'in';
									user.connectionStatus[data.mediatype][direction] = data.state;
							}
				});

    		$scope.getUser = function (connectionId) {
		        if (connectionId === $scope.global.bot) { return {name:'loowid',avatar:'img/icons/favicon.ico'}; }
		        if (rtc._me === connectionId || (connectionId === $scope.global.own && uiHandler.isowner)) { return $scope.ui; }
		        if (!uiHandler.isowner && $scope.isOwner(connectionId)) { return {avatar:uiHandler.ownerAvatar,name:uiHandler.ownerName,connectionStatus: uiHandler.connectionStatus}; }
	        	return findUser(connectionId);
	  	 	};

	  		$scope.toggleConnected = function() {
	  			uiHandler.connectedClass=(uiHandler.connectedClass==='collapsed')?'':'collapsed';
	  			uiHandler.dashConn=(uiHandler.connectedClass==='collapsed')?'connected_collapsed':'';
	  		};

	    	$scope.getUserName = function (connectionId){
	    		if (uiHandler.isowner && rtc._me === connectionId){
	    			return uiHandler.name;
	    		}else if (!uiHandler.isowner && $scope.isOwner(connectionId)){
		            return uiHandler.ownerName;
		        }else{
		            var name = 'unkown user';

		            for (var i = 0; i < uiHandler.users.length; i+=1){
		                if (uiHandler.users[i].connectionId === connectionId){
		                    name = uiHandler.users[i].name;
		                    continue;
		                }
		            }
		            return name;
		        }
	    	};
	    	rtc.on ('owner_data_updated',function(data){
	    		uiHandler.ownerName = data.ownerName;
	    		uiHandler.ownerAvatar = data.ownerAvatar;
                $scope.changeOwnerConnectionId(data.ownerCid);
                $scope.changeWindowName(uiHandler.ownerConnectionId,uiHandler.ownerName);
                uiHandler.safeApply($scope,function(){});
            });

	    	var peerListUpdated = 'peer_list_updated';
	    	if (rtc._events[peerListUpdated]) {
				setTimeout(function(){ rtc.fire('peer_list_updated'); },100);
			}

	        rtc.uniqueon('peer_list_updated',function (){
				//We should wait for a few to ensure the record is stored in the db
				room.users (uiHandler.roomId,$scope.updateUsers);
			});


    	};
	};
}]);
