'use strict';
/*global webkitMediaStream: true */
/*global webkitRTCPeerConnection: true */
/*global getScreenId: true */
/*global MediaStream: true */
//CLIENT

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

			rtc.on('ready', function(mediatype,maxBitrate) {
				///This process is for produced connections
				rtc.createPeerConnections(mediatype);
				rtc.addStreams(mediatype);
				rtc.sendOffers(mediatype,maxBitrate);
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

				if (!peerConnections[data.socketId]){
					peerConnections [data.socketId]= {};
				}

				//In case that many errors receivce just accept relay candidates

				//We store temporaly candidates
				if (!peerConnections[data.socketId][data.mediatype]){
					if (rtc.debug) { console.log ('Peer not ready, so storing ICE candidate for a while'); }
					if (!peerConnections[data.socketId]['temp_'+data.mediatype]) {
						peerConnections[data.socketId]['temp_'+data.mediatype] = [];
					}
            		peerConnections[data.socketId]['temp_'+data.mediatype].push(candidate);
					return;
				}else{
					peerConnections[data.socketId][data.mediatype].addIceCandidate(candidate,
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
				var sendDelayedOffer =  function (id, mediatype){
					setTimeout (function (){
						rtc.sendOffer (id,mediatype);
						if (rtc.debug) { console.log ('Sending to ' + id + ' a ' + mediatype + 'offer'); }
					},2000);
				};

				for (var i = 0; i < rtc.streams.length; i+=1){
					var stream = rtc.streams[i].mediastream;
					var mediatype = rtc.streams[i].mediatype;
					var pc = rtc.createPeerConnection(id,mediatype,true);
					pc.addStream(stream);
					sendDelayedOffer (id,mediatype);
				}


			});

			rtc.on('remove_peer_connected', function(data) {
				var id = data.socketId;

				//TODO disconnect stream -> disconnect user
				rtc.fire('disconnect stream', id);
				delete rtc.dataChannels[id];

				for (var i=0; i<rtc.sources.length && rtc.receivedPeerConnections[id]; i+=1){
					if (rtc.receivedPeerConnections[id][rtc.sources[i]]) {
						//delete received stream peers
						rtc.dropPeerConnection(id,rtc.sources[i],false);
					}
				}


				for (var i2=0; i2<rtc.sources.length && rtc.producedPeerConnections[id]; i2+=1){
					if (rtc.producedPeerConnections[id][rtc.sources[i2]]) {
						//delete produced stream peers
						rtc.dropPeerConnection(id,rtc.sources[i2],true);
					}
				}

				for (var j=0; j < rtc.connections.length; j+=1 ){
					if(rtc.connections[j] === id){
						rtc.connections.splice(j,1);
						return;
					}
				}

			});

			rtc.on('receive_offer', function(data) {
				if (data.mediatype.indexOf('filedata') !== -1){
					rtc.fire ('receive file offer',data);
				}else{
					//if not an file offer accept directly ??? mmmm problem?
					rtc.receiveOffer(data.socketId, data.sdp, data.mediatype);
					rtc.fire('receive offer', data);
				}
			});

			rtc.on('receive_answer', function(data) {
				rtc.receiveAnswer(data.socketId, data.sdp, data.mediatype);

				rtc.fire('receive answer', data);
			});

			rtc.fire('connect');
		};
	};


	rtc.sendOffers = function(mediatype,maxBitrate) {
		for (var i = 0, len = rtc.connections.length; i < len; i+=1) {
			var socketId = rtc.connections[i];

			//take care
			rtc.sendOffer(socketId,mediatype,maxBitrate);
		}
	};

	rtc.onClose = function(data) {
		rtc.on('close_stream', function() {
			rtc.fire('close_stream', data);
		});
	};

	rtc.createPeerConnections = function(mediatype) {
		for (var i = 0; i < rtc.connections.length; i+=1) {
			rtc.createPeerConnection(rtc.connections[i],mediatype,true);
		}
	};

	rtc.createPeerConnection = function(id,mediatype,produced,requestId) {

		var peerConnections = produced ? rtc.producedPeerConnections : rtc.receivedPeerConnections;

		var config = rtc.pcConstraints;

		if (!peerConnections[id]){
			peerConnections[id] = {};
		}

		//if (!peerConnections[id][mediatype]){
		peerConnections[id][mediatype] = new PeerConnection({iceServers:rtc.iceServers}, config);
		//}


		var pc = peerConnections[id][mediatype];

		pc.onicecandidate = function(event) {
			if (event.candidate && event.candidate.candidate) {

				//Filter and
				if (peerConnections[id].resetCount && peerConnections[id].resetCount > 2) {
						if (rtc.debug) { console.log ('Filtering the ice candidates'); }
						if(event.candidate.candidate.match(/candidate.*typ host/g)) {
							return;
						}
						if (event.candidate.candidate.match(/candidate.*typ srflx/g)){
							return;
						}
				}

				if (rtc.debug) { console.log ('Sending an ICE candidate'); }
				rtc._socket.send(JSON.stringify({
					'eventName': 'send_ice_candidate',
					'data': {
						'label': event.candidate.sdpMLineIndex,
						'candidate': event.candidate.candidate,
						'socketId': id,
						'mediatype': mediatype,
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
						rtc.fire('add remote stream', event.stream, id,mediatype);
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
					'produced': produced,
					'room': rtc.room
				}
			}));

			//Let 5 secs to ensure that connection is not recovered and try it
			if (produced && (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' )){
						if (rtc.debug) { console.log ('The connection has been ' + pc.iceConnectionState ); }
						setTimeout (function () {
							if (pc && (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' )){
								pc.restartConnection();
							}
					},5000);
			}

			pc.propagateState();

			if (rtc.debug) { console.log ('User id: ' + id + ' changed : ' + pc.iceConnectionState +  ' mediatype' + mediatype); }
		};

		pc.ondatachannel = function(evt) {
			if (rtc.debug) { console.log('data channel connecting ' + id); }
			rtc.addDataChannel(id, evt.channel,requestId,mediatype);
		};

		pc.propagateState = function () {
			//Update the state
			var connState;

			if (pc.iceConnectionState==='starting'){
				connState = 'starting';
			}else if (pc.iceConnectionState==='checking' ){
				connState = 'negotiating';
			}else if (pc.iceConnectionState==='completed' || pc.iceConnectionState === 'connected'){
				connState = 'streaming';
			}else if (pc.iceConnectionState === 'failed' && pc.iceConnectionState === 'disconnected'){
				connState = 'failed';
			} else if (pc.iceConnectionState === 'closed') {
				connState = 'ended';
			}

			rtc.fire ('connection changed',
				{'state': connState, 'userid': id, 'mediatype': mediatype, produced: produced});
		};

		pc.restartConnection = function() {

				if (rtc.debug) { console.log ('The connection still ' + pc.iceConnectionState ); }

				if (!rtc.producedPeerConnections[id].resetCount) {
					rtc.producedPeerConnections[id].resetCount = 1;
				}else {
					rtc.producedPeerConnections[id].resetCount+=1;
				}

				for (var i = 0; i < rtc.streams.length; i+=1) {
					var streamObj = rtc.streams[i];
					if (streamObj.mediatype === mediatype){
							//It already exists so let's try to connect this PeerConnection
							if (rtc.debug) { console.log ('Sending a new connection '); }
							rtc.dropPeerConnection (id,mediatype,true);

							rtc.createPeerConnection(id,mediatype,true);
							if (rtc.addStream(id,mediatype)) {
								rtc.sendOffer(id,mediatype);
							} else {
								rtc.dropPeerConnection(id,mediatype,true);
							}
					}
				}
			};
		return pc;
	};


	rtc.sendOffer = function(socketId,mediatype,maxBitrate,requestId,token) {
		var pc = rtc.producedPeerConnections[socketId][mediatype];

		var constraints = {
			'optional': [],
			'mandatory': {
				'MozDontOfferDataChannel': true
			}
		};
		// temporary measure to remove Moz* constraints in Chrome
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

	rtc.receiveOffer = function(socketId, sdp, mediatype,requestId) {
		//var pcs = rtc.receivedPeerConnections[socketId];

		if (!rtc.receivedPeerConnections[socketId]){
			rtc.receivedPeerConnections[socketId] = {};
		}

		var pc = rtc.receivedPeerConnections[socketId][mediatype];

		//if it's a new peer but it alrready exist must be destroyed first
		if (pc !== undefined){
			if (rtc.debug) { console.log ('Destroyed previous connection'); }
			rtc.dropPeerConnection(socketId,mediatype,false);
		}

		if (rtc.debug) { console.log ('Create a new one connection'); }

		pc = rtc.createPeerConnection(socketId,mediatype,false,requestId);

		if (rtc.debug) { console.log ('Send a new annser'); }
		rtc.sendAnswer(socketId, sdp,mediatype);
	};

	rtc.sendAnswer = function(socketId, sdp, mediatype){
		var pc = rtc.receivedPeerConnections[socketId][mediatype];
		var sdpConstraints = rtc.sourceSdpConstraints[mediatype];

		pc.setRemoteDescription(new nativeRTCSessionDescription(sdp),
			function (){
				//Finaly look for already stored messages and flush them
				if (rtc.receivedPeerConnections[socketId]['temp_'+mediatype]){
					var sfn = function (){ if (rtc.debug) { console.log ('ICE candidate added'); } };
					var ffn = function (error) { if (rtc.debug) { console.log ('Error adding ICE candiate' + JSON.stringify (error)); } };
					for (var i=0; i< rtc.receivedPeerConnections[socketId]['temp_'+mediatype].length; i+=1){
						var storedIceCandidate = rtc.receivedPeerConnections[socketId]['temp_'+mediatype][i];
						pc.addIceCandidate(storedIceCandidate,sfn,ffn);
					}

					delete rtc.receivedPeerConnections [socketId]['temp_'+mediatype];
				}


				pc.createAnswer(function(sessionDescription) {
					pc.setLocalDescription(sessionDescription, function (){
						rtc._socket.send(JSON.stringify({
							'eventName': 'send_answer',
							'data': {
								'socketId': socketId,
								'sdp': sessionDescription,
								'mediatype': mediatype
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


	rtc.receiveAnswer = function(socketId,sdp,mediatype) {
		var pc = rtc.producedPeerConnections[socketId][mediatype];
		pc.setRemoteDescription(new nativeRTCSessionDescription(sdp),function (){
			setTimeout(function(){
				if (rtc.debug) { console.log('PCICE::::'+ pc.iceConnectionState); }
				if (pc.iceConnectionState === 'checking') {
					if (rtc.debug) { console.log('Seems that the state is stalled !!'); }
						pc.restartConnection();
				}
			}, 15000);

		},function () {
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

					rtc.streams.push(streamObj);
					rtc.initializedStreams+=1;
					onSuccess(stream);
					if (rtc.initializedStreams === rtc.numStreams) {
						rtc.fire('ready', mediatype,maxBitrate);
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

	rtc.addStreams = function(mediatype) {
		for (var i = 0; i < rtc.streams.length; i+=1) {
			var streamObj = rtc.streams[i];
			if (streamObj.mediatype === mediatype){
				for (var connection in rtc.producedPeerConnections) {
					if (rtc.producedPeerConnections.hasOwnProperty(connection)) {
						rtc.producedPeerConnections[connection][mediatype].addStream(streamObj.mediastream);
					}
				}
			}
		}
	};

	rtc.addStream = function (connectionId,mediatype){
		var streamAdded = false;


		for (var i = 0; i < rtc.streams.length; i+=1) {
			var streamObj = rtc.streams[i];
			if (streamObj.mediatype === mediatype){
				rtc.producedPeerConnections[connectionId][mediatype].addStream(streamObj.mediastream);
				streamAdded = true;
			}
		}
		return streamAdded;
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
			rtc.createPeerConnection(id,mediatypefile,true);
			rtc.createDataChannel(id,requestId,mediatypefile);
			rtc.sendOffer (id,mediatypefile,undefined,requestId,token);
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



	rtc.dropPeerConnection = function(connectionId,mediatype,produced){

		var peerConnections = produced ? rtc.producedPeerConnections : rtc.receivedPeerConnections;

		if (peerConnections[connectionId]){
			if (peerConnections[connectionId][mediatype]){
				peerConnections[connectionId][mediatype].close();
				delete peerConnections[connectionId][mediatype];
			}

			/* We will conserve the peerConnection status to handle previous erros.
			if (!(peerConnections[connectionId].audio || peerConnections[connectionId].video || peerConnections[connectionId].screen)){
				delete peerConnections[connectionId];
			}
			*/
		}
	};

	rtc.removeStream = function (room, mediatype){

		for (var i = 0; i < rtc.streams.length; i+=1) {

			var stream = rtc.streams[i];

			if (mediatype === stream.mediatype){

				//Stop the stream
				var track = stream.mediastream.getTracks()[0];
				track.stop();

				//remove each peer connection where we had

				for (var j=0; j < rtc.connections.length; j+=1 ){
					var connectionId = rtc.connections[j];
					//Drop produced peers
					rtc.dropPeerConnection(connectionId,mediatype,true);
				}


				//announceit
				rtc.streamClosed(room,mediatype);

				//get the stream out of the array
				rtc.streams.splice(i, 1);

				//delete stream;
				rtc.numStreams-=1;
				rtc.initializedStreams-=1;
				return;
			}
		}
	};


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
	rtc.streamClosed = function(roomId,mediatype){
		rtc._socket.send(JSON.stringify({
			'eventName': 'stream_closed',
			'data': {
				'room': roomId,
				'mediatype':mediatype
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


}).call();
