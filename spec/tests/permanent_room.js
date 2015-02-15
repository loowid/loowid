'use strict';
module.exports = function(utils) {

	describe('Permanent room', function() {

		require('../utils/create_room')(utils);

		utils.test('Owner made the room permanent.', function(done) {
	    	var acc = utils.room.access;
	    	acc.permanent = true;
	    	utils.browsers.owner.request.post({
	    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':utils.browsers.owner.csrf},
	    		  url:     utils.testDomain+'/rooms/'+utils.roomID+'/editShared',
	    		  form:    { id: utils.roomID, access: acc }
	    	}, function(error, response, body){
	            expect(error).toBeNull();
	            expect(response.statusCode).toBe(200);
	            var st = JSON.parse(body);
	            expect(st.roomId).toBe(utils.roomID);
	            expect(st.guests.length).toBe(0);
	            expect(st.access.permanent).toBe(true);
	            utils.claimUrl = st.access.permanentkey;
	            utils.claimedRoom = utils.roomID;
	            done();
	    	});
	    });

	    utils.test('Claim the previous room.', function(done) {
	    	utils.getBrowser('owner',function(browser){
		    	browser.request.post({
		    		  headers: {'content-type':'application/x-www-form-urlencoded','x-csrf-token':browser.csrf},
		    		  url:     utils.testDomain+'/rooms/'+utils.claimUrl+'/xxx/claimforroom',
		    		  form:    {id: utils.roomID}
		    	}, function(error, response, body){
		            expect(error).toBeNull();
		            expect(response.statusCode).toBe(200);
		            var st = JSON.parse(body);
		            expect(st.id).toBe(utils.claimedRoom);
		            expect(st.url).toBe('r/'+st.id+'/join');
		            done();
		    	});
	    	});
	    });		

	});	
	
};
