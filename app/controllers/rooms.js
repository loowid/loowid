'use strict';
/**
* Module dependencies.
*/
var logger = require('../../log.js').getLog('rooms');
var mongoose = require('mongoose');
require ('../models/rooms');
//async = require('async'),
var Room = mongoose.model('Room');
//_ = require('underscore');
var crypto = require('crypto');

var makeId = function(){
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for( var i=0; i < 7; i+=1 )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
};

var isReloading = function(room,id) {
	for (var k=0; k<room.guests.length;k+=1) {
		if (room.guests[k].sessionid === id && room.guests[k].status==='DISCONNECTED') return true;
	}
	return false;
};

var isValid = function(room,id) {
	for (var k=0; k<room.valid.length;k+=1) {
		if (room.valid[k] === id) {
			return true;
		}
	}
	return false;
};

/**
* Find a room by id
*/
exports.room = function(req, res, next, id) {
	req.aliasRoomId = id;
	Room.load(id, req.sessionID, function(err, room) {
		if (!room) {
			var error = new Error('Failed to load the room: ' + id);
			error.http_code = 404;
			next(error);
		} else {
			if (id !== room.roomId && !Room.alias(room,req.sessionID,id)) {
				var owner = false;
				var len = room.alias.length;
				for (var i=len-1; i>=0; i-=1) {
					if (room.alias[i].session === req.sessionID) {
						room.alias.splice(i,1);
					} else if (room.alias[i].id === id) {
						owner = room.alias[i].owner; 
						if (room.alias[i].session) {
							room.alias.splice(i,1);
						}
					}
				}
				var expireDate = new Date();
				expireDate.setTime(expireDate.getTime()+(12*60*60*1000)); // 12 Hours of session token
				room.alias.push({id: id, session: req.sessionID, owner: owner, timestamp: expireDate});
				room.markModified('alias');
			}
			req.room = room;
			next();
		}
	});
};

/*
* Set the connectionId in the request
*/ 
exports.connection = function (req,res,next,id){
	//In this case we just want to put the connectionId in the request not any object
	req.connectionId = id;
	next();
};

exports.checkLockOrPassword = function(data,socket,success,error) {
	Room.load(data.room,socket.sessionid,function(err, room) {
		if (err) {
			error(false);
		} else {
			if (room) {
				// Open room, or owner and room disconnected or valid password
				if (room.access.shared!=='PRIVATE' || room.access.passwd === data.pwd || (room.owner.sessionid === socket.sessionid && (room.status === 'DISCONNECTED' || room.status=== 'CREATED'))) {
					// No locked room, or isReloading os is owner and room disconnected
                    if (!room.access.locked || isReloading(room,socket.sessionid) || (room.owner.sessionid === socket.sessionid && (room.status === 'DISCONNECTED' || room.status=== 'CREATED'))) {
						success(data,socket);
					} else {
						error(true);
					}
				} else {
					error(false);
				}
			} else {
				// Owner join after create
				success(data,socket);
			}
		}
	});
};

/**
* Join a person to a room
*/
exports.join = function (req, res, next){
	var room = req.room;
    
    // Owner haciendo join en una sala sin owner => reload
	if (room.owner.sessionid===req.sessionID && (room.status === 'DISCONNECTED' || room.status === 'CREATED')){
		
		if (!room.owner.sessionid){
			room.owner.sessionid = req.sessionID;
		}

		//room.owner.name = req.body.name;
		room.owner.connectionId = req.body.connectionId;
		room.owner.status = 'CONNECTED';
		room.owner.avatar = req.body.avatar;
		room.status = 'OPENED';
		room.save(function(err) {
			if (err) {
				next(err);
			} else {
				room.guests = Room.safe(room.guests);
				res.json(room);
			}
		});
	} else {
		// Open room or is in valid list of users
		if (room.access.shared!=='PRIVATE' || isValid(room,req.sessionID)) {
			// No locked room or is reloading
			if (!room.access.locked || isReloading(room,req.sessionID)) {
				room.guests.push ({
					name: req.session.ltiname?req.session.ltiname:req.body.name, 
					sessionid: req.sessionID, 
					connectionId: req.body.connectionId, 
					status: 'CONNECTED', 
					avatar: req.session.ltiavtr?req.session.ltiavtr:req.body.avatar, 
					source: []
				});
				var ind = room.valid.indexOf(req.sessionID);
				if (ind>=0) room.valid.splice(ind, 1);
				room.save(function(err) {
					if (err) {
						next(err);
					} else {
						room.access.passwd = '';
						room.access.permanentkey = '';
						room.owner.sessionid = '';
						room.guests = Room.safe(room.guests);
						res.json(room);
					}
				});
			} else {
				res.json({locked:true});
			}
		} else {
			res.json({passfail:true});
		}
	}
};

