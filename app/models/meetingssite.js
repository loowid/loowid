var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * PayService schema
 */

require('mongoose-currency').loadType(mongoose);
var Currency = mongoose.Types.Currency;


var MeetingsSiteSchema = new Schema({
	siteId: String,
    created: Date,
    status: String,
    ownerId: String,
    //defaultPrice:  Currency, No nos sireve de nada tenerlo aqui
   	meetings : [MeetingSchema]
});

 var MeetingSchema = new Schema ({
 	meetingId : String,
 	startDate: Date,
 	endDate: Date,
 	status: String, //new,progress,canceled,end
 	finalPrice: Currency,
 	paid: Boolean,
 	paymentId: String,
 	paymentInstant: String, //before,during,end
 	allowedUsersKeys: [String],
 	allowAnonymous : Boolean
 });

 MeetingsSiteSchema.statics = {
    loadSite: function(id, cb) {
        this.findOne({'siteId': id}).exec(cb);
    }
 };

mongoose.model('MeetingsSite', MeetingsSiteSchema);
mongoose.model('Meetings', MeetingSchema);