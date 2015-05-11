'use strict';
/*global webkitMediaStream: true */
/*global webkitRTCPeerConnection: true */
/*global getScreenId: true */
/*global MediaStream: true */
//CLIENT

var _ = window._;
// Fallbacks for vendor-specific variables until the spec is finalized.

var PeerConnection = (window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
var wkURL = (window.URL || window.webkitURL || window.msURL || window.oURL);
var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
var nativeRTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
var nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription); // order is very important: "RTCSessionDescription" defined in Nighly but useless


if (navigator.webkitGetUserMedia) {
	if (!webkitMediaStream.prototype.getVideoTracks) {
		webkitMediaStream.prototype.getVideoTracks = function() {
			return this.videoTracks;
		};
		webkitMediaStream.prototype.getAudioTracks = function() {
			return this.audioTracks;
		};
	}

	// New syntax of getXXXStreams method in M26.
	if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
		webkitRTCPeerConnection.prototype.getLocalStreams = function() {
			return this.localStreams;
		};
		webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
			return this.remoteStreams;
		};
	}
} else if (navigator.mozGetUserMedia) {

	if (!MediaStream.prototype.getVideoTracks) {
		MediaStream.prototype.getVideoTracks = function() {
			return [];
		};
	}

	if (!MediaStream.prototype.getAudioTracks) {
		MediaStream.prototype.getAudioTracks = function() {
			return [];
		};
	}
}

function changeBitrate (sdp,bitrate){
	sdp = sdp.replace( /a=mid:video\r\n/g , 'a=mid:video\r\nb=AS:'+bitrate+'\r\n');
	return sdp;
}

function mergeConstraints(cons1, cons2) {
	var merged = cons1;
	for (var name in cons2.mandatory) {
		if (cons2.mandatory.hasOwnProperty(name)) {
			merged.mandatory[name] = cons2.mandatory[name];
		}
	}
	merged.optional.concat(cons2.optional);
	return merged;
}

