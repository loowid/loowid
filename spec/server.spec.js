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

	utils._events = {};
	utils.addListener = function(eventName, callback) {
		utils._events[eventName] = utils._events[eventName] || [];
		utils._events[eventName].push(callback);
	};
	utils.call = function(eventName, _) {
		var events = utils._events[eventName];
		var args = Array.prototype.slice.call(arguments, 1);
		if (!events) {
			return;
		}
		for (var i = 0, len = events.length; i < len; i+=1) {
			events[i].apply(null, args);
		}
	};
	utils.connect = function() {
		utils.ws = new WebSocket('wss://localhost/',null,utils.options);
		utils.ws.on('open', function(){
			// Initial call in open
			utils.ws.send(JSON.stringify({'eventName': 'update_server_config','data': {	'room': utils.room	}}));
		});
		utils.ws.on('message', function(msg){
			try {
				var json = JSON.parse(msg);
				utils.call(json.eventName,json.data);
			} catch (err) {
				console.log(err);
			}
		});
		utils.ws.on('close', function(){
			console.log('Close');
		});
	};
	
	utils.disconnect = function() {
		utils.ws.close();
	};
	
	beforeEach(function(done){
		// Wait for DB Connection
		var fn = function(){
			if (server.dbReady) {
				// Removing collections before start
				if (count===0) {
					// WSEvent can't be removed (is capped)
					utils.Log.remove().exec(function(err){
						if (err) console.log('Log: Error removing collection!!');
						utils.Room.remove().exec(function(err){
							if (err) console.log('Room: Error removing collection!!');
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
		if (count===total) fin();
		done();
	});
	
	require('./init')(request,test,utils);
	require('./room')(request,test,utils);
	
	
});
