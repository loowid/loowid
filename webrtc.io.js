//SERVER
var WebSocketServer = require('ws').Server,
signature = require( "cookie-signature" ),prefix = "s:",
ServerList = require('node-rest-client').Client,
request = require('request');

//Create a service definition for externar servers list
var lclient = new ServerList();

lclient.registerMethod('getXirSysServers','https://api.xirsys.com:443/getIceServers','POST');

var iolog = function() {};

for (var i = 0; i < process.argv.length; i++) {
  var arg = process.argv[i];
  if (arg === "-debug") {
    iolog = function(msg) {
      console.log(msg);
    };
    console.log('Debug mode on!');
  }
}


// Used for callback publish and subscribe
if (typeof rtc === "undefined") {
  var rtc = {};
}
//Array to store connections
rtc.sockets = [];

rtc.rooms = {};

rtc.prerooms = {};

// Holds callbacks for certain events.
rtc._events = {};

rtc.on = function(eventName, callback) {
  rtc._events[eventName] = rtc._events[eventName] || [];
  rtc._events[eventName].push(callback);
};

 rtc.iceSERVERS = function() {
    return {
      "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
      },
    	{url:'stun:stun.l.google.com:19302'},
		{url:'stun:stun1.l.google.com:19302'},
		{url:'stun:stun2.l.google.com:19302'},
		{url:'stun:stun3.l.google.com:19302'},
		{url:'stun:stun4.l.google.com:19302'},
		{
			"credential": "numbloowid",
			"host": "numb.viagenie.ca",
			"protocol": "turn",
			"url": "turn:numb.viagenie.ca",
			"username": "loowid@gmail.com"
		}    
      ]
    };
  };



rtc.fire = function(eventName, _) {
  var events = rtc._events[eventName];
  var args = Array.prototype.slice.call(arguments, 1);

  if (!events) {
    return;
  }

  for (var i = 0, len = events.length; i < len; i++) {
    events[i].apply(null, args);
  }
};

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

function getSessionId(headers) {
    var list = {}, rc = headers.cookie;
    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = unescape(parts.join('='));
    });
    var real_sid = list.jsessionid.replace( prefix, "" );
    real_sid = signature.unsign( real_sid, 'your-secret' );
    return real_sid;
}

