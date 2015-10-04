'use strict';
/**
 * Module dependencies.
 * node server -> Run standalone port 80 and 443 (or cloud port)
 * node server [nport] -> Run below proxy port [nport]
 * 
 */
/*global escape: true */
/*global unescape: true */
var log4js = require('./log.js');
var logger = log4js.getLog('server');
var crypto = require('crypto') ;
var i18n = require('i18next');
var express = require('express');//, jade = require('jade');

var isRunningTests = function() {
	return (process.argv[2] && process.argv[2].indexOf('jasmine_node:')===0) || process.argv[3]==='test';
};

var defaultPort = isNaN(process.argv[2]) && !isRunningTests();
var portvalue = process.env.LOOWID_HTTP_PORT || 80;
if (!defaultPort) {
	portvalue = !isNaN(process.argv[2])?(process.argv[2]-0):process.env.JASMINE_PORT;
}

var isOpenShift = function() {
	return process.env.OPENSHIFT_NODEJS_PORT || process.env.OPENSHIFT_INTERNAL_PORT;
};

var port = process.env.OPENSHIFT_NODEJS_PORT ||  process.env.OPENSHIFT_INTERNAL_PORT || portvalue;
var sport = process.env.LOOWID_HTTPS_PORT || 443;
var sserver;

i18n.init({
	saveMissing : true,
	debug : false,
	fallbackLng : 'en',
	supportedLngs : [ 'en', 'es', 'ca', 'de','ru','hu' ],
	resGetPath : 'public/i18n/bundle/__ns_____lng__.json',
	ns : 'resourceBundle'
});

var app = express();
var http = require('http');
var server = http.createServer(app);
var rooms = require('./app/controllers/rooms');
var wsevents = require('./app/controllers/events');
var logs = require('./app/controllers/log');
var stats = require('./app/controllers/stats');

if (!isOpenShift() && defaultPort) {
	try {
		var fs = require('fs');
		// Certificado de pruebas para local
		// Generado con http://www.cert-depot.com/
		var privateKey = fs.readFileSync(process.env.PRIVATE_KEY || 'private.pem','utf-8');
		var certificate = fs.readFileSync(process.env.PUBLIC_KEY || 'public.pem','utf-8');
		var credentials = {
			key : privateKey,
			cert : certificate
		};
		sserver = require('https').createServer(credentials, app);
	} catch (ex) {
		logger.warn(ex.message);
		defaultPort = false;
	}
}
var ipaddr = process.env.OPENSHIFT_NODEJS_IP || process.env.OPENSHIFT_INTERNAL_IP ||'0.0.0.0';
var wserver = sserver?sserver:server;

var sessionSecret = crypto.randomBytes(16).toString('hex');

// load webrtc module
var webRTC = require('./webrtc.io.js').listen(wserver,ipaddr);
stats.setWebRTCHandler(webRTC);

var serverId = (Math.random()/+new Date()).toString(36).replace(/[^a-z]+/g,'').substring(0,9);
exports.serverId = serverId;

var useUrl = function() {
	return isOpenShift() || isRunningTests();
};

webRTC.wsevents = wsevents;
webRTC.rooms = rooms;
webRTC.serverId = serverId;
webRTC.sessionSecret = !useUrl()?sessionSecret:null;

// Socket Messages on Mongo
var serverCluster = serverId;
var isClustered = false;
var fireOrig = webRTC.rtc.fire;
webRTC.rtc.fire = function(eventName,_) {
    var args = Array.prototype.slice.call(arguments, 1);
	args.unshift(eventName);
	logs.addSocketLog(serverId,eventName,args);
	fireOrig.apply(null,args);
	if (args.length===3 && isClustered && eventName!=='ping' && eventName!=='update_server_config') {
		logger.debug('Distributing['+args[2].id+']: '+eventName);
		wsevents.addEvent(serverId,eventName,args[1],args[2]);  
	} else {
		logger.debug('Non distributed: '+eventName);
	}
};

