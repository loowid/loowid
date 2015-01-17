describe("Main Server Tests", function() {

	process.env.MONGOLAB_URI = 'mongodb://localhost/loowid';
	
	var server = require('./server.js');
	var request = require('request');
	var request = request.defaults({
		  strictSSL: false,
		  rejectUnauthorized: false,
		  jar:true
		});
	var csrf = '';
	var endTests = false;
	
	beforeEach(function(done){
		// Wait for DB Connection
		var fn = function(){
			if (server.dbReady) {
				done();
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
	
	describe("Server is working", function() {
		
	    test("Index loads loowid.min.js.", function(done) {
	        request("https://localhost/", function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(body.indexOf('loowid.min.js')>0).toBeTruthy();
	            var text = body.substring(body.indexOf('window.csrf'),body.indexOf(';',body.indexOf('window.csrf'))+1).replace('window.','');
	            eval(text);
	            done();
	        });
	    });

	    test("Hello call return 200.", function(done) {
	        request("https://localhost/rooms/hello", function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var hello = JSON.parse(body);
	            expect(hello.status).toBe(200);
	            done();
	        });
	    });

	});

	describe("Create room", function() {
		
	    test("Create room id first.", function(done) {
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':csrf},
	    		  url:     'https://localhost/rooms/createid',
	    		  body:    ''
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var room = JSON.parse(body);
	            expect(room.id.length).toBe(7);
	            done();
	    	});
	    });
	    
	    test("Keep call returns true.", function(done) {
	    	request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':csrf},
	    		  url:     'https://localhost/rooms/keep',
	    		  body:    ''
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var keep = JSON.parse(body);
	            expect(keep.keep).toBeTruthy();
	            done();
	    	});
	    });
		
	});
	
});
