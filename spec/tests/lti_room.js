'use strict';
module.exports = function(utils) {

	describe('LTI access room', function() {

		utils.test('Cannot access LTI room without secret.', function(done) {
			utils.getBrowser('instructor',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded'},
		    		  url:     utils.testDomain+'/lti',
		    		  form:    {  }
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(302);
		            expect(response.headers.location).toBe('/#!/lti/error');
		            done();
		    	});
			});
	    });

	    var regexp = /<input type="hidden" name="([^"]*)" value="([^"]*)"\/>/g;
	    var joinexp = /\/#!\/r\/([a-zA-Z0-9]{7})\/join/g;
	    
	    utils.test('Can access LTI room using secret.', function(done) {
	    	var form = {};
	    	utils.browsers.instructor.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded'},
	    		  url:  'http://www.imsglobal.org/developers/LTI/test/v1p1/lms.php',
	    		  form: { 
		    			  'endpoint': utils.testDomain+'/lti',
		    			  'key':'key',
		    			  'secret':'secret',
		    			  'resource_link_id':'120988f929-274612',
		    			  'resource_link_title':'Weekly Blog',
		    			  'resource_link_description':'A weekly blog.',
		    			  'user_id':'292832126',
		    			  'roles':'Instructor',
		    			  'lis_person_name_full':'Jane Q. Public',
		    			  'lis_person_name_family':'Public',
		    			  'lis_person_name_given':'Given',
		    			  'lis_person_contact_email_primary':'user@school.edu',
		    			  'lis_person_sourcedid':'school.edu.user',
		    			  'context_id': Math.floor(Math.random()*999999)+1,
		    			  'context_title':'Design of Personal Environments',
		    			  'context_label':'SI182',
		    			  'tool_consumer_info_product_family_code':'ims',
		    			  'tool_consumer_info_version':'1.1',
		    			  'tool_consumer_instance_guid':'lmsng.school.edu',
		    			  'tool_consumer_instance_description':'University of School (LMSng)',
		    			  'launch_presentation_locale':'en-US',
		    			  'launch_presentation_document_target':'frame'}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            body.replace(regexp, function(match, att, value){
	                form[att] = value;
	            });
	            setTimeout(function(){
	            	utils.browsers.instructor.request.post({
	  	    		  headers: {'content-type':'application/x-www-form-urlencoded'},
	  	    		  url:     utils.testDomain+'/lti',
	  	    		  form:    form
		  	    	}, function(error, response, body){
		  	            expect(error).toBeNull();
		  	            expect(response.statusCode).toBe(302);
		  	            expect(response.headers.location.length).toBe('/#!/r/xxxxxxx/join'.length);
		  	            var match = joinexp.exec(response.headers.location);
		  	            utils.ltiRoom = match[1];
		  	            utils.roomID = utils.ltiRoom;
		  	            done();
		  	    	});
	            },100);
	    	});
	    });

	    
	    utils.test('Owner WebSocket connection done.',function(done) {
        	// WebSocket Connect !!
        	utils.connect('owner',utils.browsers.owner.usrid);
	    	utils.addListener('owner','get_updated_config',function(ice){
	    		expect(ice.iceServers.length).toBeGreaterThan(0);
	    		done();
	    	});
	    });

	    utils.test('The owner joins the room.',function(done) {
	    	utils.addListener('owner','get_peers',function(join){
	    		expect(join.you.length).toBeGreaterThan(0);
	    		utils.owner = join.you;
	    		done();
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'join_room',
				'data': {
					'room': utils.ltiRoom,
					'pwd': '',
					'reload': true
				}
	    	}));
	    });
	    
	    utils.test('The owner joins the room to get info.', function(done) {
	    	utils.browsers.instructor.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.instructor.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.ltiRoom+'/join',
	    		  form:    {id: utils.ltiRoom, avatar: 'img/hero.png', connectionId: utils.owner , name: 'Owner'}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.status).toBe('OPENED');
	            expect(st.roomId).toBe(utils.ltiRoom);
	            expect(st.guests.length).toBe(0);
	            expect(st.access.moderated).toBe(true);
	            done();
	    	});
	    });
	    
	    utils.test('The LTI room is active.', function(done) {
	    	utils.browsers.instructor.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.instructor.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.ltiRoom+'/'+utils.owner+'/isActive',
	    		  form:    {id: utils.ltiRoom, cid: utils.owner}
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.status).toBe('active');
	            done();
	    	});
	    });

	    
	});	

};