var setupServer = function(event) {
	if (event.eventName==='startup') {
		if (event.eventServer===serverId && !isClustered) { logger.info('Startup node '+serverId); }
		isClustered = isClustered || event.eventServer!==serverId;
		if (isClustered && serverCluster.indexOf(event.eventServer)<0) {
			serverCluster += ','+event.eventServer;
			wsevents.sendAck(serverId);
		}
	} else {
		if (event.eventServer!==serverId) {
			logger.info('Shutdown node '+serverId);
			process.exit(0);
		}
	}
};

wsevents.initListener(serverId,function(event) {
	if (event.eventName==='startup' || event.eventName==='shutdown') {
		setupServer(event);
	} else {
		// Fire if it is from another server 
		if (event.eventServer!==serverId) {
			logger.debug('Catched['+event.socket.id+']: '+event.eventName);
			var args = [];
			args.push(event.eventName);
			args.push(event.data);
			var newsocket = event.socket;
			if (event.socket.id) {
				newsocket.send = function(){};
				newsocket.distributed = true;
			}
			args.push(newsocket);
			fireOrig.apply(null,args);
		}
	}
});

// Load mongoose modules
var mongoose = require('mongoose');

var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL	|| 'mongodb://localhost/loowid'+(isRunningTests()?'-test':'');
var safeUriString = uristring;
// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
	uristring = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ':' +
			process.env.OPENSHIFT_MONGODB_DB_PASSWORD + '@' +
			process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
			process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
			process.env.OPENSHIFT_APP_NAME;
	// Safe string for log purposes
	safeUriString = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ':*****@' +
			process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
			process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
			process.env.OPENSHIFT_APP_NAME;
}

// Connect to the selected uri
var db = mongoose.connection;
db.on('connected',function() {
	logger.info('Succeeded connected to: ' + safeUriString);
	exports.dbReady = true;
});
db.on('error',function(err) {
	logger.error('ERROR connecting to: ' + safeUriString + '. ' + err);
});
// Add keepAlive to db connection
mongoose.connect(uristring,{server:{'auto_reconnect':true,socketOptions:{keepAlive: 1}},replset:{socketOptions:{keepAlive: 1}}});

/*function isMobile(req) {
	return (/mobile/i.test(req.headers['user-agent']));
}*/

function isLessIE9(req) {
	var ua = req.headers['user-agent'];
	if (/MSIE (\d+\.\d+);/.test(ua)) { // test for MSIE x.x;
		var ieversion = Number(RegExp.$1); // capture x.x portion and store as a number
		return (ieversion < 9);
	} else {
		return false;
	}
}

app.set('views', __dirname + '/app/views');
app.set('view engine', 'jade');
app.set('view options', {
	layout : false
});

// Auth Basic, for admin paths
var auth = express.basicAuth(process.env.ADMIN_USERNAME || 'admin', process.env.ADMIN_PASSWORD || 'admin');

// Save sessions on Mongo
var MongoStore = require('connect-mongo')(express);

// LTI Producer
var passport = require('passport');
var LTIStrategy = require('passport-lti');
var strategy = new LTIStrategy({
	consumerKey: process.env.LTI_KEY || 'key',
  	consumerSecret: process.env.LTI_SECRET || 'secret',
  	passReqToCallback : true
}, function(req, lti, done) {
	// LTI launch parameters
	var ltiFields = { name: 'lis_person_name_full', email: 'lis_person_contact_email_primary', ownerRoles: 'custom_lti_owner_roles' };
	var definedRole = (lti[ltiFields.ownerRoles] || process.env.LTI_OWNER_ROLES || 'Instructor').split(',');
	var isOwner = false;
	for (var k=0; k<definedRole.length && !isOwner; k+=1) {
		isOwner = (lti.roles.indexOf(definedRole[k]) > -1);
	}
	rooms.createOrFindLTI(req,lti,isOwner,function(r){
		req.session.ltiname = lti[ltiFields.name];
		req.session.ltiavtr = rooms.getGravatarImg(lti[ltiFields.email]);
		return done(null,{url:'/#!/r/'+r.roomId+(isOwner?'/join':'')});
	},function(){
		return done(null,{url:'/#!/lti/error'});
	});
});
passport.use('lti',strategy);
passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(user, done) {
	done(null, user);
});

