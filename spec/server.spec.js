describe("Main Server Tests", function() {

	process.env.MONGOLAB_URI = 'mongodb://localhost/loowid-test';
	
	var mongoose = require('mongoose');
	var server = require('../server.js');
	var request = require('request');
	var WebSocket = require('ws');
	
	var utils = {};
	utils.options = { strictSSL: false, rejectUnauthorized: false, jar:true };
	var request = request.defaults(utils.options);
	var endTests = false;
	
	utils.Log = mongoose.model('Log');
	utils.WSEvent = mongoose.model('WSEvent');
	utils.Room = mongoose.model('Room');

	utils.connect = function(onmessage) {
		utils.ws = new WebSocket('wss://localhost/',null,utils.options);
		utils.ws.on('open', function(){
			utils.ws.send(JSON.stringify({"eventName": "update_server_config","data": {	"room": utils.room	}}));
		});
		utils.ws.on('message', onmessage);
		utils.ws.on('close', function(){
			console.log('Close');
		});
	};
	
	utils.disconnect = function() {
		utils.ws.close();
	}
	
	beforeEach(function(done){
		// Wait for DB Connection
		var fn = function(){
			if (server.dbReady) {
				// Removing collections before start
				if (count==0) {
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
		}
		fn();
	});
	
	// Close Test DB
	var fin = function(){
    	var exec = require('child_process').exec;
    	exec('mongo --eval "db.getSiblingDB(\'admin\').shutdownServer()"', function (error, stdout, stderr) {
    	});
	}
    
	var total = 0;
    // Wrapper of it function to count number of tests
	var test = function(name,fn) {
		total++;
		it(name,fn);
	};
	
	var count = 0;
	
	afterEach(function(done){
		count++;
		if (count==total) fin();
		done();
	});
	
	require('./init')(request,test,utils);
	require('./room')(request,test,utils);
	
	
});
