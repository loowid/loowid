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

console.log('Proxy listen port 80');

//
//Create the HTTPS proxy server in front of a HTTP server
//

var targets = [];

var addBackend = function(srv) {
	var i = targets.indexOf(srv);
	if (i<0) {
		console.log('Add backend '+srv);
		targets.push(srv);
	}
}

var removeBackend = function(srv) {
	var i = targets.indexOf(srv);
	if (i>=0) {
		console.log('Remove backend '+srv);
		targets.splice(i,1);
	}
}

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
}
var backends = isNaN(process.argv[2])?3:(process.argv[2]-0);
var checkServers = function() {
	for (var j=1; j<=backends; j++) {
		validateBackend('localhost',8000+j);
	}
	// Check new servers every 5 seconds !!
	setTimeout(checkServers,15000);
}
// Look for backends !!
setTimeout(checkServers,100);

var proxy = httpProxy.createProxyServer({
	target: 'http://localhost:8080',
	ssl: {
	 key: fs.readFileSync('private.pem', 'utf8'),
	 cert: fs.readFileSync('public.pem', 'utf8')
	},
	ws:true
});

process.on('uncaughtException', function (err) {
	if (err.errno === 'ECONNRESET') {
		// Backend server fail !!
		checkServers();
	} else {
		console.log(err);
	}
});

var httpServer = https.createServer({
	key: fs.readFileSync('private.pem', 'utf8'),
	cert: fs.readFileSync('public.pem', 'utf8')
}, function(req, res){
	var tg = targets.shift();
	proxy.web(req, res, {target:tg}, function(){
		removeBackend(tg);
	});
	targets.push(tg);
}).listen(443, "127.0.0.1");

httpServer.on('upgrade', function (req, socket, head) {
	var tg = targets.shift();
    proxy.ws(req, socket, head, {target:tg}, function(){
		removeBackend(tg);
	});
    targets.push(tg);
});

console.log('Load Balancer in port 443');