var LTI_PATH = process.env.LTI_PATH || '/lti';

app.configure(function() {
	// Passport Config
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(express.cookieParser());
	//app.use(express.session({secret:'Secret'}));	
	app.use(express.session({
		store:new MongoStore({'mongoose_connection':mongoose.connection},function(){logger.info('Session store connected !!');}),
		cookie: { maxAge : null }, // Browser-Session Cookie
		key:'jsessionid', 
		secret:sessionSecret}));
	app.use(express.bodyParser());
	var csrf = express.csrf();
	app.use(function(req,res,next){
		if (isClustered && (!req.cookies.stickyid || (req.headers.stickyid && req.cookies.stickyid !== req.headers.stickyid)) && req.headers.stickyid) {
			res.cookie('stickyid', req.headers.stickyid, { /*maxAge: null,*/ httpOnly: true });
		}
		// Skip CSRF Check for LTI Initial Route, and forces https
		if ((req.protocol === 'http') && (req.url === LTI_PATH) && isOpenShift()) {
			Object.defineProperty(req, 'protocol', { value: 'https', writable: false });
			req.headers.host = process.env.LTI_DOMAIN || req.headers.host;
			logger.debug(req.protocol+'://'+req.headers.host+(req.port?':'+req.port:'')+'/'+req.url);
		}
		return (req.url === LTI_PATH)?next():csrf(req,res,next);
	});
	app.use(i18n.handle);
	app.use(express.methodOverride());
	app.use(function(req, res, next) {
		if (req.csrfToken) {
			res.locals.token = req.csrfToken();
		}
		next();
	});
	express.logger.token('sessionid', function(req){
		return req.cookies.jsessionid; 
	});
	express.logger.token('ip', function(request) {
	   var retval = '';
	   if (request.headers && request.headers['x-forwarded-for']) {
	      // Proxied request
	      retval = request.headers['x-forwarded-for'];
	   } else if (request.socket && request.socket.remoteAddress) {
	      // Direct request
	      retval = request.socket.remoteAddress;
	   } else if (request.socket && request.socket.socket && request.socket.socket.remoteAddress) {
	      // God only knows what happened here...
	      retval = request.socket.socket.remoteAddress;
	   }
	   return retval;
	 
	});
	app.use(express.logger({stream:{write:function(str){
		// Write log info only when DB is connected
		if (db.readyState===1) {
			logs.addLog(serverId,str.substring(0,str.length-1).split('@'));
		}
	}},format:':date@:sessionid@:ip@:method@:url@:status@:res[content-length]@:response-time'}));
	app.use(express.static(__dirname + '/public'));
	// For js.map
	app.use('/client',express.static(__dirname + '/client'));
	// Allow change debug settings
	app.get('/debug',auth,function(req,res,next){
		log4js.setLogLevel(req.query.level,req.query.module);
		log4js.printLogLevels(res);
	});
	// Statistics service
	app.get('/stats/:roomId/webrtcstats',auth,stats.webrtcstats);
	app.get('/stats/rooms',auth,stats.byday);
	app.get('/stats/roomsbytype',auth,stats.bytype);
	// LTI Routes
	app.post(LTI_PATH,passport.authenticate('lti',{
		failureRedirect: '/#!/lti/error'
	}),function(req,res){
		res.redirect(req.user.url);
	});

});

i18n.registerAppHelper(app);

app.get('/i18n/bundle/resourceBundle.json', function(req, res) {
	res.sendfile(__dirname + '/public/i18n/bundle/resourceBundle_en.json');
});
app.get('/chat/talk',function(req, res) {
	// TODO: Get talk smart, do not read everything !!
	var t = req.query.text;
	if (t.length>50) { t = t.substring(0,50)+';'+i18n.t('moretext'); }
	var reqst = http.get(
			{
			 host:'translate.google.com',
			 path:'/translate_tts?tl='+req.locale+'&q='+escape(t),
			 headers:{'User-Agent':'Mozilla/5.0 (Windows NT 6.0; rv:26.0) Gecko/20100101 Firefox/33.0'}
			}, function(response) {
		//handle the response
		res.setHeader('Content-Type','audio/mpeg');
		response.pipe(res);
	});
	reqst.on('error', function(err) {
	  logger.error('Talk translate error: ' + err.message);
	});
});

