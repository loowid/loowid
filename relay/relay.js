/* Relay algorithm */
var logger = require('../log.js').getLog('relay');
var mongoose = require('mongoose');
require ('./rproposals');
var RProposal = mongoose.model('RProposal');

logger.info('Relay algorithm started !!');

var saveRProposal = function(p) {
	var rprop = new RProposal({proposalDate:new Date(),proposal:p});
	rprop.save(function(err){ if (err) { logger.error(err); } });
};

require('./listener').initListener(function(event){
	if (event.eventName==='r_stream_added') {
		saveRProposal('Test Proposal');
	}
	if (event.eventName==='r_stream_test') {
		saveRProposal(event);
	}
});

