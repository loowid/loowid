//CLIENT

// Fallbacks for vendor-specific variables until the spec is finalized.

var PeerConnection = (window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
var URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
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
}else if (navigator.mozGetUserMedia){

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
		if (rtc._socket) rtc._socket.close();
		if (rtc.pingInterval) window.clearInterval(rtc.pingInterval);
		rtc._me = null;
		rtc._events = {};
		rtc.pingInterval = null;
		rtc.connected = false;
	}

	rtc.uniqueon = function(eventName, callback) {
		if (rtc._events[eventName]) {
			delete rtc._events[eventName];
		}
		rtc.on(eventName,callback);
	}

	rtc.deleteEvent = function(eventName) {
		if (rtc._events[eventName]) {
			delete rtc._events[eventName];
		}
	}


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


		for (var i = 0, len = events.length; i < len; i++) {
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

	rtc.pc_constraints = {
		"optional": [{
			"DtlsSrtpKeyAgreement": true
		}]
	};

	//rtc.chromeDesktopExtensionId = 'ampjliekoheiopmpnjcihakbcjaplkad';
	rtc.chromeDesktopExtensionId = 'lalali';
	/**
   * Keep connection open
   */
	rtc.ping = function() {
		rtc._socket.send(JSON.stringify({"eventName": "ping","data": {"room": rtc.room}}));
	}

	rtc.peerListUpdated = function(room) {
		rtc._socket.send(JSON.stringify({"eventName": "peer_list_updated","data": {"room": room}}));
	}

	rtc.sendChatMessage = function(room,message) {
		rtc._socket.send(JSON.stringify({"eventName": "chat_message","data": {"room": room,"text":message}}));
	}

	/**
   * Connects to the websocket server.
   */
	rtc.connect = function(server, room, password, reload) {
		room = room || ""; // by default, join a room called the blank string
		rtc._socket = new WebSocket(server);
		rtc.room = room;
		rtc._socket.onopen = function() {


			rtc.askForUpdateConfig = function (room){
				rtc._socket.send(JSON.stringify({
					"eventName": "update_server_config",
					"data": {
						"room": room
					}
				}));
			};	

			rtc.on ('get_updated_config', function (data){
				rtc.iceServers = data.iceServers;
				rtc.chromeDesktopExtensionId = data.chromeDesktopExtensionId;

				if (rtc.debug) console.log ('serverList updated' + JSON.stringify (rtc.iceServers));
				if (rtc.debug) console.log ('extension id ' + rtc.chromeDesktopExtensionId);
			});	

			rtc.askForUpdateConfig(); 	


			//Just connect to the room if you have a valid server list

			rtc.tryToConnect = function (troom,tpassword,treload){
				if (rtc.iceServers != undefined && rtc.iceServers.length >0){
					//Join to the room
					rtc._socket.send(JSON.stringify({
						"eventName": "join_room",
						"data": {
							"room": troom,
							"pwd": tpassword,
							"reload": treload
						}
					}));

					// Keep connection open
					rtc.pingInterval = setInterval('rtc.ping();',5000);

				}else{
					setTimeout (function (){
						rtc.tryToConnect(troom,tpassword,treload)	
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
				rtc._socket = null;
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
				var candidate = new nativeRTCIceCandidate(data);

				var peerConnections = data.produced ? rtc.receivedPeerConnections: rtc.producedPeerConnections;

				if (!peerConnections[data.socketId]){
					peerConnections [data.socketId]= {};
				}

				//We store temporaly candidates
				if (!peerConnections[data.socketId][data.mediatype]){
					/* peerConnections[data.socketId]["temp_"+data.mediatype] = [];
            peerConnections[data.socketId]["temp_"+data.mediatype].push(candidate);*/
				}else{
					peerConnections[data.socketId][data.mediatype].addIceCandidate(candidate);
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
						if (rtc.debug) console.log ("Sending to " + id + " a " + mediatype + "offer");
					},2000);
				};  

				for (var i = 0; i < rtc.streams.length; i++){
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

				for (var i=0; i<rtc.sources.length && rtc.receivedPeerConnections[id]; i++){
					if (rtc.receivedPeerConnections[id][rtc.sources[i]])
						//delete received stream peers
						rtc.dropPeerConnection(id,rtc.sources[i],false);
				}


				for (var i=0; i<rtc.sources.length && rtc.producedPeerConnections[id]; i++){
					if (rtc.producedPeerConnections[id][rtc.sources[i]])
						//delete produced stream peers
						rtc.dropPeerConnection(id,rtc.sources[i],true);
				}

				for (var j=0; j < rtc.connections.length; j++ ){
					if(rtc.connections[j] === id){
						rtc.connections.splice(j,1);
						return;
					}
				}

			});

			rtc.on('receive_offer', function(data) {
				if (data.mediatype.indexOf("filedata") != -1){
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
		for (var i = 0, len = rtc.connections.length; i < len; i++) {
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
		for (var i = 0; i < rtc.connections.length; i++) {
			rtc.createPeerConnection(rtc.connections[i],mediatype,true);
		}
	};

	rtc.createPeerConnection = function(id,mediatype,produced,requestId) {

		var peerConnections = produced ? rtc.producedPeerConnections : rtc.receivedPeerConnections;

		var config = rtc.pc_constraints;

		if (!peerConnections[id]){
			peerConnections[id] = {};
		}

		//if (!peerConnections[id][mediatype]){
		peerConnections[id][mediatype] = new PeerConnection({iceServers:rtc.iceServers}, config);
		//}

		var pc = peerConnections[id][mediatype];

		pc.onicecandidate = function(event) {
			if (event.candidate) {
				rtc._socket.send(JSON.stringify({
					"eventName": "send_ice_candidate",
					"data": {
						"label": event.candidate.sdpMLineIndex,
						"candidate": event.candidate.candidate,
						"socketId": id,
						"mediatype": mediatype,
						"produced": produced
					}
				}));
			}
			rtc.fire('ice candidate', event.candidate);
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
				if (pc != null){
					if ( pc.iceConnectionState === 'completed' || pc.iceConnectionState == 'connected'){
						if (rtc.debug) console.log ("the connection was completed send the data");
						rtc.fire('add remote stream', event.stream, id,mediatype);
					}else{
						setTimeout (function (){
							if (rtc.debug) console.log ('Remote stream not added yet. Try : ' + tries);
							tries ++;
							if (tries < 10) tryStream();
						},1500);
					}
				}
			};
			tryStream();

		};

		pc.oniceconnectionstatechange = function (event){
			if (rtc.debug) console.log ('User id: ' + id + ' changed : ' + pc.iceConnectionState +  ' mediatype' + mediatype);
		}

		pc.ondatachannel = function(evt) {
			if (rtc.debug) console.log('data channel connecting ' + id);
			rtc.addDataChannel(id, evt.channel,requestId,mediatype);
		};

		return pc;
	};

	rtc.sendOffer = function(socketId,mediatype,maxBitrate,requestId,token) {
		var pc = rtc.producedPeerConnections[socketId][mediatype];

		var constraints = {
			"optional": [],
			"mandatory": {
				"MozDontOfferDataChannel": true
			}
		};
		// temporary measure to remove Moz* constraints in Chrome
		if (navigator.webkitGetUserMedia) {
			for (var prop in constraints.mandatory) {
				if (prop.indexOf("Moz") != -1) {
					delete constraints.mandatory[prop];
				}
			}
		}

		//It should be more generic
		var sourceType = "";
		var sourceType = mediatype.indexOf("filedata") != -1 ? "filedata" : mediatype;

		var sdpConstraints = rtc.sourceSdpConstraints[sourceType];


		constraints = mergeConstraints(constraints, sdpConstraints);

		pc.createOffer(function(session_description) {
			//session_description.sdp = preferOpus(session_description.sdp);
			if (maxBitrate){
				session_description.sdp = changeBitrate(session_description.sdp,maxBitrate); 
			}
			pc.setLocalDescription(session_description, function (){
				rtc._socket.send(JSON.stringify({
					"eventName": "send_offer",
					"data": {
						"socketId": socketId,
						"sdp": session_description,
						"mediatype": mediatype,
						"room": rtc.room,
						"requestId": requestId,
						"token" : token
					}
				}));						 
			},
								   function (){
									   if (rtc.debug) console.log ("Error setting the local description");
								   }	
								  );

		}, function (){
			if (rtc.debug) console.log ("Error creating the offer");
		}, sdpConstraints);
	};

	rtc.receiveOffer = function(socketId, sdp, mediatype,requestId) {
		var pcs = rtc.receivedPeerConnections[socketId];

		if (!rtc.receivedPeerConnections[socketId]){
			rtc.receivedPeerConnections[socketId] = {};
		}

		var pc = rtc.receivedPeerConnections[socketId][mediatype];

		//if it's a new peer but it alrready exist must be destroyed first
		if (pc != undefined){
			if (rtc.debug) console.log ("Destroyed previous connection");
			rtc.dropPeerConnection(socketId,mediatype,false);
		}

		if (rtc.debug) console.log ("Create a new one connection");

		pc = rtc.createPeerConnection(socketId,mediatype,false,requestId);

		if (rtc.debug) console.log ("Send a new annser");
		rtc.sendAnswer(socketId, sdp,mediatype);
	};

	rtc.sendAnswer = function(socketId, sdp, mediatype){
		var pc = rtc.receivedPeerConnections[socketId][mediatype];
		var sdpConstraints = rtc.sourceSdpConstraints[mediatype];

		pc.setRemoteDescription(new nativeRTCSessionDescription(sdp),
								function (){

									pc.createAnswer(function(session_description) {

										pc.setLocalDescription(session_description, function (){

											rtc._socket.send(JSON.stringify({
												"eventName": "send_answer",
												"data": {
													"socketId": socketId,
													"sdp": session_description,
													"mediatype": mediatype
												}
											}));

										},function (){
											if (rtc.debug) console.log ("Error setting local description ");	
										});
										//TODO Unused variable!?
										var offer = pc.remoteDescription;
									}, function (){
										if (rtc.debug) console.log ("Error creating the anwer ");	
									}, sdpConstraints);

								}, function (){
									if (rtc.debug) console.log ("Error setting retmote description ");	
								});
	};


	rtc.receiveAnswer = function(socketId,sdp,mediatype) {
		var pc = rtc.producedPeerConnections[socketId][mediatype];
		pc.setRemoteDescription(new nativeRTCSessionDescription(sdp),function (){
			setTimeout(function(){
				if (rtc.debug) console.log("PCICE::::"+pc.iceConnectionState);
				if (pc.iceConnectionState == "checking") {
					if (rtc.debug) console.log("Seems that the state is stalled !!");

					//Borramos la posible peer
					rtc.dropPeerConnection(socketId,mediatype,true);

					//Creamos una peer nueva
					rtc.createPeerConnection(socketId,mediatype,true);
					rtc.addStream(socketId,mediatype);
					rtc.sendOffer(socketId,mediatype);
				}						
			},10000);

		},function (){
			if (rtc.debug) console.log ("Error setting remote description");
		});

	};

	rtc.createStream = function(mediatype,options,onSuccess,onFail,maxBitrate) {

		onSuccess = onSuccess || function() {};
		onFail = onFail || function() {};

		if (getUserMedia) {
			var startStream = function (){
				rtc.numStreams++;
				getUserMedia.call(navigator, options, function(stream) {
					var streamObj = {};
					streamObj.mediastream = stream;
					streamObj.mediatype = mediatype;

					rtc.streams.push(streamObj);
					rtc.initializedStreams++;
					onSuccess(stream);
					if (rtc.initializedStreams === rtc.numStreams) {
						rtc.fire('ready', mediatype,maxBitrate);
					}
				}, function(error) {
					//alert("Could not connect stream.");
					onFail(error);
				});
			};

			if (mediatype === 'screen'){
				getScreenId(rtc.chromeDesktopExtensionId,function (error, sourceId, screen_constraints) {
					if (error) onFail (error);
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
		for (var i = 0; i < rtc.streams.length; i++) {
			var streamObj = rtc.streams[i];
			if (streamObj.mediatype === mediatype){
				for (var connection in rtc.producedPeerConnections) {
					rtc.producedPeerConnections[connection][mediatype].addStream(streamObj.mediastream);
				}
			}
		}
	};

	rtc.addStream = function (connectionId,mediatype){
		for (var i = 0; i < rtc.streams.length; i++) {
			var streamObj = rtc.streams[i];
			if (streamObj.mediatype === mediatype){
				rtc.producedPeerConnections[connectionId][mediatype].addStream(streamObj.mediastream);
			}
		}
	};

	rtc.sendMessage = function (id,mediatype,message,requestId,token){


		var mediatypefile = mediatype+"_"+requestId;

		if (!rtc.dataChannels[id] || !rtc.dataChannels[id][mediatypefile]){
			rtc.createPeerConnection(id,mediatypefile,true);
			rtc.createDataChannel(id,requestId,mediatypefile);
			rtc.sendOffer (id,mediatypefile,undefined,requestId,token);
		}

		var channel = rtc.dataChannels[id][mediatypefile].channel;
		var queue = rtc.dataChannels[id][mediatypefile].queue;
		var state = rtc.dataChannels[id][mediatypefile].state;

		if (message)
			queue.push (message);


		if (state  === 'ready'){
			var eventName = 'data stream open ' +  id  + ' ' + mediatypefile;

			if (channel.readyState === 'open' ){

				while (queue.length > 0){
					try {
						var object = queue [0];
						channel.send (JSON.stringify(object));  
						queue.shift();
					}catch (event){
						//We got a network problem, maybe the buffer is full, lets try it later
						rtc.dataChannels[id][mediatypefile].state = 'paused';
						setTimeout (function (){
							rtc.dataChannels[id][mediatypefile].state = 'ready';
							rtc.sendMessage (id,mediatype,undefined,requestId,token); //Fire the send message for this queue
						},50);
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
		}
	}

	/*  rtc.removeStreams = function (){

    for (var i = 0; i < rtc.streams.length; i++) {
      var stream = rtc.streams[i];
      stream.mediastream.stop();
    }

    rtc.streams = [];
    rtc.numStreams = 0;
    rtc.initializedStreams = 0;
  };*/

	rtc.createDataChannel = function(id,requestId,mediatypefile) {

		if (!id) throw new Error('attempt to createDataChannel with unknown id');


		var userPeerList = rtc.producedPeerConnections[id];
		var pc = undefined;

		if (userPeerList && userPeerList[mediatypefile]) {
			pc = userPeerList[mediatypefile];
		}else{
			throw new Error('attempt to createDataChannel without peerConnection');
		}


		label = mediatypefile || String(id);

		// chrome only supports reliable false atm.
		var options = {
			reliable: false
		};

		var channel;
		try {
			if (rtc.debug) console.log('createDataChannel ' + id + ' ' + mediatypefile); 
			channel = pc.createDataChannel(label, options);
		} catch (error) {
			if (rtc.debug) console.log('seems that DataChannel is NOT actually supported!');
			throw error;
		}

		return rtc.addDataChannel(id,channel,requestId,mediatypefile);
	};


	rtc.addDataChannel = function(id, channel, requestId,mediatypefile) {

		channel.onopen = function() {
			if (rtc.debug) console.log('data stream open ' + mediatypefile);
			// We will fire a different open event for each id or channel
			rtc.fire('data stream open ' + id+ ' ' + mediatypefile, channel);
		};

		channel.onclose = function(event) {
			delete rtc.dataChannels[id][mediatypefile];
			if (rtc.debug) console.log('data stream close ');
			rtc.fire('data stream close', channel);
		};

		channel.onmessage = function(event) {
			if (rtc.debug) console.log('data stream message ' + id + ' ' + event.data);
			rtc.fire('data stream data', channel,id, requestId, mediatypefile, event.data);
		};

		channel.onerror = function(err) {
			if (rtc.debug) console.log('data stream error ' + id + ': ' + err);
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
			if (!(peerConnections[connectionId].audio || peerConnections[connectionId].video || peerConnections[connectionId].screen)){
				delete peerConnections[connectionId];
			}
		}
	}

	rtc.removeStream = function (room, mediatype){

		for (var i = 0; i < rtc.streams.length; i++) {

			var stream = rtc.streams[i];

			if (mediatype === stream.mediatype){

				//Stop the stream
				stream.mediastream.stop();

				//remove each peer connection where we had

				for (var j=0; j < rtc.connections.length; j++ ){
					var connectionId = rtc.connections[j];
					//Drop produced peers
					rtc.dropPeerConnection(connectionId,mediatype,true);
				}


				//announceit
				rtc.streamClosed(room,mediatype);

				//get the stream out of the array
				rtc.streams.splice(i, 1);   

				//delete stream;
				rtc.numStreams--;
				rtc.initializedStreams--;
				return;
			}
		}
	};


	rtc.attachStream = function(stream, element) {
		if (typeof(element) === "string")
			element = document.getElementById(element);
		if (navigator.mozGetUserMedia) {
			if (rtc.debug) console.log("Attaching media stream");
			element.mozSrcObject = stream;
			element.play();
		} else {
			element.src = webkitURL.createObjectURL(stream);
		}
		element.play();
	};


	/*loowid own calls*/
	rtc.updateOwnerData = function(roomId,ownerName,ownerAvatar,status,access){
		rtc._socket.send(JSON.stringify({
			"eventName": "update_owner_data",
			"data": {
				"room": roomId,
				"owner_name":ownerName,
				"owner_avatar":ownerAvatar,
				"status":status,
				"access":access
			}
		}));  
	};

	/*Since there is no good way to get an event of stream closed it's necessary a announcement from emiter*/
	//HERE
	rtc.streamClosed = function(roomId,mediatype){
		rtc._socket.send(JSON.stringify({
			"eventName": "stream_closed",
			"data": {
				"room": roomId,
				"mediatype":mediatype
			}
		}));  
	};



	rtc.askForScreen = function (room,connectionId,source){
		rtc._socket.send(JSON.stringify({
			"eventName": "ask_for_sharing",
			"data": {
				"room": room,
				"source": source,
				"connectionId": connectionId,
			}
		}));
	};

	rtc.askForStopScreen = function (room,connectionId,source){
		rtc._socket.send(JSON.stringify({
			"eventName": "ask_for_stop_sharing",
			"data": {
				"connectionId": connectionId,
				"room": room,
				"source": source
			}
		}));
	};

	rtc.askForAcceptFiles = function (room,fileOfferId,fileOffer){
		var filesInfo = {};

		for (fileind in fileOffer.files){
			var procFile = fileOffer.files[fileind]
			filesInfo[fileind]  = {'id':fileind, 'name': procFile.file.name, 'size': procFile.file.size};
		}

		rtc._socket.send(JSON.stringify({
			"eventName": "ask_for_accept_files",
			"data": {
				"connectionId": fileOffer.destinationId,
				"requestId": fileOfferId,
				"room": room,
				"filesinfo": filesInfo
			}
		}));

	};

	rtc.acceptFilesRequest = function (room,connectionId,requestId,token){
		rtc._socket.send(JSON.stringify({
			"eventName": "accept_files_request",
			"data": {
				"connectionId": connectionId,
				"room": room,
				"requestId":requestId,
				"token":token
			}
		}));
	};

	rtc.fileDownloaded = function (room,connectionId,requestId,fileid){
		rtc._socket.send(JSON.stringify({
			"eventName": "file_download_completed",
			"data": {
				"connectionId": connectionId,
				"room": room,
				"requestId":requestId,
				"fileid":fileid
			}
		}));
	};

	rtc.cancelFile = function (room,connectionId,requestId,fileid,token,direction){
		rtc._socket.send(JSON.stringify({
			"eventName": "file_canceled",
			"data": {
				"connectionId": connectionId,
				"room": room,
				"requestId":requestId,
				"fileid":fileid,
				"token": token,
				"direction": direction
			}
		}));
	};

	rtc.allRequestCompleted = function (room,connectionId,requestId){
		rtc._socket.send(JSON.stringify({
			"eventName": "files_request_completed",
			"data": {
				"connectionId": connectionId,
				"room": room,
				"requestId":requestId,
			}
		}));
	};

	rtc.fileRequestFailed = function (room,connectionId,requestId,error){
		rtc._socket.send(JSON.stringify({
			"eventName": "files_request_error",
			"data": {
				"connectionId": connectionId,
				"room": room,
				"requestId":requestId
			}
		}));
	};

	rtc.moveRoom = function (toRoom,fromRoom,users){
		rtc.room = toRoom;
		rtc._socket.send(JSON.stringify({
			"eventName": "move_room",
			"data": {
				"toRoom": toRoom,
				"fromRoom": fromRoom,
				"list":users
			}
		}));
	};

	rtc.reportErrorToOwner = function (room,origin,type){
		rtc._socket.send(JSON.stringify({
			"eventName": "error_to_owner",
			"data": {
				"room": room,
				"origin": origin,
				"type":type
			}
		}));
	};

	rtc.reportErrorToUser = function (room,origin,type){
		rtc._socket.send(JSON.stringify({
			"eventName": "error_to_user",
			"data": {
				"room": room,
				"origin": origin,
				"type":type
			}
		}));
	};


}).call(this);

function preferOpus(sdp) {
	var sdpLines = sdp.split('\r\n');
	var mLineIndex = null;
	// Search for m line.
	for (var i = 0; i < sdpLines.length; i++) {
		if (sdpLines[i].search('m=audio') !== -1) {
			mLineIndex = i;
			break;
		}
	}
	if (mLineIndex === null) return sdp;

	// If Opus is available, set it as the default in m line.
	for (var j = 0; j < sdpLines.length; j++) {
		if (sdpLines[j].search('opus/48000') !== -1) {
			var opusPayload = extractSdp(sdpLines[j], /:(\d+) opus\/48000/i);
			if (opusPayload) sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
			break;
		}
	}

	// Remove CN in m line and sdp.
	sdpLines = removeCN(sdpLines, mLineIndex);

	sdp = sdpLines.join('\r\n');
	return sdp;
}

function extractSdp(sdpLine, pattern) {
	var result = sdpLine.match(pattern);
	return (result && result.length == 2) ? result[1] : null;
}

function setDefaultCodec(mLine, payload) {
	var elements = mLine.split(' ');
	var newLine = [];
	var index = 0;
	for (var i = 0; i < elements.length; i++) {
		if (index === 3) // Format of media starts from the fourth.
			newLine[index++] = payload; // Put target payload to the first.
		if (elements[i] !== payload) newLine[index++] = elements[i];
	}
	return newLine.join(' ');
}

function removeCN(sdpLines, mLineIndex) {
	var mLineElements = sdpLines[mLineIndex].split(' ');
	// Scan from end for the convenience of removing an item.
	for (var i = sdpLines.length - 1; i >= 0; i--) {
		var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
		if (payload) {
			var cnPos = mLineElements.indexOf(payload);
			if (cnPos !== -1) {
				// Remove CN payload from m line.
				mLineElements.splice(cnPos, 1);
			}
			// Remove CN line in sdp
			sdpLines.splice(i, 1);
		}
	}

	sdpLines[mLineIndex] = mLineElements.join(' ');
	return sdpLines;
}

function changeBitrate (sdp,bitrate){
	sdp = sdp.replace( /a=mid:video\r\n/g , 'a=mid:video\r\nb=AS:'+bitrate+'\r\n');
	return sdp;
}

function mergeConstraints(cons1, cons2) {
	var merged = cons1;
	for (var name in cons2.mandatory) {
		merged.mandatory[name] = cons2.mandatory[name];
	}
	merged.optional.concat(cons2.optional);
	return merged;
}