var finalHeaders = {'User-Agent':'Mozilla/5.0 (Windows NT 6.0; rv:26.0) Gecko/20100101 Firefox/33.0'};

/* Discover oembed services */
var getOEmbedEntryPoint = function(url,callback,errfn) {
	var request = require('request');
	var finalUrl = url.indexOf('http')===0?url:'http://'+url;
	request({headers:finalHeaders,url:finalUrl}, function (error, response, body) {
	  if (!error && body) {
		  var linkAtts = /<link([^>]*)type="(?:application|text)\/json\+oembed"([^>]*)>/g.exec(body);
		  if (linkAtts) {
			var otherAtts = linkAtts[1] + ' ' + linkAtts[2];
			var matches = /\s*href="([^"]*)"/g.exec(otherAtts);
			if (matches) {
				callback(matches[1]);
			} else {
				errfn({error:404});
			}
		  } else {
			  errfn({error:404});
		  }
	  } else {
		  errfn({error:404});
	  }
	});
};

var getOEmbedData = function(url,callback,error) {
	var oembedData = {error:404};
	var request = require('request');
	request({headers:finalHeaders,url:url}, function (error, response, body) {
	  if (!error && response.statusCode === 200) {
			oembedData = JSON.parse(body);
	  }
	  callback(oembedData);
	});
};

var embedlyApiKey = process.env.EMBEDLY_APIKEY;

var oembedProviders = require('./oembed');

var getOEmbedProvidersRegExp = function() {
	var domains = '';
	for (var d=0;d<oembedProviders.domains.length;d+=1) {
		domains += (domains===''?'':'|')+'(www\.)?'+oembedProviders.domains[d].replace('.','\\.');
	}
	return new RegExp('(^|^https?://)('+domains+')/.+','g');
};

app.post('/chat/oembed',function(req, res, next) {
	var matches = getOEmbedProvidersRegExp().exec(req.body.url);
	if (matches) {
		if (embedlyApiKey) {
			// Using embedly service
			getOEmbedData('http://api.embed.ly/1/oembed?key='+embedlyApiKey+'&url='+escape(req.body.url)+'&maxwidth=500&autoplay=true',function(oembed){
				res.json(oembed);
			},function(){
				res.json({error:404});
			});
		} else {
			getOEmbedEntryPoint(req.body.url,function(entryPoint){
				getOEmbedData(unescape(entryPoint),function(oembed){
					res.json(oembed);
				},function(){
					res.json({error:404});
				});
			},function(){
				res.json({error:404});
			});
		}
	} else {
		res.json({error:404});
	}
});

var pck = require('./package.json');
var getClusterNode = function (req) {
	var machineId = (process.env.OPENSHIFT_GEAR_UUID || 'local');
	machineId = machineId.substring(machineId.length-5);
	var node = req.cookies.stickyid || req.headers.stickyid || ':'+machineId;
	return node.substring(node.lastIndexOf(':')+1);
};

var getReqWSPort = function(req) {
	var ind = req.headers.host.indexOf(':');
	return (ind>0?req.headers.host.substring(ind+1):(req.protocol==='http' && !defaultPort && !isClustered?'80':'443'));
};

var getUsrId = function(req) {
	return req.session._usrid || rooms.getUsrId(useUrl());
};

