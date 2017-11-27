'use strict';
//SERVER
/*global unescape: true */
var WebSocketServer = require('ws').Server,
signature = require( 'cookie-signature' ),prefix = 's:',
crypto = require('crypto'),
_ = require('underscore');

//Create a service definition for externar servers list
var logger = require('./log.js').getLog('webrtc.io');

// Used for callback publish and subscribe
//if (typeof rtc === 'undefined') {
  var rtc = {};
//}
//Array to store connections
rtc.sockets = [];

rtc.rooms = {};
rtc.statusList = {};

rtc.prerooms = {};

// Holds callbacks for certain events.
rtc._events = {};

rtc.on = function(eventName, callback) {
  rtc._events[eventName] = rtc._events[eventName] || [];
  rtc._events[eventName].push(callback);
};

rtc.iceSERVERS = function() {
    return {
      'iceServers': [
    	{url:'stun:stun.l.google.com:19302'},
  		{url:'stun:stun1.l.google.com:19302'},
  		{url:'stun:stun2.l.google.com:19302'},
  		{url:'stun:stun3.l.google.com:19302'},
  		{url:'stun:stun4.l.google.com:19302'}
  	  ]
    };
};



rtc.fire = function(eventName, _) {
  var events = rtc._events[eventName];
  var args = Array.prototype.slice.call(arguments, 1);

  if (!events) {
    return;
  }

  for (var i = 0, len = events.length; i < len; i+=1) {
    events[i].apply(null, args);
  }
};

function getSocketUrl(req) {
	var u = req.url.replace(/^\s+|\s+$/g, '');
	return (u==='' || u.length===1)?null:u.substring(1);
}

function getSessionId(req,secret) {
    var list = {}, rc = req.headers.cookie;
    if (rc) {
    	rc.split(';').forEach(function( cookie ) {
    		var parts = cookie.split('=');
    		list[parts.shift().trim()] = unescape(parts.join('='));
    	});
    }
    return (list.jsessionid && secret)?signature.unsign(list.jsessionid.replace(prefix,''),secret):getSocketUrl(req);
}

//generate a 4 digit hex code randomly
function S4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

// make a REALLY COMPLICATED AND RANDOM id, kudos to dennis
function id() {
  return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
}

var errorFn = function(error) { if (error) { logger.error(error); } };

var sendNewPeerConnected = function(socket,roomList) {
	var connectionsId = [];
	for (var i = 0; i < roomList.length; i+=1) {
	  var id = roomList[i];

	  if (id === socket.id) {
	    continue;
	  } else {
	    connectionsId.push(id);
	    var soc = rtc.getSocket(id);
	    // inform the peers that they have a new peer
	    if (soc) {
	      soc.send(JSON.stringify({
	        'eventName': 'new_peer_connected',
	        'data':{
	          'socketId': socket.id
	        }
	      }), errorFn);
	    }
	  }
	}
	return connectionsId;
};

