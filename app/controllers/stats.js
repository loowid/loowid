'use strict';
/**
* Module dependencies.
*/
var logger = require('../../log.js').getLog('stats');
var mongoose = require('mongoose');
require ('../models/stats');
var Stats = mongoose.model('LooStats');
var Room = mongoose.model('Room');
var webRTCHandler = {};

var saveAll = function(docs,cnt) {
	var doc = docs.pop();
	if (doc) {
		doc.save(function(err){
			if (!err) {
				saveAll(docs,cnt+1);
			} else {
				throw err;
			}
		});
	} else {
		if (cnt>0) {
			logger.info('Saved '+cnt+' rooms for statistics...');
		}
	}
};

exports.removeStats = function() {
	Stats.remove().exec(function(err){
		if (err) { logger.error('Stats: Error removing collection!!'); }
	});
};

exports.saveStats = function() {
	Stats.last(function(error,last) {
		var lastDate = null;
		if (!error && last.length) {
			lastDate = last[0].created;
		}
		try {
			Room.all(lastDate,function(err,rooms){
				var docs = [];
				if (!err) {
					for (var k=0; k<rooms.length; k+=1) {
						var st = new Stats({
							created:rooms[k].created,
							shared:rooms[k].access.shared,
							moderated:rooms[k].access.moderated,
							permanent:rooms[k].access.permanent,
							members:rooms[k].guests.length,
							messages:rooms[k].chat.length
						});
						docs.push(st);
					}
					saveAll(docs,0);
				} else {
					throw err;
				}
			});
		} catch (e) {
			logger.error(e);
		}
	});
};

exports.byday = function(req,res,next) {
	Stats.all(function(err,list){
		if (!err) {
			res.json(list);
		} else {
			next(err);
		}
	},req.pageId);
};

exports.bytype = function(req,res,next) {
	Stats.bytype(function(err,list){
		if (!err) {
			res.json(list);
		} else {
			next(err);
		}
	});
};

exports.setWebRTCHandler = function(rtcHandler){
	webRTCHandler = rtcHandler.rtc;
};
	
exports.webrtcstats = function (req,res,next){
	//room information from room controller
	var room = req.room;
	
	if (webRTCHandler.statusList && webRTCHandler.statusList[room.roomId]){
		var info = {
			webrtcStats: webRTCHandler.statusList[room.roomId],
			roomInfo: room
		};
		
		res.json(info);	
	}else{
		var error = new Error('No webrtc static found for room: ' + room.roomId);
		var errorCode = 'http_code';
		error[errorCode] = 404;
		next(error);
	}
};
