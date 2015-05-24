'use strict';
/* Relay algorithm */
var logger = require('../log.js').getLog('relay');
var mongoose = require('mongoose');
require ('./rproposals');
require ('./rtree');
var RProposal = mongoose.model('RProposal');
var RTree = mongoose.model('RTree');

logger.info('Relay algorithm started !!');

var saveRProposal = function(p) {
	var rprop = new RProposal({proposalDate:new Date(),proposal:p});
	rprop.save(function(err){ if (err) { logger.error(err); } });
};

var sendProposal = function(room,origin,streamId,streamType) {
	RTree.findTargets(room,origin,function(err,targets) {
		var offers = [];
		for (var i=0; i<targets.length; i+=1) {
			// Do not send to the stream source or to your self
			// Do not send to root if you find other alternatives
			if (targets[i].child!==origin && targets[i].child!==streamId && (targets[i].parent !== null || targets.length === 1)) {
				offers.push({'origin':streamId,'target':targets[i].child,'mediatype':streamType});
			}
		}
		saveRProposal({'data':{'room':room,'target':origin,'offers':offers}});
	});
};


// Raise a stream_added event to reconnect nodes
var raiseStreamAdded = function(room,key,connections) {
	if (connections && connections.hasOwnProperty(key)) {
		for (var k=0; k<connections[key].length; k+=1) {
			if (connections[key][k].status==='connected' || connections[key][k].status==='completed') {
				sendProposal(room,key,connections[key][k].origin,connections[key][k].source);
				return;
			}
		}
	}
};

var processTreeUpdate = function(room,parent,connections) {
	if (!parent) {
		RTree.findLast(room,function(err,last){
			if (last[0]) {
				raiseStreamAdded(room,last[0].child,connections);
			}
		});
	} else {
		raiseStreamAdded(room,parent,connections);
	}
};

require('./listener').initListener(function(event){
	if (event.eventName==='set_initial_state') {
		for (var i = 0; i<event.data.roomMembers.length; i+=1) {
			// You can not change to massive mode during streaming
			RTree.toAddQueue(event.data.room,event.data.roomMembers[i]);
		}
	}
	if (event.eventName==='join_room') {
		// Maybe you need to send streams to the new member
		RTree.toAddQueue(event.data.room,event.socket,function(parent){
			processTreeUpdate(event.data.room,parent,event.data.roomState.connections);
		});
	}
	if (event.eventName==='room_leave') {
		// Maybe you need to redirect streams
		RTree.toRemoveQueue(event.data.room,event.socket,function(parent){
			processTreeUpdate(event.data.room,parent,event.data.roomState.connections);
		});
	}
	if (event.eventName==='r_stream_added') {
		sendProposal(event.data.room,event.socket,event.data.origin,event.data.type);
	}
	if (event.eventName==='r_stream_test') {
		saveRProposal(event);
	}
});