// Generate unique room id
// Validate is unique in mongo
// Session is regenerated for every room you create
exports.createid = function(req, res, next) {
	var _csrfSecret = req.session._csrfSecret;
	req.session.regenerate(function(){
		req.session._csrfSecret = _csrfSecret; 
		req.session.roomId = makeId();
		var result = function(err,room){
			if (!room) {
				res.json({id:req.session.roomId});
			} else {
				req.session.roomId = makeId();
				Room.load(req.session.roomId,0,result);
			}
		};
		Room.load(req.session.roomId,0,result);
	});
};

/*
* Create a room
*/

exports.create = function(req, res, next) {
	// Check the id is the same as previously created
	if (req.session.roomId === req.body.roomId){
		var acc = {shared:'LINK',title:req.body.title,keywords:[],passwd:makeId(),moderated:false,chat:true,locked:false,permanent:false,permanentkey:makeId()};
		var now = new Date();
		var due = new Date();
		due.setDate(new Date(now.getDate()+(process.env.ROOM_TIMEOUT || 15)));
		var room = new Room (
				{roomId: req.session.roomId, 
				 created: now,
				 dueDate: due,
				 status: req.lti?'DISCONNECTED':'OPENED',
				 access: acc,
				 owner:
				 	{name: req.body.name, 
					 sessionid: req.sessionID,
					 status:req.lti?'DISCONNECTED':'CONNECTED',
					 connectionId: req.body.connectionId,
					 avatar: req.body.avatar},
				guests: [],
				valid: [],
				chat: [],
				alias: []
		});
		if (req.lti) {
			room.lticontext = req.lti;
		}
		room.save(function(err) {
			if (err) {
				next(err);
			} else {
				res.json(room);
			}
		});
	} else {
		var error = new Error('Failed to create the room: ' + req.body.roomId); 
		error.http_code = 500;
		next(error);
	}
};

exports.getGravatarImg = function(email) {
	return '//www.gravatar.com/avatar/'+crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
};

exports.createOrFindLTI = function(req,lti,is_owner,success,fail) {
	Room.openByContext(lti.context_id,function(err,room){
		if (room) {
			success(room);
		} else {
			if (is_owner) {
				var wres = {
					json: function(rid) {
						req.lti = lti.context_id;
						req.body = {
							avatar: exports.getGravatarImg(lti.lis_person_contact_email_primary),
							connectionId: '',
							name: lti.lis_person_name_full,
							roomId: rid.id,
							title: lti.context_title
						};
						var wcres = {
							json: function(nroom) {
								success(nroom);
							}
						};
						exports.create(req,wcres,fail);
					}
				};
				exports.createid(req,wres);
			} else {
				fail();
			}
		}
	});
};

exports.users = function(req,res){
	var isRoomUser = (req.room.owner.sessionid === req.sessionID);
	if (!isRoomUser) {
		var i = 0;
		while (i<req.room.guests.length && !isRoomUser) {
			isRoomUser = (req.room.guests[i].sessionid === req.sessionID);
			i+=1;
		}
	}
	// Check if request is from any user inside the room
	if (isRoomUser) {
		res.json(Room.safe(req.room.guests));
	} else {
		res.json({});
	}
};

