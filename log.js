'use strict';
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
};

module.exports.setLogLevel = function(level,appender) {
	if (isValidLogLevel(level)) {
		for (var i=0; i<loggers.length; i+=1) {
			if (!appender || appender === loggers[i].category) {
				loggers[i].setLevel(level);
			}
		}
	}
};

module.exports.printLogLevels = function(res) {
	var response = '';
	for (var i=0; i<loggers.length; i+=1) {
		response += '['+loggers[i].category+']::'+loggers[i].level.levelStr+'<br>';
		loggers[i].info(loggers[i].level.levelStr);
	}	
	res.send(response);
};