'use strict';
/**
* Module dependencies.
*/
var logger = require('../../log.js').getLog('log');
var mongoose = require('mongoose');
require ('../models/log');
var Log = mongoose.model('Log');

exports.addLog = function (srvId,logData){
	if (logData[1]==='-' && logData[2]==='-' && logData[3]==='GET' && logData[4]==='/') { return; } // A request from openshift to monitorize app
	var log = new Log({
		serverId: srvId,
		date:new Date(logData[0]),
		session:logData[1],
		ip:logData[2],
		method:logData[3],
		url:logData[4],
		status:logData[5],
		length:((logData[6]==='-')?-1:logData[6]), // -1 => Unknown response length
		time:logData[7],
		valid: (logData.length===8)}); // To detect fake log entries
	log.save(function(err){ if (err) { logger.error('SAVED-LOG: '+err); } });
};

exports.addSocketLog = function (srvId,event,data) {
	if (data && data.length>=2) {
		var log = new Log({
			serverId: srvId,
			date:new Date(),
			session:(data[2]?data[2].id:'-1'), // This is the socket.id
			ip:data[1].room, // This is the roomId
			method:'SOCKET',
			url:event,
			status:0,
			length:0,
			time:0,
			valid:true});
		log.save(function(err){ if (err) { logger.error('SAVED-SLOG: '+err); } });
	}
};
