'use strict';
/*jshint -W061 */
module.exports = function(utils) {

	describe('Chat video embed', function() {
		
		utils.test('Embed youtube video only if exists.', function(done) {
			utils.checkDone = 2;
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/oembed',
		    		  form:    {url: 'http://www.youtube.com/watch?v=dlHxl5Q3pIA'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.type).toBe('video');
		            expect(st.html.indexOf('dlHxl5Q3pIA')).toBeGreaterThan(0);
		            utils.multipleDone(done);
		    	});
	    	});
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/oembed',
		    		  form:    {url: 'http://www.youtube.com/thisiddoesnotexistsatall'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.error).toBe(404);
		            utils.multipleDone(done);
		    	});
	    	});
	    });

		utils.test('Embed vimeo video only if exists.', function(done) {
			utils.checkDone = 2;
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/oembed',
		    		  form:    {url: 'https://vimeo.com/120562699'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.type).toBe('video');
		            expect(st.html.indexOf('120562699')).toBeGreaterThan(0);
		            utils.multipleDone(done);
		    	});
	    	});
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/oembed',
		    		  form:    {url: 'https://vimeo.com/thisiddoesnotexistsatall'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.error).toBe(404);
		            utils.multipleDone(done);
		    	});
	    	});
	    });

		utils.test('Embed dailymotion video only if exists.', function(done) {
			utils.checkDone = 2;
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/oembed',
		    		  form:    {url: 'http://www.dailymotion.com/video/x2i73zz'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.type).toBe('video');
		            expect(st.html.indexOf('x2i73zz')).toBeGreaterThan(0);
		            utils.multipleDone(done);
		    	});
	    	});
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/oembed',
		    		  form:    {url: 'http://www.dailymotion.com/video/thisiddoesnotexistsatall'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.error).toBe(404);
		            utils.multipleDone(done);
		    	});
	    	});
	    });

		
	});
	
};
