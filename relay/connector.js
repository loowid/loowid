'use strict';
/**
* Module dependencies.
*/
var logger = require('../log.js').getLog('connector');

exports.relayConnector = function(manager) {
	manager.rtc.on('r_stream_added', function(data, socket) {
		logger.info('r_stream_added: '+socket.id);
	});
	manager.rtc.on('r_stream_removed', function(data, socket) {
		logger.info('r_stream_removed: '+socket.id);
	});
	manager.rtc.on('r_should_accept', function(data, socket) {
		logger.info('r_should_accept: '+socket.id);
	});
	manager.rtc.on('r_update_info', function(data, socket) {
		logger.info('r_update_info: '+socket.id);
	});
};