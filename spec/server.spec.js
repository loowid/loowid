'use strict';
describe('Main Server Tests', function() {

	process.env.LOOWID_HTTPS_PORT = 8080;
	process.env.JASMINE_PORT = 8001;
	process.env.JASMINE_NODES = Number(process.argv[2].substring(process.argv[2].indexOf(':')+2));
	//jasmine.getEnv().defaultTimeoutInterval = 5000;
	var proxy = null;
	var mongoose = require('mongoose');
	var log4js = require('../log.js');
	var logger = log4js.getLog('test');

	var server = require('../server.js');
	proxy = require('../proxy.js');

	var WebSocket = require('ws');
	
	var utils = {};
	
	utils.testDomain = 'http://localhost:'+process.env.LOOWID_HTTPS_PORT;
	utils.logger = logger;
	utils._events = {};
	
	utils.addListener = function(id,eventName, callback) {
		utils._events = utils._events || [];
		utils._events[id] = utils._events[id] || [];
		utils._events[id][eventName] = utils._events[id][eventName] || [];
		utils._events[id][eventName] = callback;
	};
	
	utils.call = function(id,eventName, _) {
		var events = utils._events[id][eventName];
		var args = Array.prototype.slice.call(arguments, 2);
		if (!events) {
			return;
		} else {
			events.apply(null, args);
		}
	};
	
	utils.multipleDone = function(fn) {
    	utils.checkDone -= 1;
    	if (utils.checkDone===0) { fn(); }
	};
	var temp = 1; // Allow to force different nodes for owner and viewer
	var maxNodes = Number(process.env.JASMINE_NODES)+1;
	var getNextPort = function() {
		var p = 8000+(temp%maxNodes);
		temp += 1;
		if ((temp%maxNodes)===0) { temp = 1; }
		return p;
	};
	var force = Math.floor(Math.random()*2);
	logger.info(force?'Forcing alternative cluster nodes on each socket.':'Calling proxy on each socket.');
	var getWebSocketUrl = function(usrid) {
		if (force) {
			return 'ws://localhost:'+getNextPort()+'/'+(usrid?usrid:'');
		} else {
			return 'ws://localhost:'+process.env.LOOWID_HTTPS_PORT+'/'+(usrid?usrid:'');
		}
	};
	utils.connect = function(id,usrid) {
		utils.ws = utils.ws || [];
		delete utils[id]; // Delete socket id
		delete utils._events[id]; // Delete socket events
		utils.ws[id] = new WebSocket(getWebSocketUrl(usrid));
		utils.ws[id].on('open', function(){
			// Initial call in open
			utils.ws[id].send(JSON.stringify({'eventName': 'update_server_config','data': {	'room': utils.roomID	}}));
		});
		utils.ws[id].on('message', function(msg){
			try {
				var json = JSON.parse(msg);
				utils.call(id,json.eventName,json.data);
			} catch (err) {
				logger.error(err);
			}
		});
		utils.ws[id].on('close', function(){
		});
	};
	
	utils.disconnect = function(id) {
		utils.ws[id].close();
	};
	
	var dropRequestFromCache = function() {
		for (var i in require.cache) {
			if (i.indexOf('/request/')) {
				delete require.cache[i];
			}
		}
	};
	
	utils.getBrowser = function(id,callback) {
		utils.browsers = utils.browsers || [];
		var req = require('request');
		var browser = utils.browsers[id] = {request:req.defaults({ strictSSL: false, rejectUnauthorized: false, jar: true })}; 
		dropRequestFromCache();
		// Get the session ID !!
        browser.request(utils.testDomain+'/', function(error, response, body){
            expect(error).toBeNull();
            expect(response.statusCode).toBe(200);
            expect(body.indexOf('loowid.min.js')>0).toBeTruthy();
            var textCsrf = body.substring(body.indexOf('window.csrf'),body.indexOf(';',body.indexOf('window.csrf'))).replace('window.csrf = ','');
            var textUsrid = body.substring(body.indexOf('window.usrid'),body.indexOf(';',body.indexOf('window.usrid'))).replace('window.usrid = ','');
            browser.csrf = textCsrf.replace(/'/g,'');
            browser.usrid = textUsrid.replace(/'/g,'');
            browser.node = response.headers['loowid-node'];
            expect(browser.usrid.length).toBe(16);
            callback(browser);
        });
	};
	
	beforeEach(function(done){
		// Wait for DB Connection
		var fn = function(){
			if (proxy && proxy.isReady() && server.dbReady) {
				if (!utils.Log) {
					utils.Log = mongoose.model('Log');
					utils.WSEvent = mongoose.model('WSEvent');
					utils.Room = mongoose.model('Room');
				}
				// Removing collections before start
				if (count===0) {
					// WSEvent can't be removed (is capped)
					utils.Log.remove().exec(function(err){
						if (err) { logger.error('Log: Error removing collection!!'); }
						utils.Room.remove().exec(function(err){
							if (err) { logger.error('Room: Error removing collection!!'); }
							done();
						});
					});
				}
				done();
			} else {
				setTimeout(fn,500);
			}
		};
		fn();
	});
	
	// Close Test DB
	var fin = function(done){
		var wsevt = new utils.WSEvent({eventName:'shutdown',eventServer:server.serverId,eventDate:new Date(),data:null,socket:null});
		wsevt.save(function(err,obj){ 
			if (err) { 
				logger.error('Error shuting down server: '+err);
				done();
			} else {
				// Travis run mongo by itself
				var isTravis = process.argv[2].substring(process.argv[2].indexOf(':')+1,process.argv[2].indexOf(':')+2)==='t';
				if (!isTravis) {
					// Wait 2 seconds to propagate shutdown signal
					setTimeout(function(){
						var exec = require('child_process').exec;
						exec('mongo --eval "db.getSiblingDB(\'admin\').shutdownServer()"', function (error, stdout, stderr) { });
						done();
					},2000);
				} else {
					done();
				}
			} 
		});
	};
    
	var total = 0;
    // Wrapper of it function to count number of tests
	utils.test = function(name,fn) {
		total+=1;
		it(name,fn);
	};
	
	var count = 0;
	
	afterEach(function(done){
		count+=1;
		if (count===total) { 
			fin(done); 
		} else {
			done();
		}
	});
	
	// Test collection
	var tests = ['init','lti_room','chat_talk','chat_oembed','change_log_level','new_room','join_room','chat_room','three_room',
	             'multi_join_room','move_room','owner_leaves_room','viewer_leaves_room','blocked_room','blocked_chat',
	             'private_room','permanent_room','edit_name_room','status_room','moderated_room','room_stats'];
	
	// Allow run a specific test
	if (process.env.LOOWID_TEST_CASE) {
		tests = [process.env.LOOWID_TEST_CASE];
	}
	
	for (var t=0; t<tests.length; t+=1) {
		require('./tests/'+tests[t])(utils);
	}
	
});
