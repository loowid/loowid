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

var makeId = function(n){
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for( var i=0; i < (n||7); i+=1 ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

exports.getUsrId = function(enabled) {
	return enabled?makeId(16):'';
};

var isReloading = function(room,id) {
	var mySessionOn = 0;
	var mySessionOff = 0;
	for (var k=0; k<room.guests.length;k+=1) {
		if (room.guests[k].sessionid === id) {
			if (room.guests[k].status==='DISCONNECTED') {
				mySessionOff += 1;
			} else {
				mySessionOn += 1;
			}
		}
	}
	return (mySessionOff > 0 && ((mySessionOff + mySessionOn) <= room.guests.length)) || !room.access.locked;
};

var isValid = function(room,id,usrid) {
	for (var k=0; k<room.valid.length;k+=1) {
		if (room.valid[k] === id || room.valid[k] === usrid) {
			return true;
		}
	}
	return false;
};

var isGuessConnected = function(room,id,cid) {
	for (var k=0; k<room.guests.length; k+=1) {
		if (room.guests[k].sessionid === id && room.guests[k].status==='CONNECTED' && room.guests[k].connectionId === cid) { return true; }
	}
	return false;
};

var removeDisconnectedSession = function(room,id) {
	for (var k=room.guests.length-1; k>=0; k-=1) {
		if (room.guests[k].sessionid === id && room.guests[k].status==='DISCONNECTED') { 
			room.guests.splice(k,1);
		}
	}
};

/**
* Retun null or room id if the room exists or not
*/

exports.exists = function( req, res, next, id ){
	req.aliasRoomId = id;
	Room.load(id, req.sessionID, function(err, room) {
		if (!room) {
			req.room = null;
		} else {
			req.room = room;
		}
		next();
	});
};

/**
* Find a room by id
*/
exports.room = function(req, res, next, id) {
	req.aliasRoomId = id;
	Room.load(id, req.sessionID, function(err, room) {
		if (!room) {
			var error = new Error('Failed to load the room: ' + id);
			var errorCode = 'http_code';
			error[errorCode] = 404;
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
				expireDate.setTime(expireDate.getTime()+5000); // 5 seconds more just to login
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

var checkRoomReloading = function(room,data,socket,success,error) {
	// No locked room, or isReloading, or is owner and room disconnected
    if (!room.access.locked || isReloading(room,socket.sessionid) || ((room.owner.sessionid === socket.sessionid || isValid(room,'owner.'+socket.sessionid)) && (room.status === 'DISCONNECTED' || room.status=== 'CREATED'))) {
		success(data,socket);
	} else {
		error(true);
	}
};

var analyzeRoom = function(room,data,socket,success,error) {
	// Open room, or owner and room disconnected or valid password
	if (room.access.shared!=='PRIVATE' || room.access.passwd === data.pwd || ((room.owner.sessionid === socket.sessionid || isValid(room,'owner.'+socket.sessionid)) && (room.status === 'DISCONNECTED' || room.status=== 'CREATED'))) {
		checkRoomReloading(room,data,socket,success,error);
	} else {
		error(false);
	}
};

exports.checkLockOrPassword = function(data,socket,success,error) {
	Room.load(data.room,socket.sessionid,function(err, room) {
		if (err) {
			error(false);
		} else {
			if (room) {
				analyzeRoom(room,data,socket,success,error);
			} else {
				// Owner join after create
				success(data,socket);
			}
		}
	});
};

var doGuestJoin = function(room,req,res,next) {
	// No locked room or is reloading
	if (!room.access.locked || isReloading(room,req.sessionID)) {
		if (!isGuessConnected(room,req.sessionID,req.body.connectionId)) {
			removeDisconnectedSession(room,req.sessionID);
			room.guests.push ({
				name: req.session.ltiname?req.session.ltiname:req.body.name, 
				sessionid: req.sessionID, 
				connectionId: req.body.connectionId, 
				status: 'CONNECTED', 
				avatar: req.session.ltiavtr?req.session.ltiavtr:req.body.avatar, 
				source: []
			});
		}
		var ind = room.valid.indexOf(req.sessionID);
		if (ind>=0) { room.valid.splice(ind, 1); }
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
		//room.owner.avatar = req.body.avatar;
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
		// Open room or is in valid list of users or is reloading
		if (room.access.shared!=='PRIVATE' || isValid(room,req.sessionID,req.session._usrid) || isGuessConnected(room,req.sessionID,req.body.connectionId)) {
			doGuestJoin(room,req,res,next);
		} else {
			res.json({passfail:true});
		}
	}
};

//Generate unique room id
//Validate is unique in mongo
var getUniqueRoomId = function(cb,err) {
	var ucid = makeId();
	var maxCount = 20;
	var result = function(err,room){
		if (!room) {
			cb(ucid);
		} else {
			if (maxCount>0) {
				maxCount -= 1;
				ucid = makeId();
				Room.load(ucid,0,result);
			} else {
				err();
			}
		}
	};
	Room.load(ucid,0,result);
};

var shouldBeDisconnected = function(req) {
	return req.lti || req.slack;
};

// Session is regenerated for every room you create
exports.createid = function(req, res, next) {
	var _csrfSecret = req.session._csrfSecret;
	var _usrId = req.session._usrid;
	req.session.regenerate(function(){
		req.session._csrfSecret = _csrfSecret;
		req.session._usrid = _usrId;
		getUniqueRoomId(function(urid){
			req.session.roomId = urid;
			res.json({id:req.session.roomId});
		},function(){
			var error = new Error('Failed to create the roomid!!');
			var errorCode = 'http_code';
			error[errorCode] = 500;
			next(error);
		});
	});
};

/*
* Create a room
*/

exports.create = function(req, res, next) {
	// Check the id is the same as previously created
	if (req.session.roomId === req.body.roomId){
		getUniqueRoomId(function(uniqueClaimId){
			var acc = {shared:'LINK',title:req.body.title,keywords:[],passwd:makeId(),moderated:false,chat:false,locked:false,permanent:false,permanentkey:uniqueClaimId};
			var now = new Date();
			var due = new Date();
			var tmout = Number(process.env.ROOM_TIMEOUT || 15);
			due.setDate(new Date(now.getDate()+tmout));
			logger.debug('['+now+'] Creating room '+req.session.roomId+ ' timeout '+ tmout + ': '+due);
			var room = new Room (
					{roomId: req.session.roomId, 
					 created: now,
					 dueDate: due,
					 status: shouldBeDisconnected(req)?'DISCONNECTED':'OPENED',
					 access: acc,
					 owner:
					 	{name: req.body.name, 
						 sessionid: req.sessionID,
						 status:shouldBeDisconnected(req)?'DISCONNECTED':'CONNECTED',
						 connectionId: req.body.connectionId,
						 avatar: req.body.avatar},
					guests: [],
					valid: ['owner.'+req.session._usrid],
					chat: [],
					alias: []
			});
			if (req.slack) {
				var expireDate = new Date();
				expireDate.setTime(expireDate.getTime()+(60*60*1000)); // One hour of expiration date
				room.alias.push({id: room.access.permanentkey, session: '', owner: true, timestamp: expireDate});
				room.markModified('alias');
				room.access.permanent = true;
				room.dueDate = expireDate;
			}
			if (req.lti) {
				room.lticontext = req.lti;
				room.access.moderated = true;
			}
			room.save(function(err) {
				if (err) {
					next(err);
				} else {
					res.json(room);
				}
			});
		},function(){
			var error = new Error('Failed to create the room: ' + req.body.roomId);
			var errorCode = 'http_code';
			error[errorCode] = 500;
			next(error);
		});
	} else {
		var error = new Error('Failed to create the room: ' + req.body.roomId);
		var errorCode = 'http_code';
		error[errorCode] = 500;
		next(error);
	}
};

/*
* Create a slack room
*/

exports.slackone = function(req, res, next, success) {
	var usrNameField = 'user_name';
	var chnNameField = 'channel_name';
	var chnIdField = 'channel_id';
	var resUrlField = 'response_url';
	var usrName = req.body[usrNameField];
	var channelName = req.body[chnNameField];
	var channelId = req.body[chnIdField];
	var responseUrl = req.body[resUrlField];
	var extraText = req.body.text;
	if (responseUrl.indexOf(process.env.SLACK_HOOK_URL || 'https://hooks.slack.com/commands/') === 0) {
		var request = require('request');
		request.post({
		  headers: {'content-type' : 'application/x-www-form-urlencoded'},
		  url:     responseUrl,
		  body:    JSON.stringify({ 'text': 'Preparing your *LooWID* room...' })
		}, function(error, response, body){
			if (!error && response.statusCode === 200) {
				var wres = {
					json: function(rid) {
						req.slack = rid.id;
						req.body = {
							avatar: exports.getGravatarImg(usrName),
							connectionId: '',
							name: usrName,
							roomId: rid.id,
							title: extraText || '#'+channelName
						};
						var wcres = {
							json: function(nroom) {
								var loowidUrl = req.protocol+'://'+req.headers.host+(req.port?':'+req.port:'')+'/#!/r/';
								// This is the owner url
								var loowidPrivateUrl = loowidUrl+nroom.access.permanentkey+'/claim';
								// This is the viewer url
								var loowidPublicUrl = loowidUrl+nroom.roomId;
								success({ 'user' : usrName , 'privateUrl': loowidPrivateUrl, 'publicUrl': loowidPublicUrl, 'responseUrl': responseUrl, 'channel': channelId });
							}
						};
						exports.create(req,wcres,next);
					}
				};
				exports.createid(req,wres);
			}
		});
	}
};


exports.getGravatarImg = function(email) {
	var remail = email || '';
	return (remail.trim()==='')?'img/hero.jpg':'//www.gravatar.com/avatar/'+crypto.createHash('md5').update(remail.trim().toLowerCase()).digest('hex');
};

var ltiFields = {
	contextId: 'context_id',
	contextTitle: 'context_title',
	email: 'lis_person_contact_email_primary',
	name: 'lis_person_name_full'
};

exports.createOrFindLTI = function(req,lti,isOwner,success,fail) {
	Room.openByContext(lti[ltiFields.contextId],req.sessionID,function(err,room){
		if (room) {
			success(room);
		} else {
			if (isOwner) {
				var wres = {
					json: function(rid) {
						req.lti = lti[ltiFields.contextId];
						req.body = {
							avatar: exports.getGravatarImg(lti[ltiFields.email]),
							connectionId: '',
							name: lti[ltiFields.name],
							roomId: rid.id,
							title: lti[ltiFields.contextTitle]
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
	Room.chatMessages(room.roomId,req.body.pag,function(err,nr,pg){
		if (!err) {
			res.json({chat:nr.chat,page:pg});
		} else {
			res.json({chat:[],page:0,error:err});
		}
	});
};

exports.editShared = function (req,res,next) {
	var room = req.room;
	// Only the owner can change his name
	if (req.sessionID === room.owner.sessionid) {
		room.access = req.body.access;
		if (room.access.permanent) {
			var expireDate = new Date();
			var tmout = Number(process.env.ROOM_TIMEOUT || 15);
			expireDate.setTime(expireDate.getTime()+(tmout*24*60*60*1000)); // ROOM_TIMEOUT days of expiration date
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
	} else {
		next({'http_code':403,message:'Invalid session.'});
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
	} else {
		next({'http_code':403,message:'Invalid session.'});
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
	} else {
		next({'http_code':403,message:'Invalid session.'});
	}
};


exports.editGuestName = function (req,res,next) {
	var room = req.room;
	var guests = room.guests;
	//var sessions = room.sessions;
	var idx = guests ? guests.indexOfField('connectionId',req.connectionId) : -1;
	// is it valid?
	if (idx !== -1 && guests[idx].sessionid === req.sessionID) {
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
	} else {
		next({'http_code':403,message:'Invalid session.'});
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

var isActiveAlias = function(room,req,res) {
	var aliasRoom = Room.alias(room,req.sessionID);
	var isOwner = aliasRoom?aliasRoom.owner:false;
	if (room.owner.sessionid === req.sessionID || isOwner){
		return res.json({status: (room.status==='DISCONNECTED' || room.status==='CREATED')?'inactive':'active',owner:true});
	} else {
		return res.json({status: 'inactive'});
	}
};

exports.isActive = function(req,res,next){
	var room = req.room;
	// If is owner return room status
	if (req.connectionId && room.owner.connectionId === req.connectionId){
		if (room.owner.sessionid === req.sessionID){
			if (room.status==='OPENED') {
				return res.json({status:'active'});
			} else {
				return res.json({status:'inactive',owner:true});
			}
		}
	}
	return isActiveAlias(room,req,res);
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
					if (err) { logger.error ('Error saving room status ' + err); } 
					success(room,true);
				});
			} else {
				Room.findOne({'guests':{'$elemMatch':{'connectionId':connectionId,'status':{'$ne':'DISCONNECTED'}}}},
						function(err,room2){
							//At this point we should have a the room and the connectionId in the request.
							if (room2) {
								var guests = room2.guests;
								var idx = guests ? guests.indexOfField('connectionId',connectionId) : -1;
								// is it valid?
								if (idx !== -1) {
								// remove it from the array.
									guests[idx].status='DISCONNECTED';
							        // save the doc
							        room2.markModified('guests');
							        room2.save(function(err) {
										if (err) { logger.error ('Error saving room2 status ' + err); } 
										success(room2,false);
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
				if (failure !== undefined) { failure(); }
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
	var query = {'roomId' : roomId, '$or': [ { 'access.chat' : false } , { 'owner.connectionId': connectionId } ] };
	Room.findOne(query,
		function (err,room){
			if (err) {
				logger.error ('Alert: Error executing query checkChatEnabled. RoomId ' + roomId + ' error ' + err);
			}
			if (room) {
				success(room);
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
	if (idx !== -1 && (room.owner.sessionid === req.sessionID || guests[idx].sessionid === req.sessionID)) {
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
	} else {
		next({'http_code':403,message:'Invalid session.'});
	}
};

exports.askForStopSharing = function (req,res,next) {
	var room = req.room;
	var guests = room.guests;
	//var sessions = room.sessions;
	var idx = guests ? guests.indexOfField('connectionId',req.connectionId) : -1;
	// is it valid?
	if (idx !== -1 && (room.owner.sessionid === req.sessionID || guests[idx].sessionid === req.sessionID)) {
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
		} else {
			next({'http_code':404,message:'Not found.'});
		}
	} else {
		next({'http_code':403,message:'Invalid session.'});
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
	} else {
		next({'http_code':403,message:'Invalid session.'});
	}
};

exports.addChatMessage = function (connectionId,roomId,message,created,save,success) {
	Room.load(roomId,0,function(err, room) {
		if (room) {
			var senderId = connectionId;
			// Owner is mark with generic id in mongo to let reload (and change his id without problem).
			if (room.owner.connectionId === connectionId) {
				senderId = '||##||';
			}
			if (save) {
				room.chat.push({id:senderId,text:message,time:created});
				room.save(function(err){
					if (!err) {
						success(senderId);
					}
				});
			} else {
				success(senderId);
			}
		}
	});
};

exports.realRoomId = function (aliasRoomId, sessionid, callback) {
	Room.load(aliasRoomId,sessionid,function(err,room){
		callback(room?room.roomId:aliasRoomId);
	});
};

Array.prototype.indexOfField = function (propertyName, value) {
	for (var i = 0; i < this.length; i+=1) {
		if (this[i][propertyName] === value) {
			return i;
		}
	}
	return -1;
};