function attachEvents(manager) {

  manager.on('connection', function(socket) {
    iolog('connect');

	socket.sessionid = getSessionId(socket.upgradeReq.headers);
    socket.id = id();
    iolog('new socket got id: ' + socket.id);

    rtc.sockets.push(socket);

    socket.on('message', function(msg) {
      var json = JSON.parse(msg);
      manager.rooms.realRoomId(json.data.room,socket.sessionid,function(realRoom){
    	  json.data.room = realRoom;
          rtc.fire(json.eventName, json.data, socket);
      });
    });

    socket.on('close', function() {
      iolog('close');

      // find socket to remove
      var i = rtc.sockets.indexOf(socket);
      // remove socket
	  rtc.sockets.splice(i, 1);
      // remove from rooms and send remove_peer_connected to all sockets in room
      var room;
      for (var key in rtc.rooms) {
        room = rtc.rooms[key];
        var exist = room.indexOf(socket.id);
        if (exist !== -1) {
          room.splice(room.indexOf(socket.id), 1);
          for (var j = 0; j < room.length; j++) {
            //console.log(room[j]);
            var soc = rtc.getSocket(room[j]);
            if (soc) { // This check is missing (bug)
	            soc.send(JSON.stringify({
	              "eventName": "remove_peer_connected",
	              "data": {
	                "socketId": socket.id
	              }
	            }), function(error) {
	              if (error) {
	                console.log(error);
	              }
	            });
            }
          }
          room = key; // This line is missing (bug)
          break;
        }
      }
      // we are leaved the room so lets notify about that
	  rtc.fire("room_leave", room, socket.id);
      // call the disconnect callback
	  rtc.fire("disconnect", rtc);

    });
    // call the connect callback
    rtc.fire('connect', rtc);
  });

  // manages the built-in room functionality
  rtc.on('join_room', function(dataa, socketa) {
	manager.rooms.checkLockOrPassword(dataa, socketa, function(data,socket) {
		var connectionsId = [];
		var roomList = rtc.rooms[data.room] || [];
		roomList.push(socket.id);
		if (socket._events) {
			rtc.rooms[data.room] = roomList;
			// Mark as valid
			manager.rooms.markValid(data.room,socket.sessionid);
		}
		
		for (var i = 0; i < roomList.length; i++) {
		  var id = roomList[i];

		  if (id == socket.id) {
		    continue;
		  } else {
		    connectionsId.push(id);
		    var soc = rtc.getSocket(id);
		    // inform the peers that they have a new peer
		    if (soc) {
		      soc.send(JSON.stringify({
		        "eventName": "new_peer_connected",
		        "data":{
		          "socketId": socket.id
		        }
		      }), function(error) {
		        if (error) {
		          console.log(error);
		        }
		      });
		    }
		  }
		}
		if (socket._events) {
			// send new peer a list of all prior peers
			socket.send(JSON.stringify({
			  "eventName": "get_peers",
			  "data": {
			    "connections": connectionsId,
			    "you": socket.id
			  }
			}), function(error) {
			  if (error) {
			    console.log(error);
			  }
			});
		} else {
			if (connectionsId.length>0) {
				wsevents.addEvent(serverId,'add_peers',{'room':data.room,'connections':connectionsId},socket);
			}
		}
	}
	, function(lock) {
		socketa.send(JSON.stringify({
			"eventName" : (lock?"room_locked":"password_failed"),
			"data" : {
				"password" : dataa.pwd,
				"room" : dataa.room
			}
		}), function(error) {
			if (error) {
				console.log(error);
			}
		});
	});
  });
	
 //We receives a request to get a STUN/TURN server list updated	
 rtc.on ('update_server_list', function (data,socket){
	 /*
	 //Define the args
	 var args = {
		 data: {ident: "username",secret: "password",domain: "loowid.com",application: "default",room: "default",secure: 1 },
		 headers:{"Content-Type": "application/json",} 
	 };
	 
	 lclient.methods.getXirSysServers (args,function (data,response){
		if (response.statusCode === 200){
			var pdata = JSON.parse(data);
			if (pdata.d){
				var iceServers = pdata.d.iceServers;
				socket.send (JSON.stringify ({
						"eventName":"get_updated_servers",
						"data":{
							"iceServers": iceServers
						}
				}), function(error) {
						if (error) {
						  console.log(error);
						}
				});
			}
			console.log ("Servers not updated");
		}else{
			console.log ("Error connecting to server to get servers" + data  + "\n " + response);
		}
	 });
	 */
	 request.post(
            'https://api.xirsys.com/getIceServers', {
            form: {
                domain: process.env.XIRSYS_DOMAIN || "domain",
                room: "default",
                application: "default",
                ident: process.env.XIRSYS_USER || "username",
                secret: process.env.XIRSYS_SECRET || "password",
                secure: 1
            }
        },

        function (error, response, body) {
            var iceServers;
			
			if (!error && response.statusCode == 200) {
                console.log(body);
				var pdata = JSON.parse(body);
				if (pdata.d){
					iceServers = pdata.d.iceServers;
			
				}else{
					serverList = rtc.iceSERVERS();
				  	iceServers = serverList.iceServers; 
				}
               
            }else{
				serverList = rtc.iceSERVERS();
				iceServers = serverList.iceServers;
				console.log ("Error connecting to server to get servers" + body  + "\n " + response);
			}
			
			//Send the correct list
			socket.send (JSON.stringify ({
					"eventName":"get_updated_servers",
					"data":{
						"iceServers": iceServers
					}
			}), function(error) {
					if (error) {
					  console.log(error);
					}
			});
        });
	 
	 
	 
 });
	
  //Receive ICE candidates and send to the correct socket
  rtc.on('send_ice_candidate', function(data, socket) {
    iolog('send_ice_candidate');
    var soc = rtc.getSocket(data.socketId);
    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_ice_candidate",
        "data": {
          "label": data.label,
          "candidate": data.candidate,
          "socketId": socket.id,
          "mediatype": data.mediatype,
          "produced": data.produced
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
      // call the 'recieve ICE candidate' callback
      rtc.fire('receive ice candidate', rtc);
    }
  });

  //Receive offer and send to correct socket
  rtc.on('send_offer', function(data, socket) {
		manager.rooms.checkModerateOwnerOrAsked(socket.id,data.room,data.mediatype,function(){
		    iolog('send_offer');
		    var soc = rtc.getSocket(data.socketId);
		    if (soc) {
		      soc.send(JSON.stringify({
		        "eventName": "receive_offer",
		        "data": {
		          "sdp": data.sdp,
		          "socketId": socket.id,
		          "mediatype": data.mediatype,
		          "requestId": data.requestId,
		          "token": data.token
		      }
		      }), function(error) {
		        if (error) {
		          console.log(error);
		        }
		      });
		    }
		    // call the 'send offer' callback
		    rtc.fire('send offer', rtc);
		},function(){
			console.log("Alert: trying to sending offer without permissions");
		});
  });

  //Receive answer and send to correct socket
  rtc.on('send_answer', function(data, socket) {
    iolog('send_answer');
    var soc = rtc.getSocket( data.socketId);
    if (soc) {
      soc.send(JSON.stringify({
        "eventName": "receive_answer",
        "data" : {
          "sdp": data.sdp,
          "socketId": socket.id,
          "mediatype": data.mediatype
        }
      }), function(error) {
        if (error) {
          console.log(error);
        }
      });
      rtc.fire('send answer', rtc);
    }
  });

  //Extend webrtc server with new event peer_list_updated
  rtc.on('peer_list_updated', function(data, socket) {
  	var roomList = rtc.rooms[data.room] || [];
  	for ( var i = 0; i < roomList.length; i++) {
  		var id = roomList[i];
  		if (id == socket.id) {
  			continue;
  		} else {
  			var soc = rtc.getSocket(id);
  			// inform the peers that they have a chage on peer list
  			if (soc) {
  				soc.send(JSON.stringify({
  					"eventName" : "peer_list_updated",
  					"data" : {
  						"socketId" : socket.id
  					}
  				}), function(error) {
  					if (error) {
  						console.log(error);
  					}
  				});
  			}
  		}
  	}
  });
  
  rtc.on('add_peers', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for (var i = 0; i < roomList.length; i++) {
		  var id = roomList[i];
		  if (id == socket.id) {
		    var soc = rtc.getSocket(id);
		    // inform the peers that they have a new peer
		    if (soc) {
		    	for (var j=0; j<data.connections.length; j++) {
			      soc.send(JSON.stringify({
				        "eventName": "new_peer_connected",
				        "data":{
				          "socketId": data.connections[j]
				        }
				      }), function(error) {
				        if (error) {
				          console.log(error);
				        }
				      });
		    	}
		    }
		  }
		}
	});

	rtc.on('update_owner_data', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		manager.rooms.checkOwner(socket.id, data.room, function() {
			for ( var i = 0; i < roomList.length; i++) {
				var id = roomList[i];
				if (id == socket.id) {
					continue;
				} else {
					var soc = rtc.getSocket(id);
					// inform the peers that they have a new peer
					if (soc) {
						soc.send(JSON.stringify({
							"eventName" : "owner_data_updated",
							"data" : {
								"ownerName" : data.owner_name,
								"ownerAvatar" : data.owner_avatar,
								"status" : data.status,
								"ownerCid" : socket.id,
								"access" : data.access
							}
						}), function(error) {
							if (error) {
								console.log(error);
							}
						});
					}
				}
			}
		}, function() {
			console.log("Alert: a non owner is asking for update owner data");
		});
	});

	rtc.on('stream_closed', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for ( var i = 0; i < roomList.length; i++) {
			var id = roomList[i];
			if (id == socket.id) {
				continue;
			} else {
				var soc = rtc.getSocket(id);
				if (soc) {
					soc.send(JSON.stringify({
						"eventName" : "stream_closed",
						"data" : {
							"connectionId" : socket.id,
							"mediatype" : data.mediatype
						}
					}), function(error) {
						if (error) {
							console.log(error);
						}
					});
				}
			}
		}
	});

	rtc.on('chat_message', function(data, socket) {
		manager.rooms.checkChatEnabled(socket.id,data.room,function(){
			var created = new Date();
			manager.rooms.addChatMessage(socket.id,data.room,data.text,created,function(senderId){
				var roomList = rtc.rooms[data.room] || [];
				for ( var i = 0; i < roomList.length; i++) {
					var id = roomList[i];
					var soc = rtc.getSocket(id);
					// inform the peers that they have a new peer
					if (soc) {
						soc.send(JSON.stringify({
							"eventName" : "chat_message",
							"data" : {
								"text" : data.text,
								"id" : senderId,
								"time" : created
							}
						}), function(error) {
							if (error) {
								console.log(error);
							}
						});
					}
				}
			});
		},function(){
			var soc = rtc.getSocket(socket.id);
			// inform the peers that they have a new peer
			if (soc) {
				soc.send(JSON.stringify({
					"eventName" : "chat_message",
					"data" : {
						"text" : "The chat is closed.", // Input is disabled so only appears for hackers
						"id" : "||@@||"
					}
				}), function(error) {
					if (error) {
						console.log(error);
					}
				});
			}
		});
	});

	rtc.on('ask_for_sharing', function(data, socket) {
		manager.rooms.checkOwnerOrHandsUp(socket.id, data.connectionId, data.room, data.source, function() {
			var soc = rtc.getSocket(data.connectionId);
			// inform the user you ask to screen share
			if (soc) {
				soc.send(JSON.stringify({
					"eventName" : "share_request",
					"data" : {
						"source" : data.source,
						"id" : socket.id
					}
				}), function(error) {
					if (error) {
						console.log(error);
					}
				});
			}
		}, function() {
			console.log("Alert: someone asking for sharing without permissions");
		});
	});

	rtc.on('ask_for_accept_files', function(data, socket) {
	 	manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room,  function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        "eventName" : "request_for_accept_files",
	        "data" : {
	          "requestId": data.requestId,
	          "files" : data.filesinfo,
	          "id" : socket.id
	        }
	      }), function(error) {
	        if (error) {
	          console.log(error);
	        }
	      });
	    }
	  }, function() {
	    console.log("Alert: someone asking for sharing files without permissions");
	  });
	});

	rtc.on('accept_files_request', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(data.connectionId,socket.id, data.room,  function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        "eventName" : "files accepted",
	        "data" : {
	          "requestId": data.requestId,
	          "token" : data.token,
	          "id" : socket.id
	        }
	      }), function(error) {
	        if (error) {
	          console.log(error);
	        }
	      });
	    }
	  }, function() {
	    console.log("Alert: someone asking for sharing files without permissions");
	  });
	});

	rtc.on('file_download_completed', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        "eventName" : "file downloaded",
	        "data" : {
	          "requestId": data.requestId,
	          "fileid": data.fileid,
	          "token" : data.token,
	          "id" : socket.id
	        }
	      }), function(error) {
	        if (error) {
	          console.log(error);
	        }
	      });
	    }
	  }, function() {
	    console.log("Alert: someone is trying to announce that a file is completed");
	  });
	});

	rtc.on('files_request_completed', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        "eventName" : "files request completed", 
	        "data" : {
	          "requestId": data.requestId,
	          "token" : data.token,
	          "id" : socket.id
	        }
	      }), function(error) {
	        if (error) {
	          console.log(error);
	        }
	      });
	    }
	  }, function() {
	    console.log("Alert: someone is trying to announce request file completion");
	  });
	});

	rtc.on('files_request_error', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        "eventName" : "files request completed", 
	        "data" : {
	          "requestId": data.requestId,
	          "token" : data.token,
	          "id" : socket.id,
	          "error" : data.error
	        }
	      }), function(error) {
	        if (error) {
	          console.log(error);
	        }
	      });
	    }
	  }, function() {
	    console.log("Alert: someone is trying to announce request file error");
	  });
	});

	rtc.on('file_canceled', function(data, socket) {
	 manager.rooms.checkModerateOwnerFiles(socket.id, data.connectionId, data.room, function() {
	    var soc = rtc.getSocket(data.connectionId);
	    // inform the user you ask to screen share
	    if (soc) {
	      soc.send(JSON.stringify({
	        "eventName" : "file canceled",
	        "data" : {
	        	"requestId": data.requestId,
	        	"fileid": data.fileid,
	        	"token" : data.token,
	        	"id" : socket.id,
	        	"direction": data.direction
	        }
	      }), function(error) {
	        if (error) {
	          console.log(error);
	        }
	      });
	    }
	  }, function() {
	    console.log("Alert: someone is trying to cancel a file without permission");
	  });
	});
  
	rtc.on('error_to_owner', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for ( var i = 0; i < roomList.length; i++) {
			var id = roomList[i];
			var soc = rtc.getSocket(id);
			// inform the peers that the stop request was sent to id
			if (soc) {
				if (id == socket.id) {
					continue;
				} else {
					soc.send(JSON.stringify({
						"eventName" : "error_produced",
						"data" : {
							connectionId : socket.id,
							origin : data.origin,
							type : data.type
						}
					}), function(error) {
						if (error) {
							console.log(error);
						}
					});
				}
			}
		}
	});

	rtc.on('error_to_user', function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		manager.rooms.checkOwner(socket.id, data.room, function() {
			for ( var i = 0; i < roomList.length; i++) {
				var id = roomList[i];
				if (id == data.origin) {
					var soc = rtc.getSocket(id);
					// inform the peers that the stop request was sent to id
					if (soc) {
						soc.send(JSON.stringify({
							"eventName" : "error_produced",
							"data" : {
								connectionId : socket.id,
								origin : data.origin,
								type : data.type
							}
						}), function(error) {
							if (error) {
								console.log(error);
							}
						});
					}
				}
			}
		},function (){
			console.log ("Somebody is trying to send an error and it's not the owner");
		});
	});

	rtc.on('room_leave', function(roomid, socket) {
		manager.rooms.disconnectOwnerOrGuess(socket, function(room,owner) {
			var newsocket = {};
			newsocket.id = socket; // bit tricky here
			if (owner) {
				rtc.fire('update_owner_data', {
					owner_name : room.owner.name,
					owner_avatar: room.owner.avatar,
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

	rtc.on('move_room', function(data, socket){
		var roomList = rtc.rooms[data.fromRoom];
		manager.rooms.checkOwner(socket.id, data.toRoom, function() {
			rtc.rooms[data.toRoom] = roomList;
			delete rtc.rooms[data.fromRoom];
			if (!roomList) roomList = [];
			var toClose = [];
			for ( var i = 0; i < roomList.length; i++) {
				var id = roomList[i];
				if (id == socket.id) {
					continue;
				} else {
					var soc = rtc.getSocket(id);
					// inform the peers that they have a new peer
					if (soc) {
						if (data.list.indexOf(id)!==-1) {
							toClose.push(soc);
							soc.send(JSON.stringify({
								"eventName" : "room_out",
								"data" : {
									"room" : data.fromRoom
								}
							}), function(error) {
								if (error) {
									console.log(error);
								}
							});


						} else {
							soc.send(JSON.stringify({
								"eventName" : "room_moved",
								"data" : {
									"room" : data.toRoom
								}
							}), function(error) {
								if (error) {
									console.log(error);
								}
							});
						}
					}
				}
			}
			for (var j=0; j<toClose.length; j++) {
				toClose[j].close();
			}
		}, function() {
			console.log("Alert: a non owner is trying to move room");
		});
	});

	var sendStop = function(data, socket) {
		var roomList = rtc.rooms[data.room] || [];
		for ( var i = 0; i < roomList.length; i++) {
			var id = roomList[i];
			var soc = rtc.getSocket(id);
			// inform the peers that the stop request was sent to id
			if (soc) {
				if (id == socket.id) {
					continue;
				} else {
					soc.send(JSON.stringify({
						"eventName" : "stop_request",
						"data" : {
							connectionId : data.connectionId,
							source : data.source
						}
					}), function(error) {
						if (error) {
							console.log(error);
						}
					});
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
				console.log("Alert: a non owner is asking for stop sharing");
			}
		});
	});

	// More events... here
	
}

// generate a 4 digit hex code randomly
function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// make a REALLY COMPLICATED AND RANDOM id, kudos to dennis
function id() {
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

rtc.getSocket = function(id) {
  var connections = rtc.sockets;
  if (!connections) {
    // TODO: Or error, or customize
    return;
  }

  for (var i = 0; i < connections.length; i++) {
    var socket = connections[i];
    if (id === socket.id) {
      return socket;
    }
  }
};
