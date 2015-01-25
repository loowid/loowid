'use strict';
/*global unescape: true */
/**
 * Local proxy (load balancing for development)
 * node proxy [n] -> Run proxy over 443 try to find nodes, from 8001 to 8000+n
 */
// This example demonstrates using sticky session
// support
var httpProxy   = require('http-proxy');
var fs = require('fs');
var http = require('http');
var https = require('https');
var logger = require('./log.js').getLog('proxy');

var server = http.createServer(function (req, res) {
  // optional, for HSTS
  // see https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security
  res.setHeader('Strict-Transport-Security', 'max-age=8640000; includeSubDomains');

  if (req.headers['x-forwarded-proto'] !== 'https') {
    var url = 'https://' + req.headers.host + '/';
    res.writeHead(301, {'location': url});
    return res.end('Redirecting to <a href="' + url + '">' + url + '</a>.');
  }
});

server.listen(80);

logger.info('Proxy listen port 80');

//
//Create the HTTPS proxy server in front of a HTTP server
//

var targets = [];

var parseCookies = function(request) {
    var list = {}, rc = request.headers.cookie;
    if (rc) { 
    	rc.split(';').forEach(function( cookie ) {
    		var parts = cookie.split('=');
    		list[parts.shift().trim()] = decodeURI(parts.join('='));
    	});
    }
    return list;
};

var findStickyServer = function(req) {
	var sid = unescape(parseCookies(req).stickyid);
	var id = targets.indexOf(sid);
	if (id<0) {
		sid = targets[Math.floor(Math.random()*targets.length)];
		req.headers.stickyid = sid; 
	}
	logger.debug(sid+req.url);
	return sid;
};

var addBackend = function(srv) {
	var i = targets.indexOf(srv);
	if (i<0) {
		logger.info('Add backend '+srv);
		targets.push(srv);
	}
};

var removeBackend = function(srv) {
	var i = targets.indexOf(srv);
	if (i>=0) {
		logger.info('Remove backend '+srv);
		targets.splice(i,1);
	}
};

var validateBackend = function(h,p) {
	var options = {
		host: h,
		path: '/img/icons/favicon.ico',
		port: p
	};
	var req = http.get(options,function(response){
		addBackend('http://'+h+':'+p);
	});
	req.on('error',function(err){
		removeBackend('http://'+h+':'+p);
	});
};

var backends = isNaN(process.argv[2])?2:(process.argv[2]-0);

var checkServers = function() {
	for (var j=1; j<=backends; j+=1) {
		validateBackend('localhost',8000+j);
	}
	// Check new servers every 5 seconds !!
	setTimeout(checkServers,5000);
};

// Look for backends !!
setTimeout(checkServers,100);

var proxy = httpProxy.createProxyServer({
	target: 'http://localhost:8080',
	ssl: {
	 key: fs.readFileSync('private.pem', 'utf8'),
	 cert: fs.readFileSync('public.pem', 'utf8')
	},
	ws:true,
	secure:true
});

process.on('uncaughtException', function (err) {
	if (err.errno === 'ECONNRESET') {
		// Backend server fail !!
		checkServers();
	} else {
		logger.error(err);
	}
});

var httpServer = https.createServer({
	key: fs.readFileSync('private.pem', 'utf8'),
	cert: fs.readFileSync('public.pem', 'utf8')
}, function(req, res){
	var tg = findStickyServer(req);
	proxy.web(req, res, {target:tg}, function(){
		removeBackend(tg);
	});
}).listen(443, '0.0.0.0');

httpServer.on('upgrade', function (req, socket, head) {
	var tg = findStickyServer(req);
    proxy.ws(req, socket, head, {target:tg}, function(){
		removeBackend(tg);
	});
});

logger.info('Load Balancer in port 443');