function attachEvents(manager) {

  manager.on('connection', function(socket) {
    logger.debug('connect.'+manager.serverId);

	socket.sessionid = getSessionId(socket.upgradeReq,manager.sessionSecret);
    socket.id = id();
    logger.debug('new socket got id: ' + socket.id);

    rtc.sockets.push(socket);

    socket.on('message', function(msg) {
      try {
	      var json = JSON.parse(msg);
	      manager.rooms.realRoomId(json.data.room,socket.sessionid,function(realRoom){
	    	  json.data.room = realRoom;
	          rtc.fire(json.eventName, json.data, socket);
	      });
      } catch (err) {
    	  logger.error(err);
      }
    });

    socket.on('close', function() {
    	logger.debug('close');

      // find socket to remove
      var i = rtc.sockets.indexOf(socket);
      // remove socket
	  rtc.sockets.splice(i, 1);
      // remove from rooms and send remove_peer_connected to all sockets in room
      var room;

      for (var key in rtc.rooms) {
		  if (rtc.rooms.hasOwnProperty(key)) {
			room = rtc.rooms[key];
			var exist = room?room.indexOf(socket.id):-1;
			if (exist !== -1) {
			  room.splice(room.indexOf(socket.id), 1);
			  for (var j = 0; j < room.length; j+=1) {
				var soc = rtc.getSocket(room[j]);
				if (soc) { // This check is missing (bug)
					soc.send(JSON.stringify({
					  'eventName': 'remove_peer_connected',
					  'data': {
						'socketId': socket.id
					  }
					}), errorFn);
				}
			  }
			  room = key; // This line is missing (bug)
			  break;
			}
		  }
      }
      // we are leaved the room so lets notify about that
	  rtc.fire('room_leave', room, socket);
      // call the disconnect callback
	  rtc.fire('disconnect', rtc);

    });
    // call the connect callback
    rtc.fire('connect', rtc);
  });

  // manages the built-in room functionality
  rtc.on('join_room', function(dataa, socketa) {
	manager.rooms.checkLockOrPassword(dataa, socketa, function(data,socket) {
		var roomList = rtc.rooms[data.room] || [];
		var roomStatus = rtc.statusList [data.room] || {};
		rtc.statusList[data.room] = roomStatus;

		if (socket._events) {
			roomList.push(socket.id);
			rtc.rooms[data.room] = roomList;
			// Mark as valid
			manager.rooms.markValid(data.room,socket.sessionid);
		}

		var connectionsId = sendNewPeerConnected(socket,roomList);

		if (socket._events) {
			// send new peer a list of all prior peers
			socket.send(JSON.stringify({
			  'eventName': 'get_peers',
			  'data': {
			    'connections': connectionsId,
			    'you': socket.id
			  }
			}), errorFn);
		} else {
			if (connectionsId.length>0) {
				manager.wsevents.addEvent(manager.serverId,'add_peers',{'room':data.room,'connections':connectionsId},socket);
			}
		}
	},function(lock) {
		socketa.send(JSON.stringify({
			'eventName' : (lock?'room_locked':'password_failed'),
			'data' : {
				'password' : dataa.pwd,
				'room' : dataa.room
			}
		}), errorFn);
	});
  });

 //We receives a request to get a STUN/TURN server list updated
 rtc.on ('update_server_config', function (data,socket){

   var setICEConfig = function (iceconfig) {
     var iceServers;

     if (iceconfig) { //If there is a COTurn Add it to the list
       var coturn = {
         'credential': iceconfig.password,
         'host': process.env.COTURN_SERVER ,
         'protocol': 'turn',
         'url': 'turn:' + process.env.COTURN_SERVER,
         'username': iceconfig.username
       };

       iceServers = rtc.iceSERVERS().iceServers;

       if (process.env.COTURN_EXCLUSIVE) {
         iceServers = [coturn];
         logger.debug('Returning COTURN ice server in exclusive mode.');
       } else {
         logger.debug('Returning COTURN ice server in additon to the default list');
         iceServers.push (coturn);
       }

     } else {
       iceServers = rtc.iceSERVERS().iceServers;
       logger.debug('Returning default ice servers.');
     }

     //Send the correct list
     var cextid = process.env.CEXTID || 'ocegbggnlgopmchofgnbjhgpljlchlpl';

     socket.send (JSON.stringify ({
       'eventName':'get_updated_config',
       'data':{
         'iceServers': iceServers,
         'chromeDesktopExtensionId' : cextid
       }
     }), errorFn);
   };

   //Look for the coturn server environment variables. If set then try to generate a config.
   if (process.env.COTURN_AUTH_SECRET && process.env.COTURN_AUTH_USERNAME && process.env.COTURN_SERVER) {

     var hours = process.env.COTURN_AUTH_HOURS || 24;
     var unixTimeStamp = parseInt(Date.now()/1000) + parseInt(hours) * 3600,   // this credential would be valid for the next 24 hours
     username = [unixTimeStamp, process.env.COTURN_AUTH_USERNAME].join(':'),
     password,
     hmac = crypto.createHmac('sha1', process.env.COTURN_AUTH_SECRET);
     hmac.setEncoding('base64');
     hmac.write(username);
     hmac.end();
     password = hmac.read();

     setICEConfig ({
       username: username,
       password: password
     });

   } else {
     setICEConfig();
   }

 });

  //Receive ICE candidates and send to the correct socket
  rtc.on('send_ice_candidate', function(data, socket) {
	  logger.debug('send_ice_candidate');
    var soc = rtc.getSocket(data.socketId);
    if (soc) {
      soc.send(JSON.stringify({
        'eventName': 'receive_ice_candidate',
        'data': {
          'label': data.label,
          'candidate': data.candidate,
          'socketId': socket.id,
          'mediatype': data.mediatype,
          'produced': data.produced
        }
      }), errorFn);
      // call the 'recieve ICE candidate' callback
      rtc.fire('receive ice candidate', rtc);
    }
  });

  //Receive offer and send to correct socket
  rtc.on('send_offer', function(data, socket) {
		manager.rooms.checkModerateOwnerOrAsked(socket.id,data.room,data.mediatype,function(){
			logger.debug('send_offer');
		    var soc = rtc.getSocket(data.socketId);
		    if (soc) {
		      soc.send(JSON.stringify({
		        'eventName': 'receive_offer',
		        'data': {
		          'sdp': data.sdp,
		          'socketId': socket.id,
		          'mediatype': data.mediatype,
		          'requestId': data.requestId,
		          'token': data.token
		      }
		      }), errorFn);
		    }
		    // call the 'send offer' callback
		    rtc.fire('send offer', rtc);
		},function(){
			logger.error('Alert: trying to sending offer without permissions');
		});
  });

  //Receive answer and send to correct socket
  rtc.on('send_answer', function(data, socket) {
	logger.debug('send_answer');
    var soc = rtc.getSocket( data.socketId);
    if (soc) {
      soc.send(JSON.stringify({
        'eventName': 'receive_answer',
        'data' : {
          'sdp': data.sdp,
          'socketId': socket.id,
          'mediatype': data.mediatype
        }
      }), errorFn);
      rtc.fire('send answer', rtc);
    }
  });

  //Extend webrtc server with new event peer_list_updated
  rtc.on('peer_list_updated', function(data, socket) {
  	var roomList = rtc.rooms[data.room] || [];
  	for ( var i = 0; i < roomList.length; i+=1) {
  		var id = roomList[i];
  		if (id === socket.id) {
  			continue;
  		} else {
  			var soc = rtc.getSocket(id);
  			// inform the peers that they have a chage on peer list
  			if (soc) {
  				soc.send(JSON.stringify({
  					'eventName' : 'peer_list_updated',
  					'data' : {
  						'socketId' : socket.id
  					}
  				}), errorFn);
  			}
  		}
  	}
  });

  rtc.on('add_peers', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for (var i = 0; i < roomList.length; i+=1) {
		  var id = roomList[i];
		  if (id === socket.id) {
		    var soc = rtc.getSocket(id);
		    // inform the peers that they have a new peer
		    if (soc) {
		    	for (var j=0; j<data.connections.length; j+=1) {
		    		soc.send(JSON.stringify({
				        'eventName': 'new_peer_connected',
				        'data':{
				          'socketId': data.connections[j]
				        }
				    }), errorFn);
		    	}
		    }
		  }
		}
	});

	rtc.on('update_owner_data', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		manager.rooms.checkOwner(socket.id, data.room, function() {
			for ( var i = 0; i < roomList.length; i+=1) {
				var id = roomList[i];
				if (id === socket.id) {
					continue;
				} else {
					var soc = rtc.getSocket(id);
					// inform the peers that they have a new peer
					if (soc) {
						soc.send(JSON.stringify({
							'eventName' : 'owner_data_updated',
							'data' : {
								'ownerName' : data.ownerName,
								'ownerAvatar' : data.ownerAvatar,
								'status' : data.status,
								'ownerCid' : socket.id,
								'access' : data.access
							}
						}), errorFn);
					}
				}
			}
		}, function() {
			logger.warn('Alert: a non owner is asking for update owner data');
		});
	});

	rtc.on('stream_closed', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for ( var i = 0; i < roomList.length; i+=1) {
			var id = roomList[i];
			if (id === socket.id) {
				continue;
			} else {
				var soc = rtc.getSocket(id);
				if (soc) {
					soc.send(JSON.stringify({
						'eventName' : 'stream_closed',
						'data' : {
							'connectionId' : socket.id,
							'mediatype' : data.mediatype
						}
					}), errorFn);
				}
			}
		}
	});

	rtc.on('chat_message', function(data, socket) {
		manager.rooms.checkChatEnabled(socket.id,data.room,function(){
			var created = new Date();
			manager.rooms.addChatMessage(socket.id,data.room,data.text,created,!socket.distributed,function(senderId){
				var roomList = rtc.rooms[data.room] || [];
				for ( var i = 0; i < roomList.length; i+=1) {
					var id = roomList[i];
					var soc = rtc.getSocket(id);
					// inform the peers that they have a new peer
					if (soc) {
						soc.send(JSON.stringify({
							'eventName' : 'chat_message',
							'data' : {
								'text' : data.text,
								'id' : senderId,
								'time' : created
							}
						}), errorFn);
					}
				}
			});
		},function(){
			var soc = rtc.getSocket(socket.id);
			// inform the peers that they have a new peer
			if (soc) {
				soc.send(JSON.stringify({
					'eventName' : 'chat_message',
					'data' : {
						'text' : 'The chat is closed.', // Input is disabled so only appears for hackers
						'id' : '||@@||'
					}
				}), errorFn);
			}
		});
	});

	rtc.on('chat_typing', function(data, socket) {
		manager.rooms.checkChatEnabled(socket.id,data.room,function(room){
			var created = new Date();
			var senderId = (room.owner.connectionId === socket.id)?'||##||':socket.id;
			var roomList = rtc.rooms[data.room] || [];
			for ( var i = 0; i < roomList.length; i+=1) {
				var id = roomList[i];
				if (id === socket.id) {
					continue;
				} else {
					var soc = rtc.getSocket(id);
					// inform the peers that they have a new peer
					if (soc) {
						soc.send(JSON.stringify({
							'eventName' : 'chat_typing',
							'data' : {
								'id' : senderId,
								'time' : created
							}
						}), errorFn);
					}
				}
			}
		},function(){
			var soc = rtc.getSocket(socket.id);
			// inform the peers that they have a new peer
			if (soc) {
				soc.send(JSON.stringify({
					'eventName' : 'chat_message',
					'data' : {
						'text' : 'The chat is closed.', // Input is disabled so only appears for hackers
						'id' : '||@@||'
					}
				}), errorFn);
			}
		});
	});

	rtc.on('ask_for_sharing', function(data, socket) {
		manager.rooms.checkOwnerOrHandsUp(socket.id, data.connectionId, data.room, data.source, function() {
			var soc = rtc.getSocket(data.connectionId);
			// inform the user you ask to screen share
			if (soc) {
				soc.send(JSON.stringify({
					'eventName' : 'share_request',
					'data' : {
						'source' : data.source,
						'id' : socket.id
					}
				}), errorFn);
			}
		}, function() {
			logger.warn('Alert: someone asking for sharing without permissions');
		});
	});

	rtc.on('ask_for_accept_files', function(data, socket) {
	 	manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room,  function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        'eventName' : 'request_for_accept_files',
	        'data' : {
	          'requestId': data.requestId,
	          'files' : data.filesinfo,
	          'id' : socket.id
	        }
	      }), errorFn);
	    }
	  }, function() {
	    logger.warn('Alert: someone asking for sharing files without permissions');
	  });
	});

	rtc.on('accept_files_request', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(data.connectionId,socket.id, data.room,  function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        'eventName' : 'files accepted',
	        'data' : {
	          'requestId': data.requestId,
	          'token' : data.token,
	          'id' : socket.id
	        }
	      }), errorFn);
	    }
	  }, function() {
	    logger.warn('Alert: someone asking for sharing files without permissions');
	  });
	});

	rtc.on('file_download_completed', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        'eventName' : 'file downloaded',
	        'data' : {
	          'requestId': data.requestId,
	          'fileid': data.fileid,
	          'token' : data.token,
	          'id' : socket.id
	        }
	      }), errorFn);
	    }
	  }, function() {
	    logger.warn('Alert: someone is trying to announce that a file is completed');
	  });
	});

	rtc.on('files_request_completed', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        'eventName' : 'files request completed',
	        'data' : {
	          'requestId': data.requestId,
	          'token' : data.token,
	          'id' : socket.id
	        }
	      }), errorFn);
	    }
	  }, function() {
	    logger.error('Alert: someone is trying to announce request file completion');
	  });
	});

	rtc.on('files_request_error', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        'eventName' : 'files request error',
	        'data' : {
	          'requestId': data.requestId,
	          'token' : data.token,
	          'id' : socket.id,
			  'error': data.error
	        }
	      }), errorFn);
	    }
	  }, function() {
	    logger.error('Alert: someone is trying to announce request file error');
	  });
	});

	rtc.on('file_canceled', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        'eventName' : 'file canceled',
	        'data' : {
	        	'requestId': data.requestId,
	        	'fileid': data.fileid,
	        	'token' : data.token,
	        	'id' : socket.id,
	        	'direction': data.direction
	        }
	      }), errorFn);
	    }
	  }, function() {
	    logger.error('Alert: someone is trying to cancel a file without permission');
	  });
	});

	rtc.on('error_to_owner', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for ( var i = 0; i < roomList.length; i+=1) {
			var id = roomList[i];
			var soc = rtc.getSocket(id);
			// inform the peers that the stop request was sent to id
			if (soc) {
				if (id === socket.id) {
					continue;
				} else {
					soc.send(JSON.stringify({
						'eventName' : 'error_produced',
						'data' : {
							connectionId : socket.id,
							origin : data.origin,
							type : data.type
						}
					}), errorFn);
				}
			}
		}
	});

	rtc.on('error_to_user', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		manager.rooms.checkOwner(socket.id, data.room, function() {
			for ( var i = 0; i < roomList.length; i+=1) {
				var id = roomList[i];
				if (id === data.origin) {
					var soc = rtc.getSocket(id);
					// inform the peers that the stop request was sent to id
					if (soc) {
						soc.send(JSON.stringify({
							'eventName' : 'error_produced',
							'data' : {
								connectionId : socket.id,
								origin : data.origin,
								type : data.type
							}
						}), errorFn);
					}
				}
			}
		},function (){
			logger.error ('Somebody is trying to send an error and it\'s not the owner');
		});
	});

	rtc.on('room_leave', function(roomid, socket) {
		manager.rooms.disconnectOwnerOrGuess(socket.id, function(room,owner) {
			var newsocket = socket;
			if (owner) {
				rtc.fire('update_owner_data', {
					ownerName : room.owner.name,
					ownerAvatar: room.owner.avatar,
					ownerCid: room.owner.connectionid,
					status : 'DISCONNECTED',
					room : room.roomId,
					access: {
				    	shared: room.access.shared,
				    	title: room.access.title,
				       	moderated: room.access.moderated,
				        chat: room.access.chat,
				        locked: room.access.locked
					}
				}, newsocket);
			} else {
				rtc.fire('peer_list_updated', {
					room : room.roomId
				}, newsocket);
			}
			rtc.fire('disconnect stream', socket);
		});
	});

	var sendRoomOut = function(soc,from) {
		soc.send(JSON.stringify({
			'eventName' : 'room_out',
			'data' : {
				'room' : from
			}
		}), errorFn);
		soc.close();
	};

	rtc.on('move_room', function(data, socket){
		var roomList = rtc.rooms[data.fromRoom];
		manager.rooms.checkOwner(socket.id, data.toRoom, function() {
			rtc.rooms[data.toRoom] = roomList;
			delete rtc.rooms[data.fromRoom];
			if (!roomList) { roomList = []; }
			var toClose = [];
			for ( var i = 0; i < roomList.length; i+=1) {
				var id = roomList[i];
				if (id === socket.id) {
					continue;
				} else {
					var soc = rtc.getSocket(id);
					// inform the peers that they have a new peer
					if (soc) {
						if (data.list.indexOf(id)!==-1) {
							toClose.push(soc);
						} else {
							soc.send(JSON.stringify({
								'eventName' : 'room_moved',
								'data' : {
									'room' : data.toRoom
								}
							}), errorFn);
						}
					}
				}
			}
			// Time for server to change to the new room
			setTimeout(function(){
				for (var j=0; j<toClose.length; j+=1) {
					sendRoomOut(toClose[j],data.fromRoom);
				}
			},500);
		}, function() {
			logger.error('Alert: a non owner is trying to move room');
		});
	});

	rtc.on('rtc_status_update', function(data, socket){

		var roomStatus = rtc.statusList[data.room] || {};
		var userConnectionsList = roomStatus[socket.id] || [];
		var connection = _.findWhere (userConnectionsList, { peerId: data.peerId, source: data.source, produced: data.produced });

		if (connection === undefined){
			connection = {
				peerId: data.peerId,
				status: 'new',
				source: data.source,
				produced: data.produced
			};

			userConnectionsList.push (connection);
		}

		connection.status = data.status;
		roomStatus[socket.id] = userConnectionsList;
		rtc.statusList[data.room] = roomStatus;
	});


	var sendStop = function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for ( var i = 0; i < roomList.length; i+=1) {
			var id = roomList[i];
			var soc = rtc.getSocket(id);
			// inform the peers that the stop request was sent to id
			if (soc) {
				if (id === socket.id) {
					continue;
				} else {
					soc.send(JSON.stringify({
						'eventName' : 'stop_request',
						'data' : {
							connectionId : data.connectionId,
							source : data.source
						}
					}), errorFn);
				}
			}
		}
	};

	rtc.on('ask_for_stop_sharing', function(data, socket) {
		// For stop we must check two scenarios own stop signals and owner stop
		// signals
		manager.rooms.checkOwner(socket.id, data.room, function() {
			sendStop(data, socket);
		}, function() {
			if (socket.id === data.connectionId) {
				sendStop(data, socket);
			} else {
				logger.error('Alert: a non owner is asking for stop sharing');
			}
		});
	});

	// More events... here

}

module.exports.listen = function(server) {
  var manager;
  if (typeof server === 'number') {
    manager = new WebSocketServer({
        port: server
      });
  } else {
    manager = new WebSocketServer({
      server: server
    });
  }
  manager.rtc = rtc;
  attachEvents(manager);
  return manager;
};

rtc.getSocket = function(id) {
  var connections = rtc.sockets;
  if (!connections) {
    // TODO: Or error, or customize
    return;
  }

  for (var i = 0; i < connections.length; i+=1) {
    var socket = connections[i];
    if (id === socket.id) {
      return socket;
    }
  }
};
