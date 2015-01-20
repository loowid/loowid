'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * WSEvent schema
 */

var WSEventSchema = new Schema ({
	eventName: String,
	eventDate: Date,
	eventServer: String,
	data: Schema.Types.Mixed,
	socket: Schema.Types.Mixed
},{ capped: { size: 1000000, max: 50000, autoIndexId: true } }); // Take care about max if there are too much events to distribute

mongoose.model('WSEvent', WSEventSchema);