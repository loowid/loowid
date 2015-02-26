'use strict';
/*jshint -W061 */
module.exports = function(utils) {

	describe('Chat video embed', function() {
		
		utils.test('Embed youtube video only if exists.', function(done) {
			utils.checkDone = 2;
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/video',
		    		  form:    {service: 'youtube', id:'dlHxl5Q3pIA'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.id).toBe('dlHxl5Q3pIA');
		            expect(st.url.indexOf('//www.youtube.com')).toBe(0);
			    	browser.request.post({
			    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
			    		  url:     utils.testDomain+'/chat/video',
			    		  form:    {service: 'youtube', id:'dlHxl5Q3pIA'}
			    	}, function(error, response, body){
			            expect(error).toBeNull();
			            expect(response.statusCode).toBe(200);
			            var st = JSON.parse(body);
			            expect(st.id).toBe('dlHxl5Q3pIA');
			            expect(st.url.indexOf('//www.youtube.com')).toBe(0);
			            utils.multipleDone(done);
			    	});
		    	});
	    	});
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/video',
		    		  form:    {service: 'youtube', id:'thisiddoesnotexistsatall'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.error).toBe(404);
			    	browser.request.post({
			    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
			    		  url:     utils.testDomain+'/chat/video',
			    		  form:    {service: 'youtube', id:'thisiddoesnotexistsatall'}
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

		utils.test('Embed vimeo video only if exists.', function(done) {
			utils.checkDone = 2;
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/video',
		    		  form:    {service: 'vimeo', id:'120562699'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.id).toBe('120562699');
		            expect(st.url.indexOf('//player.vimeo.com')).toBe(0);
			    	browser.request.post({
			    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
			    		  url:     utils.testDomain+'/chat/video',
			    		  form:    {service: 'vimeo', id:'120562699'}
			    	}, function(error, response, body){
			            expect(error).toBeNull();
			            expect(response.statusCode).toBe(200);
			            var st = JSON.parse(body);
			            expect(st.id).toBe('120562699');
			            expect(st.url.indexOf('//player.vimeo.com')).toBe(0);
			            utils.multipleDone(done);
			    	});
		    	});
	    	});
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/video',
		    		  form:    {service: 'vimeo', id:'thisiddoesnotexistsatall'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.error).toBe(404);
			    	browser.request.post({
			    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
			    		  url:     utils.testDomain+'/chat/video',
			    		  form:    {service: 'vimeo', id:'thisiddoesnotexistsatall'}
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

		utils.test('Embed dailymotion video only if exists.', function(done) {
			utils.checkDone = 2;
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/video',
		    		  form:    {service: 'dailymotion', id:'x2i73zz'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.id).toBe('x2i73zz');
		            expect(st.url.indexOf('//www.dailymotion.com')).toBe(0);
			    	browser.request.post({
			    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
			    		  url:     utils.testDomain+'/chat/video',
			    		  form:    {service: 'dailymotion', id:'x2i73zz'}
			    	}, function(error, response, body){
			            expect(error).toBeNull();
			            expect(response.statusCode).toBe(200);
			            var st = JSON.parse(body);
			            expect(st.id).toBe('x2i73zz');
			            expect(st.url.indexOf('//www.dailymotion.com')).toBe(0);
			            utils.multipleDone(done);
			    	});
		    	});
	    	});
	    	utils.getBrowser('anon',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/chat/video',
		    		  form:    {service: 'dailymotion', id:'thisiddoesnotexistsatall'}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.error).toBe(404);
			    	browser.request.post({
			    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
			    		  url:     utils.testDomain+'/chat/video',
			    		  form:    {service: 'dailymotion', id:'thisiddoesnotexistsatall'}
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

	});
	
};
