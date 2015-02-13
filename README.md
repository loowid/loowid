# Loowid [![Build Status](https://travis-ci.org/loowid/loowid.svg?branch=master)](https://travis-ci.org/loowid/loowid) [![Build Status](https://api.shippable.com/projects/54d253435ab6cc13528acebb/badge?branchName=master)](https://app.shippable.com/projects/54d253435ab6cc13528acebb/builds/latest) [![Coverage Status](https://coveralls.io/repos/loowid/loowid/badge.svg?branch=master)](https://coveralls.io/r/loowid/loowid?branch=master) [![Codacy Badge](https://www.codacy.com/project/badge/8cdf09fa132041568dab928453fa2885)](https://www.codacy.com/public/jjmerono/loowid_3)
[![Translated] (https://hosted.weblate.org/widgets/loowid/-/svg-badge.svg)](https://hosted.weblate.org/widgets/loowid/-/svg-badge.svg)

*LOOk What I'm Doing* is a web application that allows you to connect with other users and share audio, video, screen and files without any plugin using WebRTC technology.

https://www.loowid.com

Wiki Documentation | Vote us !! | Bitnami Contest
:---:|:---:|:---:
[![Wiki Documentation](https://raw.githubusercontent.com/loowid/loowid-doc/master/images/howtouse/6-user-buttons.png)](https://github.com/loowid/loowid/wiki)|[![Loowid Bitnami Contest](https://d33np9n32j53g7.cloudfront.net/assets/stacks/loowid/img/loowid-module-20caa0b9cc4fc99d7b5929ab83f8418f.png)](https://bitnami.com/stack/loowid?utm_source=bitnami&utm_medium=badge&utm_term=loowid&utm_campaign=Application%2BContest)|[![Bitnami](https://pbs.twimg.com/profile_images/378800000732241585/9e00ada9691f6aab16668cfb9dfa2f1c_normal.png)](https://bitnami.com/contest?page=4&product=loowid&utm_campaign=Application%2BContest&utm_medium=badge&utm_source=bitnami&utm_term=loowid)

  
## Install

  1. You need to install nodejs, mongo and git before run loowid.
  2. Download source code.`
      git clone https://github.com/loowid/loowid /install/dir
`
  3. Create and download public and private keys of your self-signed certificate.

      ```
      http://www.cert-depot.com/
      If no certificate available loowid startup in http port. 
      When https port is running, http port is used only to redirect to https port.
      ```
      
  4. `npm install --production`
  5. `npm start`
  6. Connect to https://localhost/

**Note**: If you want to work with the **latest stable release** then you must clone `https://github.com/loowid/loowid/tree/1.1.0`

## Docker

  Too many steps to install? Don't worry loowid is also dockerized !!
  
  https://github.com/loowid/loowid-docker
  
## Development

  Follow the same steps but chage steps 5 and following:
  
  5. `npm install -g grunt-cli`
 
  6. `npm install`
  
  7. `grunt` (Default development server)
  
	 * `grunt cluster`	: Run cluster server with 2 nodes (--nodes=N change default value)
	 * `grunt prod`		: Run production environment do not watch for code changes
	 * `grunt test`		: Run unit tests

	 ```
	 Use --port=80 --sport=443 --bport=8000 to change default port values.
	 And --mongodb=off to don't startup mongodb and provide it independently
	 ```
	 ```
	 grunt cluster --sport=9090 --port=8080 --bport=7000 --nodes=3 
	 listen in ports 8080, 7001, 7002, 7003 (http) and 9090 (https).
	 ```
	 ```
	 grunt --port=8080 
	 will listen in ports 443 (https) and 8080 (http).
	 ```
	 ```
	 grunt --mongodb=off 
	 won't startup mongodb
	 ```
   
  7. If you get some npm packages errors try `npm update` (We had that errors on Windows 7 64bits)
  
## Configuration


  There are some environment variables you may set to configure your loowid deployment. 
  Check your hosting provider documentation in order to know how to set this values, for example, with openshift you can type:
  ```
  	rhc env set VARIABLE=VALUE -a app
  ```
  1. Credentials to access to some admin resources (debug level and stats). By default admin/admin.

  ```
  ADMIN_USERNAME=<your-admin-username>
  ADMIN_PASSWORD=<your-admin-password>
  ```
  2. Chrome plugin extension id. Set the id of your own plugin extension for screen sharing. A generic domain plugin will be used by default.
  
  ```
  CEXTID=<generic-domain-plugin-id>
  ```
  3. Xyrsys configuration, to configure access to xyrsys (https://xirsys.com/).
  
  ```
  XIRSYS_DOMAIN=<xyrsis domain>
  XIRSYS_USER=<xyrsys usename>
  XIRSYS_SECRET=<xyrsys password>
  ```
  4. Room timeout. The number of days that a room can be active on the server before expires (15 days by default).

  ```
  ROOM_TIMEOUT=15
  ```
  5. Path to certificate files. By default `public.pem` and `private.pem` in the same folder, you could set the full path to your own certificate files.

  ```
  PUBLIC_KEY=<path-to-your-cert-public.pem>
  PRIVATE_KEY=<path-to-your-privatekey.pem>
  ```

  6. LTI Producer Configuration. The consumer connects with multiple loowid rooms depends on LTI context, the first user with OWNER_ROLE will be the room owner. 
  The loowid producer entrypoint is configured with LTI_PATH (/lti). Set LTI_DOMAIN if your host is behind a proxy with other domain than req.headers.host. 

  ```
  LTI_KEY=<lti-key>
  LTI_SECRET=<lti-secret>
  LTI_PATH=<lti-url>
  LTI_DOMAIN=<lti-host>
  LTI_OWNER_ROLES=<lti-owner-role1>,<lti-owner-role2>,...
  ```

  7. Control host and port for websocket connection. 

  ```
  WS_HOST=<websocket-host-server>
  WS_PORT=<websocket-port-server>
  ```

  8. MongoDB URL. By Default loowid uses localhost to connect with mongodb, set one of this variables to connect to another URL. 

  ```
  MONGOLAB_URI=<MongoDB URI>
  MONGOHQ_URL=<MongoDB URL>
  ```
  
  # Translate
  If you are interested in add a translation or improve the existing ones you can use weblate platform at: 
  https://hosted.weblate.org/engage/loowid/ 

