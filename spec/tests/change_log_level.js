'use strict';
/*jshint -W061 */
module.exports = function(utils) {

	describe('Change log level', function() {
		
		var modules = ['server','rooms','events','log','webrtc.io','proxy','test','stats'];
		var checkLevels = function(text,level) {
			var newText = text;
			for (var k=0; k<modules.length; k+=1) {
				newText = newText.replace('['+modules[k]+']::'+level+'<br>','');
			}
			return newText;
		};
		
		utils.test('Cannot get levels without password.', function(done) {
	    	utils.getBrowser('admin',function(browser){
		        browser.request(utils.testDomain+'/debug', function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(401);
		            expect(body).toBe('Unauthorized');
		            done();
		        });
	    	});
	    });

	    utils.test('Can get levels using basic auth.', function(done) {
	        utils.browsers.admin.request(utils.testDomain.replace('//','//admin:admin@')+'/debug', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('');
	            done();
	        });
	    });

	    utils.test('Cannot change level to NONE.', function(done) {
	        utils.browsers.admin.request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=NONE', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('');
	            done();
	        });
	    });

	    utils.test('Cannot change level of unexisting module.', function(done) {
	    	utils.browsers.admin.request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=INFO&module=none', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('');
	            done();
	        });
	    });
	   
	    utils.test('Can change level of module.', function(done) {
	    	utils.browsers.admin.request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=ERROR&module=log', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'INFO')).toBe('[log]::ERROR<br>');
	            done();
	        });
	    });

	    utils.test('Can change level of all module.', function(done) {
	    	utils.browsers.admin.request(utils.testDomain.replace('//','//admin:admin@')+'/debug?level=WARN', function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            expect(checkLevels(body,'WARN')).toBe('');
	            done();
	        });
	    });

	});
	
};
