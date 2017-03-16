'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Stats schema
 */
var ttl = 3600 * 24 * 30 * 12 * 5; // Stats expires after 5 years
var pageSize = 60;

var StatsSchema = new Schema ({
	created: { type: Date, expires: ttl },
	shared: String, 
	moderated: Boolean,
	permanent: Boolean,
	members: Number,
	messages: Number
});

/**
 * Statics
 */
StatsSchema.statics = {
	last: function(cb) {
		this.find({}).sort({'created':-1}).limit(1).exec(cb);
	},
    all: function(cb,page) {
		var currentPage = (page>=1)?page:1;
    	this.aggregate([
		      {
		        $group : {
		           _id : { day: { $dayOfMonth: '$created' }, month: { $month: '$created' }, year: { $year: '$created' } },
		           members: { $sum: '$members' },
		           maxmembers: { $max: '$members' },
		           messages: { $sum: '$messages' },
		           count: { $sum: 1 }
		        }
		      }, { $sort : { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    	]).skip((currentPage-1)*pageSize).limit(pageSize).exec(cb);
    },
    bytype: function(cb) {
    	this.aggregate([
		      {
		        $group : {
		           _id : { access: '$shared', moderated: '$moderated', permanent: '$permanent' },
		           //avgMembers: { $avg: { $add:[ { $size: '$guests' }, 1 ] } },
		           count: { $sum: 1 }
		        }
		      }, { $sort : { _id: 1 } }
    	]).exec(cb);
    }
};

mongoose.model('LooStats', StatsSchema);