exports.chat = function(req,res){
	var room = req.room;
	res.json({chat:room?room.chat:[]});
};

exports.editShared = function (req,res,next) {
	var room = req.room;
	// Only the owner can change his name
	if (req.sessionID === room.owner.sessionid) {
		room.access = req.body.access;
		if (room.access.permanent) {
			var expireDate = new Date();
			expireDate.setTime(expireDate.getTime()+(12*60*60*1000)); // 12 Hours of session token
			room.alias.push({id: room.access.permanentkey, session: '', owner: true, timestamp: expireDate});
			room.markModified('alias');
		} else {
			var len = room.alias.length;
			for (var i=len-1; i>=0; i-=1) {
				if (room.alias[i].id === room.access.permanentkey) {
					room.alias.splice(i,1);
				}
			}
		}
		room.save(function(err) {
			if (err) {
				next(err);
			} else {
				room.guests = Room.safe(room.guests);
				room.chat = []; // Avoid send all chat messages
				res.json(room);
			}
		});
	}
};

exports.editOwnerName = function (req,res,next) {
	var room = req.room;
	// Only the owner can change his name
	if (req.sessionID === room.owner.sessionid) {
		room.owner.name = req.body.name;
		room.owner.avatar = req.body.avatar;
		room.save(function(err) {
			if (err) {
				next(err);
			} else {
				room.guests = Room.safe(room.guests);
				room.chat = []; // Avoid send all chat messages
				res.json(room);
			}
		});
	}
};

exports.changeRoomStatus = function (req,res,next){
	var room = req.room;
	if (req.sessionID === room.owner.sessionid) {
		room.status = req.body.status;
		room.save(function(err) {
			if (err) {
				next(err);
			} else {
				room.guests = Room.safe(room.guests);
				room.chat = []; // Avoid send all chat messages
				res.json(room);
			}
		});
	}
};


exports.editGuestName = function (req,res,next) {
	var room = req.room;
	var guests = room.guests;
	//var sessions = room.sessions;
	var idx = guests ? guests.indexOfField('connectionId',req.connectionId) : -1;
	// is it valid?
	if (idx !== -1) {
		// Only the guest can change his name
		if (guests[idx].sessionid === req.sessionID) {
			guests[idx].name=req.body.name;
			guests[idx].avatar=req.body.avatar;
	        // save the doc
	        room.markModified('guests');
			room.save(function(err) {
				if (err) {
					next(err);
				} else {
					res.json({guests:Room.safe(room.guests)});
				}
			});
		}
	}
};



exports.claimForRoom = function (req,res,next){
	var room = req.room;
	var alias = Room.alias(room,req.sessionID);
	if (alias.owner && room.status === 'DISCONNECTED') {
		room.owner.sessionid = req.sessionID; 
    	room.owner.connectionId = req.connectionId;
		room.owner.status = 'OPENED';
	}
    var roomUrl = 'r/' + room.roomId + (alias.owner?'/join':'');
    room.save(function(err) {
		if (err) {
			next(err);
		} else {
			res.json({url:roomUrl,id:room.roomId});
		}
	});

};

exports.isActive = function(req,res,next){
	var room = req.room;
	if (req.connectionId && room.owner.connectionId === req.connectionId){
		if (room.owner.sessionid === req.sessionID){
			if (room.status==='OPENED') {
				return res.json({status:'active'});
			} else {
				return res.json({status:'inactive',owner:true});
			}
		}
	}
	var aliasRoom = Room.alias(room,req.sessionID);
	var isOwner = aliasRoom?aliasRoom.owner:false;
	if (room.owner.sessionid === req.sessionID || isOwner){
		return res.json({status: (room.status==='DISCONNECTED' || room.status==='CREATED')?'inactive':'active',owner:true});
	} else {
		return res.json({status: 'inactive'});
	}
};

