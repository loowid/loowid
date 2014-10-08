var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Room schema
 */

var RoomSchema = new Schema({
    roomId: String,
    created: Date,
    status: String,
    access: {
    	shared:String,       	
    	title: String,
       	keywords: [String],
       	passwd: String,
       	moderated: Boolean,
        chat: {type: Boolean, default: true},
        locked: Boolean
    },
    owner: {
		name: String, 
		sessionid: String, 
		connectionId: String,
		avatar: String
    },
    guests: [UserSchema],
    valid: [String],
    chat: [ChatSchema],
    meetingId: String,
    alias: [AliasSchema]
});


var UserSchema = new Schema ({
	name: String, 
	sessionid: String, 
	connectionId: String, 
	status: String,
	avatar: String,
	source: [String]
})

var ChatSchema = new Schema ({
	id: String, 
	text: String,
	time: Date
})

var AliasSchema = new Schema ({
	id: String, 
	owner: Boolean,
	session: String,
	timestamp: Date
})

/**
 * Statics
 */
RoomSchema.statics = {
    load: function(id, sid, cb) {
    	// Only show the last 150 chat messages
    	var now = new Date();
    	this.findOne({'$or':[{roomId:id},{'alias.id':id,'alias.timestamp':{'$gte':now}},{'alias.session':sid,'alias.timestamp':{'$gte':now}}]},{chat:{'$slice':-150}}).exec(cb);
    },
    alias: function (room, sid, id) {
    	var len = room.alias.length;
    	for (var i=0; i<len; i++) {
    		if (room.alias[i].session == sid && (!id || room.alias[i].id == id)) {
    			return room.alias[i];
    		}
    	}
    	return null;
    },
    loadByMeeting: function(id, cb) {
        // Only show the last 150 chat messages
        this.findOne({meetingId:id},{chat:{'$slice':-150}}).exec(cb);
    },
    safe: function(guests) {
    	for (i=0; i<guests.length; i++) {
    		delete guests[i].sessionid;
    	}
    	return guests;
    }
};


mongoose.model('Room', RoomSchema);
