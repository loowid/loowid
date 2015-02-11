'use strict';
describe('Main Server Tests', function() {

	process.env.MONGOLAB_URI = 'mongodb://localhost/loowid-test';
	
	var mongoose = require('mongoose');
	var server = require('../server.js');
	var req = require('request');
	var WebSocket = require('ws');
	
	var utils = {};
	utils.options = { strictSSL: false, rejectUnauthorized: false, jar:true };
	var request = req.defaults(utils.options);
	
	utils.Log = mongoose.model('Log');
	utils.WSEvent = mongoose.model('WSEvent');
	utils.Room = mongoose.model('Room');
	utils.testDomain = 'http://localhost:8080';

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
	
	utils.connect = function(id) {
		//utils.ws = new WebSocket('ws://localhost/',null,utils.options);
		utils.ws = utils.ws || [];
		utils.ws[id] = new WebSocket('ws://localhost:8080/'+utils.usrid);
		utils.ws[id].on('open', function(){
			// Initial call in open
			utils.ws[id].send(JSON.stringify({'eventName': 'update_server_config','data': {	'room': utils.room	}}));
		});
		utils.ws[id].on('message', function(msg){
			try {
				var json = JSON.parse(msg);
				utils.call(id,json.eventName,json.data);
			} catch (err) {
				console.log(err);
			}
		});
		utils.ws[id].on('close', function(){
		});
	};
	
	utils.disconnect = function(id) {
		utils.ws[id].close();
	};
	
	beforeEach(function(done){
		// Wait for DB Connection
		var fn = function(){
			if (server.dbReady) {
				// Removing collections before start
				if (count===0) {
					// WSEvent can't be removed (is capped)
					utils.Log.remove().exec(function(err){
						if (err) { console.log('Log: Error removing collection!!'); }
						utils.Room.remove().exec(function(err){
							if (err) { console.log('Room: Error removing collection!!'); }
							done();
						});
					});
				} else {
					done();
				}
			} else {
				setTimeout(fn,500);
			}
		};
		fn();
	});
	
	// Close Test DB
	var fin = function(){
    	var exec = require('child_process').exec;
    	exec('mongo --eval "db.getSiblingDB(\'admin\').shutdownServer()"', function (error, stdout, stderr) {
    	});
	};
    
	var total = 0;
    // Wrapper of it function to count number of tests
	var test = function(name,fn) {
		total+=1;
		it(name,fn);
	};
	
	var count = 0;
	
	afterEach(function(done){
		count+=1;
		if (count===total) { fin(); }
		done();
	});
	
	require('./tests/init')(request,test,utils);
	require('./tests/new_room')(request,test,utils);
	require('./tests/join_room')(request,test,utils);
	require('./tests/chat_room')(request,test,utils);
	require('./tests/three_room')(request,test,utils);
	require('./tests/move_room')(request,test,utils);
	require('./tests/owner_leaves_room')(request,test,utils);
	require('./tests/viewer_leaves_room')(request,test,utils);
	require('./tests/blocked_room')(request,test,utils);
	require('./tests/blocked_chat')(request,test,utils);
	require('./tests/private_room')(request,test,utils);
	require('./tests/permanent_room')(request,test,utils);
	require('./tests/editName_room')(request,test,utils);
	
});
