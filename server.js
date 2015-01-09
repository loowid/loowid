/**
 * Module dependencies.
 * node server -> Run standalone port 80 and 443 (or cloud port)
 * node server [nport] -> Run below proxy port [nport]
 * 
 */
var log4js = require('./log.js');
var logger = log4js.getLog('server');
var crypto = require('crypto') ;
var i18n = require('i18next');
var express = require('express'), jade = require('jade');
var defaultPort = true;
var portvalue = 80;
if (!isNaN(process.argv[2]) || !isNaN(process.argv[3])) {
	portvalue = isNaN(process.argv[2])?(process.argv[3]-0):(process.argv[2]-0);
	defaultPort = false;
}

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || portvalue;
var sport = 443;
var sserver;

i18n.init({
	saveMissing : true,
	debug : false,
	fallbackLng : 'en',
	supportedLngs : [ 'en', 'es', 'ca' ],
	resGetPath : 'public/i18n/bundle/__ns_____lng__.json',
	ns : 'resourceBundle'
});

var app = express();
var http = require('http');
var server = http.createServer(app);
var rooms = require('./app/controllers/rooms');
var wsevents = require('./app/controllers/events');
var logs = require('./app/controllers/log');

if (!process.env.PORT && !process.env.OPENSHIFT_NODEJS_PORT && defaultPort) {
	var fs = require('fs');
	// Certificado de pruebas para local
	// Generado con http://www.cert-depot.com/
	var privateKey = fs.readFileSync(process.env.PRIVATE_KEY || 'private.pem');
	var certificate = fs.readFileSync(process.env.PUBLIC_KEY || 'public.pem');
	var credentials = {
		key : privateKey,
		cert : certificate
	};
	sserver = require('https').createServer(credentials, app);
}
var ipaddr = process.env.OPENSHIFT_NODEJS_IP ||"0.0.0.0";

// load webrtc module
var webRTC = require('./webrtc.io.js').listen(
		(process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || !defaultPort) ? server
				: sserver, ipaddr);

webRTC.rooms = rooms;
 
// Socket Messages on Mongo
var serverId = (Math.random()/+new Date()).toString(36).replace(/[^a-z]+/g,'').substring(0,9);
var serverCluster = serverId;
var isClustered = false;
var fireOrig = webRTC.rtc.fire;
webRTC.rtc.fire = function(eventName,_) {
    var args = Array.prototype.slice.call(arguments, 1);
	args.unshift(eventName);
	logs.addSocketLog(serverId,eventName,args);
	fireOrig.apply(null,args);
	if (args.length==3 && isClustered && eventName!='ping') {
		logger.debug('Distributing['+args[2].id+']: '+eventName);
		wsevents.addEvent(serverId,eventName,args[1],args[2]);  
	}
};
wsevents.initListener(serverId,function(event) {
	if (event.eventName=='startup') {
		isClustered = isClustered || event.eventServer!=serverId;
		if (isClustered && serverCluster.indexOf(event.eventServer)<0) {
			serverCluster += ','+event.eventServer;
			wsevents.sendAck(serverId);
		}
	} else {
		// Fire if it is from another server 
		if (event.eventServer!=serverId) {
			logger.debug('Catched['+event.socket.id+']: '+event.eventName);
			var args = [];
			args.push(event.eventName);
			args.push(event.data);
			var newsocket = event.socket;
			if (event.socket.id) newsocket.send = function(){};
			args.push(newsocket);
			fireOrig.apply(null,args);
		}
	}
});

// Load mongoose modules
var mongoose = require('mongoose');

var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL
		|| 'mongodb://localhost/loowid';
// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
	uristring = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":"
			+ process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@"
			+ process.env.OPENSHIFT_MONGODB_DB_HOST + ':'
			+ process.env.OPENSHIFT_MONGODB_DB_PORT + '/'
			+ process.env.OPENSHIFT_APP_NAME;
}

// Connect to the selected uri
var db = mongoose.connect(uristring, function(err, res) {
	if (err) {
		logger.error('ERROR connecting to: ' + uristring + '. ' + err);
	} else {
		logger.info('Succeeded connected to: ' + uristring);
	}
});

function isMobile(req) {
	return (/mobile/i.test(req.headers['user-agent']));
}

function isLessIE9(req) {
	var ua = req.headers['user-agent'];
	if (/MSIE (\d+\.\d+);/.test(ua)) { // test for MSIE x.x;
		var ieversion = new Number(RegExp.$1) // capture x.x portion and store as a number
		return (ieversion < 9);
	} else {
		return false;
	}
}

app.set('views', __dirname + '/app/views');
app.set('view engine', 'jade');
app.set("view options", {
	layout : false
});

// Auth Basic, for admin paths
var auth = express.basicAuth(process.env.ADMIN_USERNAME || 'admin', process.env.ADMIN_PASSWORD || 'admin');

