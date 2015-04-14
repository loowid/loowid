'use strict';
module.exports = function(utils) {

	describe('Test relay connector', function() {

		require('../utils/create_room')(utils);
		
		require('../utils/join_room')(utils,['viewer0','viewer1']);
		
	    utils.test('Stream added.', function(done) {
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_added',
				'data': {}
	    	}));
	    	done();
	    });

	    utils.test('Stream removed.', function(done) {
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_removed',
				'data': {}
	    	}));
	    	done();
	    });
	    
	    utils.test('Should accept.', function(done) {
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_should_accept',
				'data': {}
	    	}));
	    	done();
	    });
	    
	    utils.test('Update info.', function(done) {
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_update_info',
				'data': {}
	    	}));
	    	done();
	    });
	});	
	
};