exports.markValid = function (roomId,sessionId) {
	// Add session to valid array
	Room.load(roomId,sessionId,function(err,room){
		if (!err && room) {
			room.valid.push(sessionId);
			room.save();
		}
	});
};

exports.isJoinable = function(req,res,next){
	var room = req.room;
	var locked = !room.access || room.access.locked;
	var permanent = room.access && room.access.permanent;
	if (room.status !== 'DISCONNECTED' && (!locked || isReloading(room,req.sessionID))){
		return res.json({joinable:true,locked:false,private:(room.access && room.access.shared==='PRIVATE')});	
	}else{
		return res.json({joinable:false,locked:locked,permanent:permanent});
	}
};

exports.disconnectOwnerOrGuess = function (connectionId,success){
	// Is Owner or guest with valid status
	Room.findOne({'owner.connectionId' : connectionId, 'status':{'$ne':'DISCONNECTED'}},
		function (err,room) {
			if (room){
				room.status = 'DISCONNECTED';
				room.save(function(err) {
					if (err) logger.error ('Error saving room status' + connectionId + err); 
					success(room,true);
				});
			} else {
				Room.findOne({'guests':{'$elemMatch':{'connectionId':connectionId,'status':{'$ne':'DISCONNECTED'}}}},
						function(err,room){
							//At this point we should have a the room and the connectionId in the request.
							if (room) {
								var guests = room.guests;
								var idx = guests ? guests.indexOfField('connectionId',connectionId) : -1;
								// is it valid?
								if (idx !== -1) {
								// remove it from the array.
									guests[idx].status='DISCONNECTED';
							        // save the doc
							        room.markModified('guests');
							        room.save(function(err) {
										if (err) logger.error ('Error saving room status' + connectionId + err); 
										success(room,false);
							        });
							    }
							}
					});
			}
	});
};

exports.checkModerateOwnerOrAsked = function (id,room,type,success,failure){
	// Is Owner, or Open Room, or was asked for sharing 
	var query = { 'roomId' : room, '$or': [ {'owner.connectionId':id },{'access.moderated':false},{'guests':{'$elemMatch':{'connectionId':id,'source':{'$in':[type]}}}}]};
	Room.findOne(query,
		function (err,room){
			if (err) {
				logger.error ('Alert: Error executing query checkModerateOwnerOrAsked. ConnectionId: ' + id + ' roomId ' + room + ' type ' + type + ' error ' + err);
			}
			if (room) {
				success();
			} else {
				failure();
			}
		});
};

exports.checkModerateOwnerFiles = function (id,destinationId,room,success,failure){
	// Is Owner, or Open Room, or was asked for sharing 
	var query = { 'roomId' : room, '$or': [ {'owner.connectionId':id },{'access.moderated':false,'owner.connectionId':destinationId,'guests':{'$elemMatch':{'connectionId':id}}}]};
	Room.findOne(query,
		function (err,room){
			if (err) {
				logger.error ('Alert: Error executing query checkModerateOwnerOrAsked. ConnectionId: ' + id + ' roomId ' + room + ' destinationId ' + destinationId + ' error ' + err);
			}
			if (room) {
				success();
			} else {
				if (failure !== undefined) failure();
			}
		});
};

exports.checkOwnerOrHandsUp = function (connectionId,destinationId,roomId,type,success,failure){
	// Is Owner, or send to owner by user previous launched
	var query = { 'roomId' : roomId , '$or': [ {'owner.connectionId' : connectionId }, {'owner.connectionId' : destinationId, 'guests':{'$elemMatch':{'connectionId':connectionId,'source':{'$in':[type]}}}} ] };
	Room.findOne(query,
		function (err,room){
			if (err) {
				logger.error ('Alert: Error executing query checkOwner. ConnectionId: ' + connectionId + ' roomId ' + roomId + ' error ' + err);
			}
			if (room) {
				success();
			} else {
				failure();
			}
		});
};

