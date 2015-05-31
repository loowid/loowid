'use strict';
/**
* Module dependencies.
*/
var logger = require('../log.js').getLog('connector');
var mongoose = require('mongoose');
var util = require ('util');

require ('./revents');
require ('./rproposals');
var REvent = mongoose.model('REvent');
var RProposal = mongoose.model('RProposal');

var connectorId = null;

var saveREvent = function(ev,d,s) {
	var revt = new REvent({eventName:ev,eventDate:new Date(),data:d,socket:s});
	revt.save(function(err){ if (err) { logger.error(err); } });
};

exports.initListener = function(cb) {
	// Add initial data to start tail
	var startDate = new Date();
	var initProposal = new RProposal({proposalDate:startDate,proposal:'none'});
	initProposal.save(function(err){ if (err) { logger.error('init: '+err); } });
	// Query with tail
	var stream = RProposal.find({proposalDate:{'$gte':startDate}}).tailable().stream();
	stream.on('data', cb);
	logger.info('Running relay proposal listener on '+connectorId+' !!');
};

exports.relayConnector = function(srvId,manager,runRelay) {
	
	connectorId = srvId;
	
	// Receive client events and send to relay system
	manager.rtc.on('r_stream_added', function(data, socket) {
		data.roomMembers = manager.rtc.crooms[data.room];
		data.roomState = manager.rtc.roomsState[data.room];
		// Only capture events of my own sockets
		if (manager.rtc.rooms[data.room] && manager.rtc.rooms[data.room].indexOf(socket.id)!==-1) {
			logger.debug ('r_stream_added from ' + socket.id + '\n' + util.inspect (data)); 
			saveREvent('r_stream_added',data,socket.id);
		}
	});
	manager.rtc.on('r_stream_removed', function(data, socket) {
		data.roomMembers = manager.rtc.crooms[data.room];
		data.roomState = manager.rtc.roomsState[data.room];
		// Only capture events of my own sockets
		if (manager.rtc.rooms[data.room] && manager.rtc.rooms[data.room].indexOf(socket.id)!==-1) {
			logger.debug ('r_stream_removed from ' + socket.id + '\n' + util.inspect (data)); 
			saveREvent('r_stream_removed',data,socket.id);
		}
	});
	manager.rtc.on('r_should_accept', function(data, socket) {
		// Only capture events of my own sockets
		if (manager.rtc.rooms[data.room] && manager.rtc.rooms[data.room].indexOf(socket.id)!==-1) {
			saveREvent('r_should_accept',data,socket.id);
		}
	});
	manager.rtc.on('r_update_info', function(data, socket) {
		// Only capture events of my own sockets
		if (manager.rtc.rooms[data.room] && manager.rtc.rooms[data.room].indexOf(socket.id)!==-1) {
			saveREvent('r_update_info',data,socket.id);
		}
	});
	// This is for testing purposes only
	manager.rtc.on('r_stream_test', function(data, socket) {
		// Only capture events of my own sockets
		if (manager.rtc.rooms[data.room] && manager.rtc.rooms[data.room].indexOf(socket.id)!==-1) {
			saveREvent('r_stream_test',data,socket.id);
		}
	});
	
	//We also add a eventlistener to on join and out to maintain the users list update
	
	manager.rtc.on  ('join_room',function(data, socket) {
		var roomStatus = manager.rtc.roomsState [data.room] || { connections: {}, relay: false};
		manager.rtc.roomsState[data.room] = roomStatus;
		if (roomStatus.relay){
			logger.debug ('join_room ' + socket.id + ' to ' + data.room);
			data.roomState = roomStatus;
			data.roomMembers = manager.rtc.crooms[data.room];
			saveREvent('join_room', data, socket.id);
		}
	});
	
	manager.rtc.on ('room_leave', function (room, socket) {
		// Ensure user is previously removed from complete list
		setTimeout(function(){
			var data = {
				'room': room,
				'roomState': manager.rtc.roomsState[room],
				'roomMembers': manager.rtc.crooms[room]
			};
			if (data.roomState && data.roomState.relay && manager.rtc.rooms[data.room] && manager.rtc.rooms[data.room].indexOf(socket.id)!==-1) {
				logger.debug ('room_leave ' + socket.id + ' from ' + room);
				saveREvent ('room_leave', data, socket.id);
			}
		},100);
	});
	
	manager.rtc.on('update_owner_data', function(data, socket) {
				
			manager.rooms.checkOwner(socket.id, data.room, function() {

			if (manager.rtc.roomsState[data.room] && data.access &&
				manager.rtc.roomsState[data.room].relay !== data.access.relay && 
				manager.rtc.rooms[data.room] && manager.rtc.rooms[data.room].indexOf(socket.id)!==-1) {
				//Sent the state when relay mode starts and ends. Algorithm will know what to do with this infomration
				manager.rtc.roomsState[data.room].relay = data.access.relay;

				var sendData = {
					'room': data.room,
					'roomState': manager.rtc.roomsState[data.room],
					'roomMembers': manager.rtc.crooms[data.room]
				};
				
				logger.debug ('room information update ' + socket.id + ' from ' + data.room + ' state ' + util.inspect (sendData.roomState));
				saveREvent ('set_initial_state', sendData, socket.id);
			}
		});
				
	});
	
	var errfn = function(err){
		if (err) { logger.error(err); }
	};
	
	// Listen to proposals send it by relay system
	exports.initListener(function(event){
		if (event.proposal.data!==undefined) {
		  	var roomList = manager.rtc.rooms[event.proposal.data.room] || [];
		  	for ( var i = 0; i < roomList.length; i+=1) {
		  		var id = roomList[i];
		  		if (id === event.proposal.data.target) {
		  			logger.debug('Node '+connectorId+' sending proposal in room '+event.proposal.data.room+' to '+id+' with \n'+util.inspect(event.proposal.data.offers));
		  			var soc = manager.rtc.getSocket(id);
		  			if (soc) {
		  				soc.send(JSON.stringify({
		  					'eventName' : 'r_proposal',
		  					'data': { 'offers' : event.proposal.data.offers }
		  				}), errfn);
		  			}
		  		}
		  	}
		}
	});
	
	if (runRelay) {
		// This should be run in a separated process later
		require('./relay').start(srvId);		
	}
	
};

