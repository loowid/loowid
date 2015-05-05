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

	    utils.test('Stream test.', function(done) {
	    	utils.addListener('viewer0','r_proposal',function(proposal){
	    		expect(proposal.offers.length).toBe(2);
	    		done();
	    	});
	    	utils.ws.owner.send(JSON.stringify({
				'eventName': 'r_stream_test',
				'data': {
					'room': utils.roomID,
					'target': utils.owner,
					'offers': [ 
					            {'origin':utils.owner,'target':utils.viewer0,'type':'video'}, 
					            {'origin':utils.owner,'target':utils.viewer0,'type':'screen'} 
					          ]
				}
	    	}));
	    });

	});	
	
};
