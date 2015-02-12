'use strict';
/*jshint -W061 */
module.exports = function(request,test,utils) {

	describe('Change log level', function() {
		
		var modules = ['server','rooms','events','log','webrtc.io'];
		var checkLevels = function(text,level) {
			var newText = text;
			for (var k=0; k<modules.length; k+=1) {
				newText = newText.replace('['+modules[k]+']::'+level+'<br>','');
			}
			return newText;
		};
		
	    test('Cannot get levels without password.', function(done) {
	        request(utils.testDomain+'/debug', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(401);
	            expect(body).toBe('Unauthorized');
	            done();
	        });
	    });

	    test('Can get levels using basic auth.', function(done) {
	        request(utils.testDomain.replace('//','//admin:admin@')+'/debug', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('');
	            done();
	        });
	    });

	    test('Cannot change level to NONE.', function(done) {
	        request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=NONE', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('');
	            done();
	        });
	    });

	    test('Cannot change level of unexisting module.', function(done) {
	        request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=INFO&module=none', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('');
	            done();
	        });
	    });
	   
	    test('Can change level of module.', function(done) {
	        request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=ERROR&module=log', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('[log]::ERROR<br>');
	            done();
	        });
	    });

	    test('Can change level of all module.', function(done) {
	        request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=WARN', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'WARN')).toBe('');
	            done();
	        });
	    });

	});
	
};
