'use strict';
/* Relay algorithm */
var logger = require('../log.js').getLog('relay');
var mongoose = require('mongoose');
require ('./rproposals');
var RProposal = mongoose.model('RProposal');
var util = require ('util');

logger.info('Relay algorithm started !!');

var saveRProposal = function(p) {
	var rprop = new RProposal({proposalDate:new Date(),proposal:p});
	rprop.save(function(err){ if (err) { logger.error(err); } });
};

var sendProposal = function(room,origin,offers) {
	if (offers && offers.length>0) {
		logger.debug('Sending proposal in '+room+' to '+origin+' with \n'+util.inspect(offers));
		saveRProposal({'data':{'room':room,'target':origin,'offers':offers}});
	}
};

var getChildNode = function(id,members) {
	var sortedMembers = members.sort(); 
	var i=0; while (sortedMembers[i] !== id) { i += 1; }
	var next = (i === sortedMembers.length-1)?0:i+1;
	return members[next];
};

var getOffers = function(id,origin,type,members,connections) {
	var offers = [];
	var target = getChildNode(id,members);
	if (target !== id && target !== origin) {
		offers.push({'origin':origin,'target':target,'mediatype':type});
		// Copy current offers to keep working
		for (var k=0; connections && connections[id] && k<connections[id].length; k+=1) {
			if (connections[id][k].status === 'completed' && connections[id][k].produced && connections[id][k].source !== type) {
				offers.push({'origin':connections[id][k].origin,'target':connections[id][k].peerId,'mediatype':connections[id][k].source});
			}
		}
	}
	return offers;
};

var getParentNode = function(id,members) {
	var sortedMembers = members.sort(); 
	var i=0; while (i<sortedMembers.length && sortedMembers[i] < id) { i += 1; }
	var previous = (i === 0 || i === sortedMembers.length)?sortedMembers.length-1:i-1;
	return members[previous];
};

var isStreamingInProgress = function(connections) {
	for (var key in connections) {
		if (connections.hasOwnProperty(key)) {
			for (var k=0; k<connections[key].length; k+=1) {
				if (connections[key][k].status === 'completed' && connections[key][k].produced) {
					return true;
				}
			}
		}
	}
	return false;
};

var updateOffers = function(id,newPeerId,connections) {
	var offers = [];
	for (var k=0; connections && connections[id] && k<connections[id].length; k+=1) {
		// Do not send offer to
		if (connections[id][k].status === 'completed' && connections[id][k].produced && connections[id][k].origin !== newPeerId) {
			offers.push({'origin':connections[id][k].origin,'target':newPeerId,'mediatype':connections[id][k].source});
		}
	}
	return offers;
};

var processTreeUpdate = function(room,id,members,connections,isNew) {
	// Is streaming in progress update
	if (isStreamingInProgress(connections)) {
		var parent = getParentNode(id,members);
		var newPeer = isNew?id:getChildNode(parent,members);
		// Skip sending recursive proposal
		if (newPeer !== parent) {
			var offers = updateOffers(parent,newPeer,connections);
			sendProposal(room,parent,offers);
		}
	}
};

require('./listener').initListener(function(event){
	if (event.eventName==='join_room') {
		processTreeUpdate(event.data.room,event.socket,event.data.roomMembers,event.data.roomState.connections,true);
	}
	if (event.eventName==='room_leave') {
		processTreeUpdate(event.data.room,event.socket,event.data.roomMembers,event.data.roomState.connections,false);
	}
	if (event.eventName==='r_stream_added') {
		var offers = getOffers(event.socket,event.data.origin,event.data.type,event.data.roomMembers,event.data.roomState.connections);
		sendProposal(event.data.room,event.socket,offers);
	}
	if (event.eventName==='r_stream_test') {
		saveRProposal(event);
	}
});