exports.checkChatEnabled = function (connectionId,roomId,success,failure){
	// Chat is enabled in room or is owner
	var query = {'roomId' : roomId, '$or': [ { 'access.chat' : true } , { 'owner.connectionId': connectionId } ] };
	Room.findOne(query,
		function (err,room){
			if (err) {
				logger.error ('Alert: Error executing query checkChatEnabled. RoomId ' + roomId + ' error ' + err);
			}
			if (room) {
				success();
			} else {
				failure();
			}
		});
};

exports.checkOwner = function (connectionId,roomId,success,failure){
	// Is owner of room
	var query = {'owner.connectionId' : connectionId, 'roomId' : roomId};
	Room.findOne(query,
		function (err,room){
			if (err) {
				logger.error ('Alert: Error executing query checkOwner. ConnectionId: ' + connectionId + ' roomId ' + roomId + ' error ' + err);
			}
			if (room) {
				success();
			} else {
				failure();
			}
		});
};

exports.askForSharing = function (req,res,next) {
	var room = req.room;
	var guests = room.guests;
	//var sessions = room.sessions;
	var idx = guests ? guests.indexOfField('connectionId',req.connectionId) : -1;
	// is it valid?
	if (idx !== -1) {
		// Only the guest can share owner and itself
		if (room.owner.sessionid === req.sessionID || guests[idx].sessionid === req.sessionID) {
			guests[idx].source.push(req.body.source);
	        // save the doc
	        room.markModified('guests');
			room.save(function(err) {
				if (err) {
					next(err);
				} else {
					res.json({'success':true});
				}
			});
		}
	}
};

exports.askForStopSharing = function (req,res,next) {
	var room = req.room;
	var guests = room.guests;
	//var sessions = room.sessions;
	var idx = guests ? guests.indexOfField('connectionId',req.connectionId) : -1;
	// is it valid?
	if (idx !== -1) {
		// Only the guest can share owner and itself
		if (room.owner.sessionid === req.sessionID || guests[idx].sessionid === req.sessionID) {
			var i = guests[idx].source.indexOf(req.body.source);
			if (i>=0) {
				guests[idx].source.splice(i,1);
		        // save the doc
		        room.markModified('guests');
				room.save(function(err) {
					if (err) {
						next(err);
					} else {
						res.json({'success':true});
					}
				});
			}
		}
	}
};

exports.moveRoom = function (req,res,next) {
	var room = req.room;
	var guests = room.guests;
	// Only the owner can move the room
	if (req.sessionID === room.owner.sessionid) {
		var newid = makeId();
		var oldRoomId = room.roomId;
		room.roomId = newid;
		for (var x=0; x<req.body.list; x+=1) {
			var idx = guests ? guests.indexOfField('connectionId',req.body.list[x]) : -1;
			if (idx !== -1) {
				guests[idx].status='DISCONNECTED'; // Maybe expulsed
			}
		}
		room.markModified('guests');
		room.save(function(err) {
			if (err) {
				next(err);
			} else {
				res.json({success:true,fromRoomId:oldRoomId,toRoomId:newid});
			}
		});
	}
};

exports.addChatMessage = function (connectionId,roomId,message,created,success) {
	Room.load(roomId,0,function(err, room) {
		if (room) {
			var senderId = connectionId;
			// Owner is mark with generic id in mongo to let reload (and change his id without problem).
			if (room.owner.connectionId === connectionId) {
				senderId = '||##||';
			}
			room.chat.push({id:senderId,text:message,time:created});
			room.save(function(err){
				if (!err) {
					success(senderId);
				}
			});
		}
	});
};

exports.realRoomId = function (aliasRoomId, sessionid, callback) {
	Room.load(aliasRoomId,sessionid,function(err,room){
		callback(room?room.roomId:aliasRoomId);
	});
};

Array.prototype.indexOfField = function (propertyName, value) {
	for (var i = 0; i < this.length; i+=1)
		if (this[i][propertyName] === value)
			return i;
	return -1;
};

exports.stats = function(res) {
	Room.all(function(err,list){
		res.json(list);
	});
};