// Save sessions on Mongo
var MongoStore = require('connect-mongo')(express);

app.configure(function() {
	app.use(express.cookieParser());
	//app.use(express.session({secret:'Secret'}));	
	app.use(express.session({
		store:new MongoStore({mongoose_connection:mongoose.connection},function(){logger.info('Session store connected !!')}),
		cookie: { maxAge : 3600000 }, // 1 hour
		key:'jsessionid', 
		secret:crypto.randomBytes(16).toString('hex')}));
	app.use(express.bodyParser());
	var csrf = express.csrf();
	app.use(function(req,res,next){
		return csrf(req,res,next);
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
	express.logger.token("ip", function(request) {
	   var retval = "";
	   if (request["headers"] && request["headers"]["x-forwarded-for"]) {
	      // Proxied request
	      retval = request["headers"]["x-forwarded-for"];
	   } else if (request["socket"] && request["socket"]["remoteAddress"]) {
	      // Direct request
	      retval = request["socket"]["remoteAddress"];
	   } else if (request["socket"] && request["socket"]["socket"] && request["socket"]["socket"]["remoteAddress"]) {
	      // God only knows what happened here...
	      retval = request["socket"]["socket"]["remoteAddress"];
	   }
	   return retval;
	 
	});
	app.use(express.logger({stream:{write:function(str){
		logs.addLog(serverId,str.substring(0,str.length-1).split('@'));
	}},format:':date@:sessionid@:ip@:method@:url@:status@:res[content-length]@:response-time'}));
	app.use(express.static(__dirname + '/public'));
	app.use('/client',express.static(__dirname + '/client'));
	app.get('/debug',auth,function(req,res,next){
		log4js.setLogLevel(req.query.level,req.query.module);
		log4js.printLogLevels(res);
	});
	app.get('/stats/rooms',auth,function(req,res,next){
		rooms.stats(res);
	});
});

i18n.registerAppHelper(app);

app.get('/i18n/bundle/resourceBundle.json', function(req, res) {
	res.sendfile(__dirname + '/public/i18n/bundle/resourceBundle_en.json');
});
app.get('/chat/talk',function(req, res) {
	// TODO: Get talk smart, do not read everything !!
	var t = req.query.text;
	if (t.length>35) t = t.substring(0,35)+';'+i18n.t('moretext');
	var req = http.get(
			{
			 host:'translate.google.com',
			 path:'/translate_tts?tl='+req.locale+'&q='+escape(t),
			 headers:{'User-Agent':'Mozilla/5.0 (Windows NT 6.0; rv:26.0) Gecko/20100101 Firefox/33.0'}
			}, function(response) {
		//handle the response
		res.setHeader('Content-Type','audio/mpeg');
		response.pipe(res);
	});
	req.on('error', function(err) {
	  logger.error("Talk translate error: " + err.message);
	});
});

var pck = require('./package.json');

if (process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT) {
	// Heroku redirect
	/* At the top, with other redirect methods before other routes */
	logger.info('Running production environment !!');
	app.get('/', function(req, res, next) {
		if (req.headers['x-forwarded-proto'] != 'https') {
			res.setHeader("X-FRAME-OPTIONS","DENY");
			res.redirect('https://' + req.host + req.url)
		} else {
			if (isLessIE9(req)) {
				res.setHeader("X-FRAME-OPTIONS","DENY");
				res.sendfile(__dirname + '/public/landing.html');
			} else {
				res.setHeader("X-FRAME-OPTIONS","SAMEORIGIN");
				res.render('index.jade', {
					title : "Look what I'm doing!",
					appName : "Loowid",
					version: pck.version
				});
			}
		}
	});
} else {
	logger.info('Running development environment !!');
	// Local redirect
	app.get('/', function(req, res) {
		if (req.protocol == 'http' && defaultPort) {
			res.setHeader("X-FRAME-OPTIONS","DENY");
			res.redirect('https://' + req.host + req.url);
		} else {
			if (isLessIE9(req)) {
				res.setHeader("X-FRAME-OPTIONS","DENY");
				res.sendfile(__dirname + '/public/landing.html');
			} else {
				res.setHeader("X-FRAME-OPTIONS","SAMEORIGIN");
				res.render('index.jade', {
					title : "Look what I'm doing!",
					appName : "Loowid",
					version: pck.version
				});
			}
		}
	});
	if (defaultPort) sserver.listen(sport, ipaddr);
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

app.post('/rooms/keep', function(req, res, next){
	res.json({keep:true});
});

app.param('roomId', rooms.room);
app.param('connectionId', rooms.connection);

app.use(function(err, req, res, next) {
	console.error(err.message);
	var code = err.http_code || 500;
	res.send(code, {error:err.message});
});

server.listen(port, ipaddr);

logger.info('Express app started on port ' + (defaultPort?sport:port));

// expose app
exports = app;
