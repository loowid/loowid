'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Log schema
 */

var ttl = 3600 * 24 * 15; // Log expires after 15 days

var LogSchema = new Schema ({
	serverId: String,
	date: { type: Date, expires: ttl },
	session: String,
	ip: String,
	method:String,
	url: String,
	status: String,
	length: Number, 
	time: Number,
	valid: Boolean
}); 

mongoose.model('Log', LogSchema);