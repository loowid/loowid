var log4js = require('log4js');
var loggers = [];

function isValidLogLevel(str) {
	return str === 'FATAL' || str === 'ERROR' || str === 'WARN' || str === 'INFO' || str === 'DEBUG' || str === 'TRACE';
}

module.exports.getLog = function(appender) {
	var logger = log4js.getLogger(appender);
	logger.setLevel('INFO');
	loggers.push(logger);
	return logger;
}

module.exports.setLogLevel = function(level) {
	if (isValidLogLevel(level)) {
		for (var i=0; i<loggers.length; i++) {
			loggers[i].setLevel(level);
		}
	}
}