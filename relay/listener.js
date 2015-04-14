'use strict';
/**
* Module dependencies.
*/
var logger = require('../log.js').getLog('listener');
var mongoose = require('mongoose');
require ('./revents');
var REvent = mongoose.model('REvent');

exports.initListener = function(cb) {
	// Add initial data to start tail
	var startDate = new Date();
	var initEvent = new REvent({eventName:'startup',eventDate:startDate,data:'none',socket:'none'});
	initEvent.save(function(err){ if (err) { logger.error('init: '+err); } });
	// Query with tail
	var stream = REvent.find({eventDate:{'$gte':startDate}}).tailable().stream();
	stream.on('data', cb);
};
