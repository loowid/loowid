'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * RProposal schema
 */

var RProposalSchema = new Schema ({
	proposalDate: Date,
	proposal: Schema.Types.Mixed
},{ capped: { size: 1000000, max: 50000, autoIndexId: true } }); // Take care about max if there are too much events to distribute

mongoose.model('RProposal', RProposalSchema);