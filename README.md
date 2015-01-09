Loowid
======

*LOOk What I'm Doing* is a web application that allows you to connect with other users and share audio, video, screen and files without any plugin using WebRTC technology.

https://www.loowid.com
  
Install
=======

  1. You need to install nodejs, mongo and git before run loowid.
  2. Download source code.
  
      git clone https://github.com/loowid/loowid /install/dir
  3. Create and download public and private keys of your self-signed certificate.
  
      http://www.cert-depot.com/ 
  4. npm install --production  
  5. npm start
  6. Connect to https://localhost/

Docker
=======

  Too many steps to install? Don't worry loowid is also dockerized !!
  
  https://github.com/loowid/loowid-docker
  
Development
===========

  Follow the same steps but chage steps 5 and 6:
  
  5. npm install
  6. grunt (Default development server, "grunt prod" for production environment)
  
	 * grunt cluster	: Run default development cluster server with 2 nodes (--nodes=N change default value)
	 * grunt minijs		: Minify client js files
	 * grunt less		: Compile less sources to css
	 * grunt mini		: Minify js files and compile less
	 * grunt jshint		: Analyze js files to check style and best practices
  
Configuration
=============

  There are some environment variables you may set to configure your loowid deployment. 
  Check your hosting provider documentation in order to know how to set this values, for example, with openshift you can type:
  	rhc env set VARIABLE=VALUE -a app
  
  1. Credentials to access to some admin resources (debug level and stats).
  
  * ADMIN_USERNAME
  * ADMIN_PASSWORD
  
  2. Chrome plugin extension id. Set the id of your own plugin extension for screen sharing. A generic plugin will be used by default.
  
  * CEXTID
  
  3. Xyrsys configuration, to configure access to xyrsys (https://xirsys.com/).
  
  * XIRSYS_DOMAIN
  * XIRSYS_USER
  * XIRSYS_SECRET
  
  4. Room timeout. The number of days that a room can be active on the server before expires (15 days by default).
  
  * ROOM_TIMEOUT
  

