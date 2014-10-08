var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Log schema
 */

var ttl = 3600 * 24 * 30; // Log expires after 30 days

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