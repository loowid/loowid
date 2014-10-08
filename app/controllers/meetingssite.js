var mongoose = require('mongoose'),
models = require ('../models/meetingssite'),
rooms = require('./rooms');
async = require('async'),
MeetingsSite = mongoose.model('MeetingsSite'),
Meeting = mongoose.model('Meetings'),
_ = require('underscore');



var makeId = function(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 7; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}


exports.site = function(req, res, next, id) {
		console.log ("demano site" + id);
		MeetingsSite.loadSite(id, function(err, site) {
		if (!site) {
			var error = new Error('Failed to load the site: ' + id); 
			error.http_code = 404;
			next(error);
		} else {
			req.site = site;
			next();
		}
	});
};


exports.meeting = function (req,res,next,meetingId){
	if (req.site){
		console.log ('got it');
		
		var site = req.site;
		var meetings = site.meetings;
		var idx = meetings ? meetings.indexOfField('meetingId',meetingId) : -1;
		
		if (idx !== -1) {
			req.meeting = meetings [idx];
			next();
		}else{
			var error = new Error('Error: meeting not found'); 
			error.http_code = 403;
			next(error);
		}
	}
};


exports.userkey = function (req,res,next,userKey){
	req.userKey = userKey;
	next();
};

exports.days = function (req,res,next,days){
	req.days = days;
	next();
};


exports.createsite = function (req, res, next) {
		var site = new MeetingsSite ({
			'siteId': req.body.siteId === undefined ?  makeId() : req.body.siteId,
			'created': new Date (),
			'status': 'new',
			'ownerId': req.body.ownerId,
			'meetings' : []
		});

		site.save(function(err) {
			if (err) {
				next(err);
			} else {
				res.json(site);
			}
		});
};

exports.futureusermeetings  = function (req, res, next) {
	if (req.userKey && req.days){
		var today = new Date();
		var toDate = new Date ();
		toDate.setDate(today.getDate()+ parseInt(req.days));
		//MeetingsSite.find ({'meetings': {'$elemMatch': {'allowedUsersKeys':{'$in': [req.userKey]},'startDate':{$gte: today, $lt: toDate}}}},
		MeetingsSite.aggregate({'$unwind':'$meetings'},{$match:{$or: [{'meetings.allowedUsersKeys':{'$in': [req.userKey]}},{'ownerId':req.userKey}],'meetings.endDate':{$gte: today, $lt: toDate}}},
			function(err,meetings){
				if (err) {
					next(err);
				}else{
					//Check the items and add the url if it's open
					var now = new Date() ;
					var registersProcesed = meetings.length;
					
					var processRegister = function (){
						if (--registersProcesed === 0){
							res.json(meetings);
						}
					};

					for (var i=0; i< meetings.length; i++){

						var cmeeting = meetings[i];
						//1 minute before
						if (cmeeting.meetings.startDate.getTime() - 60000  <  now.getTime() && cmeeting.meetings.endDate > now){
							//Seesion is valid so give an url ()
							rooms.roomByMeeting (req,res,function (error,m){
								if (error){
									if (error.http_code === 404){
										//if the error not found the create the room and associate the meeting
										rooms.createmeeting (req,res,function (error,roomId){
											if (error){
												next (error);
											}else{
												//Succefully created
												m.url = req.protocol + '://' + req.get('host') + '/#!/r/##token##/claim';
												processRegister();
											}
										},m);
									}else{
										next (error);
									}
								}else{
									//found the url
									m.url = req.protocol + '://' + req.get('host') + '/#!/r/##token##/claim';
									processRegister();
								}
							},cmeeting.meetings);
						}else{
							processRegister();
						}
					}
	
				}
			});
	}
};

exports.meetingsite = function (req, res, next) {
	if (req.site){
		res.json (req.site);
	}else{
		var error = new Error('Error on getting the site'); 
		error.http_code = 403;
		next(error);
	}
};


exports.createmeeting = function (req, res, next) {
	console.log (JSON.stringify (req.body));

	if (req.site){
			var meeting = new Meeting ({
				'meetingId': makeId(),
				'startDate': req.body.startDate,
				'endDate': req.body.endDate,
				'finalPrice': req.body.finalPrice,
				'paid': req.body.paid,
				'paymentId' : req.body.paymentId,
				'paymentInstant' : req.body.paymentInstant,
				'allowedUsersKeys' :req.body.allowedUsersKeys,
				'allowanonymous': req.body.allowAnonymous,
			});

			req.site.meetings.push (meeting);
			req.site.save(function(err) {
				if (err) {
					next(err);
				} else {
					res.json(meeting);
				}
			});

	}else{
		var error = new Error('Error on getting the site'); 
		error.http_code = 403;
		next(error);
	}	
};

exports.futuremeetings = function (req, res, next) {
	if (req.site && req.days){
		var today = new Date();
		var toDate = new Date ();
		toDate.setDate(today.getDate()+ parseInt(req.days));
		var futureMeetings = [];

		for (meetingIdx in req.site.meetings){
			var meeting = req.site.meetings[meetingIdx];
			if (meeting.startDate > today && meeting.endDate < toDate){
				futureMeetings.push (meeting);
			}
		}

		res.json(futureMeetings);

	}else{
		var error = new Error('Days not valid'); 
		error.http_code = 403;
		next(error);
	}
};

exports.meetingdata = function (req, res, next) {
	if (req.meeting){
		res.json(req.meeting);
	}
};

exports.pay = function (req, res, next){
	var meeting =  req.meeting;
	var site = req.site;
	meeting.paid=true; 
	site.markModified('meetings');

	site.save(function(err) {
		if (err) {
			next(err);
		} else {
			res.json(meeting);
		}
	});
};

exports.prepare = function (req, res, next){
	var role = req.body.role;
	rooms.roomByMeeting (req,res,function (error){
		if (error){
			// No way
			next (error);
		}else{
			var room = req.room;
			var tokenId = makeId();
			var expireDate = new Date();
			expireDate.setTime(expireDate.getTime()+(10*1000)); // 10 seconds token
			room.alias.push({id:tokenId,owner:(role=='owner'),timestamp:expireDate});
			room.markModified('alias');
			room.save(function(err){
				if (err) {
					next(err);
				} else {
					res.json({token:tokenId});
				}
				
			});
		}
	},req.meeting);
};

exports.cancel = function (req, res, next){
	console.log ('cancel');

	var meeting =  req.meeting;
	var site = req.site;
	
	meeting.status='canceled';
	site.markModified('meetings');

	site.save(function(err) {
		if (err) {
			next(err);
		} else {
          res.json(meeting);
		}
	});
};

exports.addalloweduser = function (req, res, next){

	var meeting =  req.meeting;
	var site = req.site

	if (req.body.userkey){
		meeting.allowedUsersKeys.push(req.body.userkey);
		site.markModified('meetings');

		site.save(function(err) {
			if (err) {
				next(err);
			} else {
				res.json(meeting);
			}
		});
	}

};

exports.dropalloweduser = function (req, res, next){

	var meeting =  req.meeting;
	var site = req.site

	if (req.userKey){
		for (allowIdx in meeting.allowedUsersKeys){
			if (meeting.allowedUsersKeys[allowIdx]===req.userKey){
				meeting.allowedUsersKeys.splice(allowIdx,1);
				break;
			}
		}

		site.markModified('meetings');

		site.save(function(err) {
			if (err) {
				next(err);
			} else {
				res.json(meeting);
			}
		});
	}

};

Array.prototype.indexOfField = function (propertyName, value) {
	for (var i = 0; i < this.length; i++)
		if (this[i][propertyName] === value)
			return i;
	return -1;
}
