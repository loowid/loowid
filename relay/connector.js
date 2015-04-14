'use strict';
/**
* Module dependencies.
*/
var logger = require('../log.js').getLog('connector');
var mongoose = require('mongoose');
require ('./revents');
require ('./rproposals');
var REvent = mongoose.model('REvent');
var RProposal = mongoose.model('RProposal');

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
};

exports.relayConnector = function(manager) {
	// Receive client events and send to relay system
	manager.rtc.on('r_stream_added', function(data, socket) {
		saveREvent('r_stream_added',data,socket.id);
	});
	manager.rtc.on('r_stream_removed', function(data, socket) {
		saveREvent('r_stream_removed',data,socket.id);
	});
	manager.rtc.on('r_should_accept', function(data, socket) {
		saveREvent('r_should_accept',data,socket.id);
	});
	manager.rtc.on('r_update_info', function(data, socket) {
		saveREvent('r_update_info',data,socket.id);
	});
	// Listen to proposals send it by relay system
	exports.initListener(function(event){
		if (event.proposal!=='none') {
			logger.info(event.proposal);
		}
	});
};

// This should be run in a separated process later
require('./relay');