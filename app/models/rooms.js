'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Room schema
 */
var ttl = 3600 * 24 * (process.env.ROOM_TIMEOUT || 15); // Room expires after 15 days

var UserSchema = new Schema ({
	name: String, 
	sessionid: String, 
	connectionId: String, 
	status: String,
	avatar: String,
	source: [String]
});

var ChatSchema = new Schema ({
	id: String, 
	text: String,
	time: Date
});

var AliasSchema = new Schema ({
	id: String, 
	owner: Boolean,
	session: String,
	timestamp: Date
});

var RoomSchema = new Schema({
    roomId: String,
    created: { type: Date, expires: ttl },
    dueDate: Date,
    status: String,
    lticontext: String,
    access: {
    	shared:String,       	
    	title: String,
       	keywords: [String],
       	passwd: String,
       	moderated: Boolean,
        chat: {type: Boolean, default: true},
        locked: Boolean,
        permanent: Boolean,
        permanentkey: String
    },
    owner: {
		name: String, 
		sessionid: String,
		status: String,
		connectionId: String,
		avatar: String
    },
    guests: [UserSchema],
    valid: [String],
    chat: [ChatSchema],
    alias: [AliasSchema]
});


var pageSize = Number(process.env.CHAT_PAGE_SIZE || 50);
var maxChat = 0 - pageSize;
/**
 * Statics
 */
RoomSchema.statics = {
    load: function(id, sid, cb) {
    	// Only show the last maxChat chat messages
    	var now = new Date();
    	this.findOne({'$or':[{roomId:id},{'alias.id':id,'alias.timestamp':{'$gte':now}},{'alias.session':sid,'alias.timestamp':{'$gte':now}}]},{chat:{'$slice':maxChat}}).exec(cb);
    },
    openByContext: function(id, sid, cb) {
    	// Only show the last maxChat chat messages
    	this.findOne({'$or':[{lticontext:id,status:'OPENED'},{lticontext:id,status:'DISCONNECTED','owner.sessionid':sid}]},{chat:{'$slice':maxChat}}).exec(cb);
    },
    chatMessages: function(id, p, cb) {
    	var self = this;
    	// this.aggregate([{$match:{roomId:id}},{$project:{cnt:{$size:'$chat'}}}])
    	this.aggregate([{$match:{roomId:id}},{$unwind:'$chat'},{$group:{_id:'$chat'}},{$group:{_id:'_id',cnt:{'$sum':1}}}]).exec(function(err,rdo){
        	if (!err) {
        		var cnt = rdo.length > 0 ? rdo[0].cnt : 0;
        		var idx = Number(p || cnt || 0) - pageSize;
        		self.findOne({roomId:id},{chat:{'$slice':[Math.max(idx,0),Math.min(pageSize,Math.max(pageSize + idx,1))]}}).exec(function(err2,room){
        			cb(err2,room,Math.max(idx,0));
        		});
        	} else {
        		cb(err,null);
        	}
    	});
    },
    alias: function (room, sid, id) {
    	var len = room.alias.length;
    	for (var i=0; i<len; i+=1) {
    		if (room.alias[i].session === sid && (!id || room.alias[i].id === id)) {
    			return room.alias[i];
    		}
    	}
    	return null;
    },
    safe: function(guests) {
    	for (var i=0; i<guests.length; i+=1) {
    		delete guests[i].sessionid;
    	}
    	return guests;
    },
    all: function(cb) {
    	this.aggregate([
		      {
		        $group : {
		           _id : { day: { $dayOfMonth: '$created' }, month: { $month: '$created' }, year: { $year: '$created' } },
		           //avgMembers: { $avg: { $add:[ { $size: '$guests' }, 1 ] } },
		           count: { $sum: 1 }
		        }
		      }, { $sort : { _id: 1 } }
    	]).exec(cb);
    }
};

mongoose.model('Room', RoomSchema);
