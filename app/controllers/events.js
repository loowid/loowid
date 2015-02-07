'use strict';
/**
* Module dependencies.
*/

var logger = require('../../log.js').getLog('events');
var mongoose = require('mongoose');
require ('../models/events');
var WSEvent = mongoose.model('WSEvent');

exports.addEvent = function (srv,e,d,s){
	var newsocket = s;
	if (s.id) { newsocket = {id:s.id}; }
	var wsevt = new WSEvent({eventName:e,eventServer:srv,eventDate:new Date(),data:d,socket:newsocket});
	wsevt.save(function(err){ if (err) { logger.error('SAVED-EV: '+err); } });
};

exports.initListener = function(srv,cb) {
	// Add initial data to start tail
	var startDate = this.sendAck(srv);
	// Query with tail
	var stream = WSEvent.find({eventDate:{'$gte':startDate}}).tailable().stream();
	stream.on('data', cb);
};

exports.sendAck = function(srv) {
	// Add initial data to start tail
	var ackDate = new Date();
	var ackEvent = new WSEvent({eventName:'startup',eventServer:srv,eventDate:ackDate,data:'none',socket:'none'});
	ackEvent.save(function(err){ if (err) { logger.error('SAVED-ACK: '+err); } });
	return ackDate;
};