(function() {

	var rtc;
	if ('undefined' === typeof module) {
		rtc = this.rtc = {};
	} else {
		rtc = module.exports = {};
	}

	// Toggle debug mode (console.log)
	rtc.debug = false;

	// Holds a connection to the server.
	rtc._socket = null;

	// Holds identity for the client.
	rtc._me = null;

	rtc.room = null;

	// Holds callbacks for certain events.
	rtc._events = {};

	rtc.iceServers = [];

	rtc.pingInterval = null;

	rtc.connected = false;

	rtc.reset = function() {
		if (rtc._socket) { rtc._socket.close(); }
		if (rtc.pingInterval) { window.clearInterval(rtc.pingInterval); }
		rtc._me = null;
		rtc._events = {};
		rtc.pingInterval = null;
		rtc.connected = false;
	};

	rtc.uniqueon = function(eventName, callback) {
		if (rtc._events[eventName]) {
			delete rtc._events[eventName];
		}
		rtc.on(eventName,callback);
	};

	rtc.deleteEvent = function(eventName) {
		if (rtc._events[eventName]) {
			delete rtc._events[eventName];
		}
	};


	rtc.on = function(eventName, callback) {
		rtc._events[eventName] = rtc._events[eventName] || [];
		rtc._events[eventName].push(callback);
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


	// Reference to the lone PeerConnection instance.
	rtc.producedPeerConnections = {};
	rtc.receivedPeerConnections = {};


	// Array of known peer socket ids
	rtc.connections = [];
	// Stream-related variables.
	rtc.streams = [];
	rtc.numStreams = 0;
	rtc.initializedStreams = 0;

	// Reference to the data channels
	rtc.dataChannels = {};

	rtc.sources = ['audio','video','screen','filedata'];

	rtc.sourceSdpConstraints = {
		'audio':{'mandatory':{'OfferToReceiveAudio': true,'OfferToReceiveVideo': false}},
		'video':{'mandatory':{'OfferToReceiveAudio': false,'OfferToReceiveVideo': true}},
		'screen':{'mandatory':{'OfferToReceiveAudio': false,'OfferToReceiveVideo': true}},
		'filedata':{'mandatory':{'OfferToReceiveAudio': false,'OfferToReceiveVideo': false}}
	};

	rtc.pcConstraints = {
		'optional': [{
			'DtlsSrtpKeyAgreement': true
		}]
	};

	//rtc.chromeDesktopExtensionId = 'ampjliekoheiopmpnjcihakbcjaplkad';
	rtc.chromeDesktopExtensionId = 'lalali';
	/**
   * Keep connection open
   */
	rtc.ping = function() {
		rtc._socket.send(JSON.stringify({'eventName': 'ping','data': {'room': rtc.room}}));
	};

	rtc.peerListUpdated = function(room) {
		rtc._socket.send(JSON.stringify({'eventName': 'peer_list_updated','data': {'room': room}}));
	};

	rtc.sendChatMessage = function(room,message) {
		rtc._socket.send(JSON.stringify({'eventName': 'chat_message','data': {'room': room,'text':message}}));
	};

	rtc.sendChatTyping = function(room) {
		rtc._socket.send(JSON.stringify({'eventName': 'chat_typing','data': {'room': room}}));
	};

	/**
   * Connects to the websocket server.
   */
	rtc.connect = function(server, room, password, reload) {
		room = room || ''; // by default, join a room called the blank string
		rtc._socket = new WebSocket(server);
		rtc.room = room;		
		rtc._socket.onopen = function() {
			//var sckt = this;
			rtc.askForUpdateConfig = function (room){
				rtc._socket.send(JSON.stringify({
					'eventName': 'update_server_config',
					'data': {
						'room': room
					}
				}));
			};	

			rtc.on ('get_updated_config', function (data){
				rtc.iceServers = data.iceServers;
				rtc.chromeDesktopExtensionId = data.chromeDesktopExtensionId;

				if (rtc.debug) { console.log ('serverList updated' + JSON.stringify (rtc.iceServers)); }
				if (rtc.debug) { console.log ('extension id ' + rtc.chromeDesktopExtensionId); }
			});	

			rtc.askForUpdateConfig(); 	


			//Just connect to the room if you have a valid server list

			rtc.tryToConnect = function (troom,tpassword,treload){
				if (rtc.iceServers !== undefined && rtc.iceServers.length >0){
					//Join to the room
					rtc._socket.send(JSON.stringify({
						'eventName': 'join_room',
						'data': {
							'room': troom,
							'pwd': tpassword,
							'reload': treload
						}
					}));

					// Keep connection open
					rtc.pingInterval = setInterval(function(){rtc.ping();},5000);

				}else{
					setTimeout (function (){
						rtc.tryToConnect(troom,tpassword,treload);
					},1000);	
				}
			};

			rtc.tryToConnect(room,password,reload);


			rtc._socket.onmessage = function(msg) {
				var json = JSON.parse(msg.data);
				rtc.fire(json.eventName, json.data);
			};


			rtc._socket.onerror = function(err) {
				console.error('onerror');
				console.error(err);
				location.reload();
			};

			rtc._socket.onclose = function(data) {
				var id = rtc._socket.id;
				rtc.fire('disconnect stream', id);
				window.clearInterval (rtc.pingInterval);

				//We had to alert with another signal ? 
				rtc.connections = {};
				rtc.receivedPeerConnections = {};
				rtc.producedPeerConnections = {};
				//rtc._socket = null;
			};

			rtc.on('ready', function(origin,mediatype,maxBitrate) {
				///This process is for produced connections
				if (rtc.relay){
					//Anounce to the server that an stream has been added
					rtc.relayStreamAdded(origin,mediatype);
				}else{
					//Create connections and send streams to all participants
					rtc.createPeerConnections(mediatype);
					rtc.addOwnStreams(mediatype);
					rtc.sendOffers(mediatype,maxBitrate);
				} 
			});

			rtc.on('get_peers', function(data) {
				rtc.connections = data.connections;
				rtc._me = data.you;

				// fire connections event and pass peers
				rtc.fire('connections', rtc.connections);
			});

			rtc.on('receive_ice_candidate', function(data) {
				var candidate = new nativeRTCIceCandidate({'candidate': data.candidate, 'sdpMLineIndex': data.label});
			
				var peerConnections = data.produced ? rtc.receivedPeerConnections: rtc.producedPeerConnections;

				rtc.initPeerArray(peerConnections,data.socketId,data.origin);

				//We store temporaly candidates
				if (!peerConnections[data.socketId][data.origin][data.mediatype]){
					if (rtc.debug) { console.log ('Peer not ready, so storing ICE candidate for a while'); }
					
					if (!peerConnections[data.socketId][data.origin]['temp_'+data.mediatype]) { 
						peerConnections[data.socketId][data.origin]['temp_'+data.mediatype] = [];
					}
            		peerConnections[data.socketId][data.origin]['temp_'+data.mediatype].push(candidate);
					return;
				}else{
					peerConnections[data.socketId][data.origin][data.mediatype].addIceCandidate(candidate,
							function (){ if (rtc.debug) { console.log ('ICE candidate added'); } },
							function (error) { if (rtc.debug) { console.log ('Error adding an ICE candidate ' + JSON.stringify (error)); } } );
				
				}

				//Take care should send mediatype??
				rtc.fire('receive ice candidate', candidate);
				
			});

			rtc.on('new_peer_connected', function(data) {
				var id = data.socketId;
				rtc.connections.push(id);

				//This is a bit of delay to keep the other client load all the needed before sending him offers
				var sendDelayedOffer =  function (id,origin,mediatype){
					setTimeout (function (){
						rtc.sendOffer (id,origin,mediatype);
						if (rtc.debug) { console.log ('Sending to ' + id + ' a ' + mediatype + 'offer'); }
					},2000);
				};  

				for (var i = 0; i < rtc.streams.length && !rtc.relay; i+=1){
					var stream = rtc.streams[i].mediastream;
					var mediatype = rtc.streams[i].mediatype;
					var origin = rtc.streams[i].origin;
					
					var pc = rtc.createPeerConnection(id,origin,mediatype,true);
					pc.addStream(stream);
					sendDelayedOffer (id,origin,mediatype);
				}


			});

			rtc.on('remove_peer_connected', function(data) {
				var id = data.socketId;

				//TODO disconnect stream -> disconnect user 
				rtc.fire('disconnect stream', id);
				delete rtc.dataChannels[id];

				rtc.dropPeerConnection(id,undefined,undefined,false);
				rtc.dropPeerConnection(id,undefined,undefined,true);

				var index = _.indexOf (rtc.connections,id);
				if (index > -1){
					rtc.connections.splice(index,1);
				}	
			});

			rtc.on('receive_offer', function(data) {
				if (data.mediatype.indexOf('filedata') !== -1){
					rtc.fire ('receive file offer',data);
				}else{
					//if not an file offer accept directly ??? mmmm problem?
					rtc.receiveOffer(data.socketId, data.sdp, data.origin, data.mediatype);
					rtc.fire('receive offer', data);
				}
			});

			rtc.on('receive_answer', function(data) {
				rtc.receiveAnswer(data.socketId, data.sdp,data.origin,data.mediatype);
				rtc.fire('receive answer', data);
			});

			rtc.on('r_proposal', rtc.listenProposal);
			
			rtc.fire('connect');
		};
	};


	rtc.sendOffers = function(mediatype,maxBitrate) {
		for (var i = 0, len = rtc.connections.length; i < len; i+=1) {
			var socketId = rtc.connections[i];

			//take care
			rtc.sendOffer(socketId,rtc._me,mediatype,maxBitrate);
		}
	};

	rtc.onClose = function(data) {
		rtc.on('close_stream', function() {
			rtc.fire('close_stream', data);
		});
	};

	rtc.createPeerConnections = function(mediatype) {
		for (var i = 0; i < rtc.connections.length; i+=1) {
			rtc.createPeerConnection(rtc.connections[i],rtc._me,mediatype,true);
		}
	};

	rtc.createPeerConnection = function(id,origin,mediatype,produced,requestId) {

		var peerConnections = produced ? rtc.producedPeerConnections : rtc.receivedPeerConnections;

		//Always process an origin 
		var sourceOrigin = origin || rtc._me;
		
		var config = rtc.pcConstraints;

		//initialize array position if needed
 		rtc.initPeerArray (peerConnections,id,sourceOrigin);

			
		var pc = peerConnections[id][sourceOrigin	][mediatype] = new PeerConnection({iceServers:rtc.iceServers}, config);
	
		pc.onicecandidate = function(event) {
			if (event.candidate && event.candidate.candidate) {
				if (rtc.debug) { console.log ('Sending an ICE candidate'); }
				rtc._socket.send(JSON.stringify({
					'eventName': 'send_ice_candidate',
					'data': {
						'label': event.candidate.sdpMLineIndex,
						'candidate': event.candidate.candidate,
						'socketId': id,
						'mediatype': mediatype,
						'origin': sourceOrigin,
						'produced': produced
					}
				}));
			rtc.fire('ice candidate', event.candidate);

			}
		};

		pc.onopen = function() {
			// TODO: Finalize this API
			rtc.fire('peer connection opened');
		};

		pc.onaddstream = function(event) {
			// TODO: Finalize this API

			//No lo lanzamos hasta que realmente esté en completed

			var tries = 0;

			var tryStream = function (){
				if (pc !== null){
					if ( pc.iceConnectionState === 'completed' || pc.iceConnectionState === 'connected'){
						if (rtc.debug) { console.log ('the connection was completed send the data'); }
						rtc.fire('add remote stream', event.stream,id,origin,mediatype);
						if (rtc.relay) {
							rtc.fire('store stream relay', event.stream, id,mediatype);	
						}
					}else{
						setTimeout (function (){
							if (rtc.debug) { console.log ('Remote stream not added yet. Try : ' + tries); }
							tries +=1;
							if (tries < 10) { tryStream(); }
						},1500);
					}
				}
			};
			tryStream();

		};

		pc.oniceconnectionstatechange = function (event){
			rtc._socket.send(JSON.stringify({
				'eventName': 'rtc_status_update',
				'data': {
					'peerId': id,
					'source': mediatype,
					'status': pc.iceConnectionState,
					'origin': sourceOrigin,
					'produced': produced,
					'room': rtc.room
				}
			}));
			
			if (rtc.debug) { console.log ('User id: ' + id + ' changed : ' + pc.iceConnectionState +  ' mediatype' + mediatype); }
		};

		pc.ondatachannel = function(evt) {
			if (rtc.debug) { console.log('data channel connecting ' + id); }
			rtc.addDataChannel(id, evt.channel,requestId,mediatype);
		};

		return pc;
	};

	rtc.sendOffer = function(socketId,origin,mediatype,maxBitrate,requestId,token) {
		var pc = rtc.producedPeerConnections[socketId][origin][mediatype];

		var constraints = {
			'optional': [],
			'mandatory': {
				'MozDontOfferDataChannel': true
			}
		};
		// temporary measure to remove Moz* constraintSs in Chrome
		if (navigator.webkitGetUserMedia) {
			for (var prop in constraints.mandatory) {
				if (prop.indexOf('Moz') !== -1) {
					delete constraints.mandatory[prop];
				}
			}
		}

		//It should be more generic
		var sourceType = mediatype.indexOf('filedata') !== -1 ? 'filedata' : mediatype;

		var sdpConstraints = rtc.sourceSdpConstraints[sourceType];


		constraints = mergeConstraints(constraints, sdpConstraints);

		pc.createOffer(function(sessionDescription) {
			//sessionDescription.sdp = preferOpus(sessionDescription.sdp);
			
			if (maxBitrate){
				sessionDescription.sdp = changeBitrate(sessionDescription.sdp,maxBitrate); 
			}

			pc.setLocalDescription(sessionDescription, function (){
				rtc._socket.send(JSON.stringify({
					'eventName': 'send_offer',
					'data': {
						'socketId': socketId,
						'sdp': sessionDescription,
						'mediatype': mediatype,
						'origin': origin,
						'room': rtc.room,
						'requestId': requestId,
						'token' : token
					}
				}));						 
			},
		    function (){
			   if (rtc.debug) { console.log ('Error setting the local description'); }
		    });

		}, function (){
			if (rtc.debug) { console.log ('Error creating the offer'); }
		}, sdpConstraints);
	};

	rtc.initPeerArray = function(peerConnections,socketId,sourceOrigin){ 
		if (!peerConnections[socketId]){
			peerConnections[socketId] = {};
		}

		if (!peerConnections[socketId][sourceOrigin]){
			peerConnections[socketId][sourceOrigin] = {};
		}
	};
	rtc.receiveOffer = function(socketId, sdp, origin, mediatype,requestId) {
		var sourceOrigin = origin || socketId;
		
		//initialize array position if needed
		rtc.initPeerArray (rtc.receivedPeerConnections,socketId,sourceOrigin);

		var pc = rtc.receivedPeerConnections[socketId][sourceOrigin][mediatype];

		//if it's a new peer but it already exist must be destroyed first
		if (pc !== undefined){
			if (rtc.debug) { console.log ('Destroyed previous connection'); }
			rtc.dropPeerConnection(socketId,sourceOrigin,mediatype,false);
		}

		if (rtc.debug) { console.log ('Create a new one connection'); }

		pc = rtc.createPeerConnection(socketId,sourceOrigin,mediatype,false,requestId);

		if (rtc.debug) { console.log ('Send a new annser'); }
		rtc.sendAnswer(socketId, sdp,sourceOrigin,mediatype);
	};

	rtc.sendAnswer = function(socketId, sdp, origin, mediatype){
		var pc = rtc.receivedPeerConnections[socketId][origin][mediatype];
		var sdpConstraints = rtc.sourceSdpConstraints[mediatype];

		pc.setRemoteDescription(new nativeRTCSessionDescription(sdp),
			function (){
				//Finaly look for already stored messages and flush them
				if (rtc.receivedPeerConnections[socketId][origin]['temp_'+mediatype]){
					var sfn = function (){ if (rtc.debug) { console.log ('ICE candidate added'); } };
					var ffn = function (error) { if (rtc.debug) { console.log ('Error adding ICE candiate' + JSON.stringify (error)); } };
					for (var i=0; i< rtc.receivedPeerConnections[socketId][origin]['temp_'+mediatype].length; i+=1){
						var storedIceCandidate = rtc.receivedPeerConnections[socketId][origin]['temp_'+mediatype][i];
						pc.addIceCandidate(storedIceCandidate,sfn,ffn);
					}
				}
				pc.createAnswer(function(sessionDescription) {
					pc.setLocalDescription(sessionDescription, function (){
						rtc._socket.send(JSON.stringify({
							'eventName': 'send_answer',
							'data': {
								'socketId': socketId,
								'sdp': sessionDescription,
								'mediatype': mediatype,
								'origin':origin
							}
						}));
					},function (){
						if (rtc.debug) { console.log ('Error setting local description '); }	
					});
					//TODO Unused variable!?
					//var offer = pc.remoteDescription;
				}, function (){
					if (rtc.debug) { console.log ('Error creating the anwer '); }	
				}, sdpConstraints);
			}, function (){
				if (rtc.debug) { console.log ('Error setting retmote description '); }	
			});
	};


	rtc.receiveAnswer = function(socketId,sdp,origin,mediatype) {
		var sourceOrigin = origin || rtc._me;
		
		var pc = rtc.producedPeerConnections[socketId][sourceOrigin][mediatype];
		pc.setRemoteDescription(new nativeRTCSessionDescription(sdp),function (){
			if (!rtc.relay){
				setTimeout(function(){
					if (rtc.debug) { console.log('PCICE::::'+pc.iceConnectionState); }
					if (pc.iceConnectionState === 'checking') {
						if (rtc.debug) { console.log('Seems that the state is stalled !!'); }

						//Borramos la posible peer
						rtc.dropPeerConnection(socketId,sourceOrigin,mediatype,true);
						rtc.dropPeerConnection(socketId,sourceOrigin,mediatype,true);

						//Creamos una peer nueva
						rtc.createPeerConnection(socketId,sourceOrigin,mediatype,true);
						rtc.addStream(socketId,mediatype);
						rtc.sendOffer(socketId,sourceOrigin,mediatype);
					}						
				},10000);
			}
		},function (){
			if (rtc.debug) { console.log ('Error setting remote description'); }
		});

	};

	rtc.createStream = function(mediatype,options,onSuccess,onFail,maxBitrate) {

		onSuccess = onSuccess || function() {};
		onFail = onFail || function() {};

		if (getUserMedia) {
			var startStream = function (){
				rtc.numStreams+=1;
				getUserMedia.call(navigator, options, function(stream) {
					var streamObj = {};
					streamObj.mediastream = stream;
					streamObj.mediatype = mediatype;
					streamObj.origin = rtc._me;
					//Nothing to add as sender streamObj.sender = undefined
					
					rtc.streams.push(streamObj);
					rtc.initializedStreams+=1;
					onSuccess(stream);
					if (rtc.initializedStreams === rtc.numStreams) {
						rtc.fire('ready', streamObj.origin,streamObj.mediatype,maxBitrate);
					}
				}, function(error) {
					//alert('Could not connect stream.');
					onFail(error);
				});
			};

			if (mediatype === 'screen'){
				getScreenId(rtc.chromeDesktopExtensionId,function (error, sourceId, screenConstraints) {
					if (error) { onFail (error); }
					if (!error && sourceId) {
						options.video.mandatory.chromeMediaSource = 'desktop';
						options.video.mandatory.chromeMediaSourceId = sourceId;
					}
					startStream();
				});	
			}else{
				startStream();	
			}


		} else {
			alert('webRTC is not yet supported in this browser.');
		}
	};

	rtc.addOwnStreams = function(mediatype) {
		
		for (var i = 0; i < rtc.streams.length; i+=1) {
			var streamObj = rtc.streams[i];
			if (streamObj.mediatype === mediatype){
				for (var connection in rtc.producedPeerConnections) {
					if (rtc.producedPeerConnections.hasOwnProperty(connection)) {
						rtc.producedPeerConnections[connection][rtc._me][mediatype].addStream(streamObj.mediastream);
					}
				}
			}
		}
	};

	rtc.addStream = function (connectionId,origin, mediatype){
		
		for (var i = 0; i < rtc.streams.length; i+=1) {
			var streamObj = rtc.streams[i];
			if (streamObj.mediatype === mediatype){
				if (rtc.relay){
					rtc.relayStreamAdded(streamObj.origin,streamObj.mediatype);
				}else{
					rtc.producedPeerConnections[connectionId][origin][mediatype].addStream(streamObj.mediastream);
				}
				
			}
		}
	};

	var pushMessage = function(id,mediatype,mediatypefile,requestId,token,channel,queue) {
		var eventName = 'data stream open ' +  id  + ' ' + mediatypefile;
		if (channel.readyState === 'open' ){
			var tfn = function (){
				rtc.dataChannels[id][mediatypefile].state = 'ready';
				rtc.sendMessage (id,mediatype,undefined,requestId,token); //Fire the send message for this queue
			};
			while (queue.length > 0){
				try {
					var object = queue [0];
					channel.send (JSON.stringify(object));  
					queue.shift();
				}catch (event){
					//We got a network problem, maybe the buffer is full, lets try it later
					rtc.dataChannels[id][mediatypefile].state = 'paused';
					setTimeout(tfn,50);
				}

			}  

		}else if (!rtc._events[eventName]){ //If we didn't register a on open method

			//Just register one method to execute for id and mediatype
			rtc.on(eventName, function (openedchannel){
				//We can have multiple channels to open, we only send 
				rtc.deleteEvent (eventName);
				rtc.dataChannels[id][mediatypefile].state =  'ready';
				rtc.sendMessage (id,mediatype,undefined,requestId,token);
			});
		}
	};
	
	rtc.sendMessage = function (id,mediatype,message,requestId,token){

		var mediatypefile = mediatype+'_'+requestId;

		if (!rtc.dataChannels[id] || !rtc.dataChannels[id][mediatypefile]){
			rtc.createPeerConnection(id,rtc._me,mediatypefile,true);
			rtc.createDataChannel(id,requestId,mediatypefile);
			rtc.sendOffer (id,rtc._me,mediatypefile,undefined,requestId,token);
		}

		var channel = rtc.dataChannels[id][mediatypefile].channel;
		var queue = rtc.dataChannels[id][mediatypefile].queue;
		var state = rtc.dataChannels[id][mediatypefile].state;

		if (message) {
			queue.push (message);
		}
		if (state  === 'ready') {
			pushMessage(id,mediatype,mediatypefile,requestId,token,channel,queue);
		}
		
	};

	rtc.createDataChannel = function(id,requestId,mediatypefile) {

		if (!id) { throw new Error('attempt to createDataChannel with unknown id'); }


		var userPeerList = rtc.producedPeerConnections[id];
		var pc = null;

		if (userPeerList && userPeerList[mediatypefile]) {
			pc = userPeerList[mediatypefile];
		} else {
			throw new Error('attempt to createDataChannel without peerConnection');
		}

		var label = mediatypefile || String(id);

		// chrome only supports reliable false atm.
		var options = {
			reliable: false
		};

		var channel;
		try {
			if (rtc.debug) { console.log('createDataChannel ' + id + ' ' + mediatypefile); } 
			channel = pc.createDataChannel(label, options);
		} catch (error) {
			if (rtc.debug) { console.log('seems that DataChannel is NOT actually supported!'); }
			throw error;
		}

		return rtc.addDataChannel(id,channel,requestId,mediatypefile);
	};


	rtc.addDataChannel = function(id, channel, requestId,mediatypefile) {

		channel.onopen = function() {
			if (rtc.debug) { console.log('data stream open ' + mediatypefile); }
			// We will fire a different open event for each id or channel
			rtc.fire('data stream open ' + id+ ' ' + mediatypefile, channel);
		};

		channel.onclose = function(event) {
			delete rtc.dataChannels[id][mediatypefile];
			if (rtc.debug) { console.log('data stream close '); }
			rtc.fire('data stream close', channel);
		};

		channel.onmessage = function(event) {
			if (rtc.debug) { console.log('data stream message ' + id + ' ' + event.data); }
			rtc.fire('data stream data', channel,id, requestId, mediatypefile, event.data);
		};

		channel.onerror = function(err) {
			if (rtc.debug) { console.log('data stream error ' + id + ': ' + err); }
			rtc.fire('data stream error', channel, err);
		};

		// track dataChannel
		if (!rtc.dataChannels[id]){
			rtc.dataChannels[id] = {};
		}

		rtc.dataChannels[id][mediatypefile] = {'channel':channel,'queue':[],'state':'ready'};

		return channel;
	};



	rtc.dropPeerConnection = function(connectionId,origin,mediatype,produced){

		var peerConnections = produced ? rtc.producedPeerConnections : rtc.receivedPeerConnections;

		if (!origin && !mediatype){
			delete peerConnections[connectionId];
		}else if (peerConnections[connectionId] && peerConnections[connectionId][origin] && peerConnections[connectionId][origin][mediatype]){

			//Close the peer connection and drop the element
			peerConnections[connectionId][origin][mediatype].close();
			delete peerConnections[connectionId][origin][mediatype];
			//Clean the array if needed
			rtc.cleanClosedConnection(peerConnections,connectionId,origin);
		}
	};

	rtc.cleanClosedConnection = function (peerConnections,connectionId,origin){
		if (!(peerConnections[connectionId][origin].audio || peerConnections[connectionId][origin].video || peerConnections[connectionId][origin].screen)){
			delete peerConnections[connectionId][origin];
			if (peerConnections[connectionId].length === 0){
				delete peerConnections[connectionId];	
			}
		}
	};
	
	rtc.removeStream = function (room,origin, mediatype){
	
		var streams = (origin === rtc._me)? rtc.streams : rtc.receivedStreams;  
		
		//look for the stream to remove
		var index = _.findIndex (streams,{'mediatype': mediatype, 'origin': origin});
		
		if (index > -1){
			var stream = streams[index];

			//Stop the stream
			stream.mediastream.stop();
			
			//If the room is in relay mode we should notify this operation to the server
			
			//remove each peer connection where we had
			for (var j=0; j < rtc.connections.length; j+=1 ){
				var connectionId = rtc.connections[j];
				//Drop produced peers
				rtc.dropPeerConnection(connectionId,origin,mediatype,true);
			}

			if (rtc.relay){
				rtc.relayStreamRemoved (origin,mediatype);	
			}else{
			//announceit to everybody
				rtc.streamClosed(room,origin,mediatype);
			}
			
			//get the stream out of the array
			rtc.streams.splice(index, 1);   

			//delete stream;
			rtc.numStreams-=1;
			rtc.initializedStreams-=1;
		}	
	};

	/*rtc.dropPeerConnections = function (origin,mediatype){
		// AQUI
		_.(producedConnections, {});
		
	}*/

	rtc.attachStream = function(stream, element) {
		if (typeof(element) === 'string') {
			element = document.getElementById(element);
		}
		if (navigator.mozGetUserMedia) {
			if (rtc.debug) { console.log('Attaching media stream'); }
			element.mozSrcObject = stream;
			element.play();
		} else {
			element.src = wkURL.createObjectURL(stream);
		}
		element.play();
	};


	/*loowid own calls*/
	rtc.updateOwnerData = function(roomId,ownerName,ownerAvatar,status,access){
		rtc.relay = access.relay;
		
		rtc._socket.send(JSON.stringify({
			'eventName': 'update_owner_data',
			'data': {
				'room': roomId,
				'ownerName':ownerName,
				'ownerAvatar':ownerAvatar,
				'status':status,
				'access':access
			}
		}));  
	};

	/*Since there is no good way to get an event of stream closed it's necessary a announcement from emiter*/
	//HERE
	rtc.streamClosed = function(roomId,origin,mediatype,target){
		rtc._socket.send(JSON.stringify({
			'eventName': 'stream_closed',
			'data': {
				'room': roomId,
				'mediatype':mediatype,
				'origin': origin,
				'target': target
			}
		}));  
	};



	rtc.askForScreen = function (room,connectionId,source){
		rtc._socket.send(JSON.stringify({
			'eventName': 'ask_for_sharing',
			'data': {
				'room': room,
				'source': source,
				'connectionId': connectionId,
			}
		}));
	};

	rtc.askForStopScreen = function (room,connectionId,source){
		rtc._socket.send(JSON.stringify({
			'eventName': 'ask_for_stop_sharing',
			'data': {
				'connectionId': connectionId,
				'room': room,
				'source': source
			}
		}));
	};

	rtc.askForAcceptFiles = function (room,fileOfferId,fileOffer){
		var filesInfo = {};

		for (var fileind in fileOffer.files){
			if (fileOffer.files.hasOwnProperty(fileind)) {
				var procFile = fileOffer.files[fileind];
				filesInfo[fileind]  = {'id':fileind, 'name': procFile.file.name, 'size': procFile.file.size};
			}
		}

		rtc._socket.send(JSON.stringify({
			'eventName': 'ask_for_accept_files',
			'data': {
				'connectionId': fileOffer.destinationId,
				'requestId': fileOfferId,
				'room': room,
				'filesinfo': filesInfo
			}
		}));

	};

	rtc.acceptFilesRequest = function (room,connectionId,requestId,token){
		rtc._socket.send(JSON.stringify({
			'eventName': 'accept_files_request',
			'data': {
				'connectionId': connectionId,
				'room': room,
				'requestId':requestId,
				'token':token
			}
		}));
	};

	rtc.fileDownloaded = function (room,connectionId,requestId,fileid){
		rtc._socket.send(JSON.stringify({
			'eventName': 'file_download_completed',
			'data': {
				'connectionId': connectionId,
				'room': room,
				'requestId':requestId,
				'fileid':fileid
			}
		}));
	};

	rtc.cancelFile = function (room,connectionId,requestId,fileid,token,direction){
		rtc._socket.send(JSON.stringify({
			'eventName': 'file_canceled',
			'data': {
				'connectionId': connectionId,
				'room': room,
				'requestId':requestId,
				'fileid':fileid,
				'token': token,
				'direction': direction
			}
		}));
	};

	rtc.allRequestCompleted = function (room,connectionId,requestId){
		rtc._socket.send(JSON.stringify({
			'eventName': 'files_request_completed',
			'data': {
				'connectionId': connectionId,
				'room': room,
				'requestId':requestId,
			}
		}));
	};

	rtc.fileRequestFailed = function (room,connectionId,requestId,error){
		rtc._socket.send(JSON.stringify({
			'eventName': 'files_request_error',
			'data': {
				'connectionId': connectionId,
				'room': room,
				'requestId':requestId,
				'error': error
			}
		}));
	};

	rtc.moveRoom = function (toRoom,fromRoom,users){
		rtc.room = toRoom;
		rtc._socket.send(JSON.stringify({
			'eventName': 'move_room',
			'data': {
				'toRoom': toRoom,
				'fromRoom': fromRoom,
				'list':users
			}
		}));
	};

	rtc.reportErrorToOwner = function (room,origin,type){
		rtc._socket.send(JSON.stringify({
			'eventName': 'error_to_owner',
			'data': {
				'room': room,
				'origin': origin,
				'type':type
			}
		}));
	};

	rtc.reportErrorToUser = function (room,origin,type){
		rtc._socket.send(JSON.stringify({
			'eventName': 'error_to_user',
			'data': {
				'room': room,
				'origin': origin,
				'type':type
			}
		}));
	};
	
	/**
	* RTC relay methods
	*/
	
	rtc.relay = false;
		
	rtc.relayStreamAdded = function (origin,type){
		rtc._socket.send(JSON.stringify({
			'eventName': 'r_stream_added',
			'data': {
				'room': rtc.room,
				'origin': origin,
				'type':type
			}
		}));
	};

	rtc.relayStreamRemoved = function (origin,type){
		rtc._socket.send(JSON.stringify({
			'eventName': 'r_stream_removed',
			'data': {
				'room': rtc.room,
				'origin': origin,
				'type':type
			}
		}));
	};
	
	rtc.relayShouldAccept = function (origin,type){
		rtc._socket.send(JSON.stringify({
			'eventName': 'r_should_accept',
			'data': {
				'room': rtc.room,
				'origin': origin,
				'type':type
			}
		}));
	};
	
	rtc.relaySendNodeInfo = function (nodeInfo){
		rtc._socket.send(JSON.stringify({
			'eventName': 'r_update_info',
			'data': {
				'room': rtc.room,
				'info': nodeInfo
			}
		}));
	};

	
	/**
	* Signals received from server (proposals)
	*/
	
	rtc.listenProposal = function(data) {
		if (rtc.debug){console.log ('Proposal received: ' + JSON.stringify (data));}


		//Look for the stream on streams or receivedstreams depending on the proposal info

		var propNumber = Math.random();

		for (var i=0; data.offers && i < data.offers.length; i+=1){
			var offer = data.offers[i]; 

			var streams = (offer.origin  === rtc._me) ? rtc.streams : rtc.receivedStreams;
			var streamMember = _.find (streams,{origin: offer.origin, mediatype: offer.type});

			if (streamMember){
				//Check if already have a connection
				rtc.relayStream (offer.target,streamMember,propNumber);
			}
		}

		//Stop the streaming of the resto of connections that were not in our received proposal
		rtc.dropOldProposalConnection(propNumber);
	};
	
	rtc.dropOldProposalConnection = function (propNumber){
		rtc.eachPeerConnection (rtc.producedPeerConnections,propNumber,[],0,function (pc,propNumber,params){
			if (rtc.producedPeerConnections[params[0]][params[1]][params[2]].propNumber !== propNumber){
				rtc.dropPeerConnection (params[0],params[1],params[2],true);
				rtc.streamClosed (rtc.room,params[1],params[2],params[0]);
			}
		});
	};
	
 	//Execute the function when recursively found a PeerConnection Object in the array
	rtc.eachPeerConnection = function (lookForObject,propNumber,params,level, foundFn){
		
		for (var objIndex in lookForObject){
			if (lookForObject.hasOwnProperty(objIndex)){
				//clone the rout array
				var currentParams = params.length > 0 ? params.slice(0) : params;
				currentParams[level] = objIndex;
				
				if (lookForObject[objIndex] instanceof PeerConnection){
					foundFn(lookForObject[objIndex],propNumber,currentParams);
				}else{
					var nextLevel = level + 1;
					rtc.eachPeerConnection (lookForObject[objIndex],propNumber,currentParams,nextLevel,foundFn);			
				}
			}
		}	
	};
				
	rtc.relayStream  = function(connectionid,stream,propNumber){
	
		//if it's not yet sent through a peer connection create it and send
		if (!rtc.producedPeerConnections[connectionid] || 
				!rtc.producedPeerConnections[connectionid][stream.origin] || 
				!rtc.producedPeerConnections[connectionid][stream.origin][stream.mediatype]) {
			var pc = rtc.createPeerConnection(connectionid,stream.origin,stream.mediatype,true);
			pc.addStream(stream.mediastream);
			rtc.sendOffer (connectionid,stream.origin,stream.mediatype);
		}

		//Set a number for the pc
		rtc.producedPeerConnections[connectionid][stream.origin][stream.mediatype].propNumber = propNumber;

	};


}).call();

	