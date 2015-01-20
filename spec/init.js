'use strict';
/*jshint -W061 */
module.exports = function(request,test,utils) {

	describe('Server is working', function() {
		
	    test('Index loads loowid.min.js.', function(done) {
	        request('https://localhost/', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(body.indexOf('loowid.min.js')>0).toBeTruthy();
	            var text = body.substring(body.indexOf('window.csrf'),body.indexOf(';',body.indexOf('window.csrf'))+1).replace('window.','');
	            eval('utils.'+text);
	            done();
	        });
	        
	    });

	    test('Hello call return 200.', function(done) {
	        request('https://localhost/rooms/hello', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var hello = JSON.parse(body);
	            expect(hello.status).toBe(200);
	            done();
	        });
	    });

	});
	
};