if (isOpenShift()) {
	// OpenShift Deployment
	/* At the top, with other redirect methods before other routes */
	logger.info('Running openshift environment !!');
	app.get('/', function(req, res, next) {
		if (req.headers['x-forwarded-proto'] !== 'https') {
			res.setHeader('X-FRAME-OPTIONS','DENY');
			res.redirect('https://' + req.host + req.url);
		} else {
			if (isLessIE9(req)) {
				res.setHeader('X-FRAME-OPTIONS','DENY');
				res.sendfile(__dirname + '/public/landing.html');
			} else {
				req.session._usrid = getUsrId(req);
				res.setHeader('X-FRAME-OPTIONS','SAMEORIGIN');
				res.render('index.jade', {
					title : 'Look what I\'m doing!',
					appName : 'Loowid',
					version: pck.version,
					node: getClusterNode(req),
					host: process.env.WS_HOST || req.host,
					port: ':' + (process.env.WS_PORT || '8443'),
					usrid: req.session._usrid
				});
			}
		}
	});
} else {
	logger.info('Running non-openshift environment !!');
	// Local redirect
	app.get('/', function(req, res) {
		var wsport = getReqWSPort(req);
		if ((req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') || (req.protocol === 'http' && defaultPort)) {
			res.setHeader('X-FRAME-OPTIONS','DENY');
			res.redirect('https://' + req.host + (sport!==443?':'+sport:'') + req.url);
		} else {
			if (isLessIE9(req)) {
				res.setHeader('X-FRAME-OPTIONS','DENY');
				res.sendfile(__dirname + '/public/landing.html');
			} else {
				req.session._usrid = getUsrId(req);
				res.setHeader('X-FRAME-OPTIONS','SAMEORIGIN');
				res.render('index.jade', {
					title : 'Look what I\'m doing!',
					appName : 'Loowid',
					version: pck.version,
					node: getClusterNode(req),
					host: process.env.WS_HOST || req.host,
					port: ':' + (process.env.WS_PORT || wsport),
					usrid: req.session._usrid
				});
			}
		}
	});
	if (defaultPort) {
		logger.info('Express app started on '+ipaddr+' port ' + sport);
		sserver.listen(sport, ipaddr);
	}
}

// Define the routes for room REST service
app.post('/rooms/create', rooms.create);
app.post('/rooms/createid', rooms.createid);
app.get('/rooms/hello', function (req,res){
	res.jsonp({status:200});
});
app.post('/rooms/:roomId/join', function(req, res, next) {
	rooms.join(req, res, next);
});
app.post('/rooms/:roomId/users', rooms.users);
app.post('/rooms/:roomId/chat', rooms.chat);
app.post('/rooms/:roomId/isJoinable', rooms.isJoinable);
app.post('/rooms/:roomId/:connectionId/claimforroom', rooms.claimForRoom);
app.post('/rooms/:roomId/:connectionId/isActive', rooms.isActive);
app.post('/rooms/:roomId/:connectionId/askForSharing', rooms.askForSharing);
app.post('/rooms/:roomId/:connectionId/askForStopSharing', rooms.askForStopSharing);
app.post('/rooms/:roomId/editName', rooms.editOwnerName);
app.post('/rooms/:roomId/editShared', rooms.editShared);
app.post('/rooms/:roomId/changeRoomStatus', rooms.changeRoomStatus);
app.post('/rooms/:roomId/:connectionId/editName', rooms.editGuestName);
app.post('/rooms/:roomId/move', function(req, res, next) {
	rooms.moveRoom(req, res, next);
});

app.get('/r/:staticId', function(req, res){
	if( req.room !== null ){
		res.redirect('/#!/r/' + req.room.roomId );
	}else{
		res.redirect('/' );
	}
});

app.get('/gdocmessage.svg',function(req,res){
	var fs = require('fs');
	var data = fs.readFileSync('public/text.svg','utf-8');
	res.type('image/svg+xml');
	data = data.replace('##text##',i18n.t('gdocmessage'));
	res.send(data);
});

app.param('roomId', rooms.room);
app.param('staticId', rooms.exists);
app.param('connectionId', rooms.connection);

app.use(function(err, req, res, next) {
	logger.error(err.message);
	var errorCode = 'http_code';
	var code = err[errorCode] || 500;
	res.send(code, {error:err.message});
});


server.listen(port, ipaddr);

if (defaultPort) {
	logger.info('Listen for redirect on '+ipaddr+' port ' + port);
} else {
	logger.info('Express app started on '+ipaddr+' port ' + port);
}

// Save statistics every 6 hours
setInterval(function(){
	var sorted = serverCluster.split(',');
	sorted.sort();
	// Only one node save statistics
	if (sorted[0] === serverId) {
	    stats.saveStats();
	}
},1000*60*60*6);

