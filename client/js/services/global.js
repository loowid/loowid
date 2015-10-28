'use strict';
/*global SpeechSynthesisUtterance: true */
/*global speechSynthesis: true */
angular.module('mean.system').factory('Global', [function() {
    var _this = this;
    _this._data = {
        user: window.user,
        authenticated: !! window.user,
        roomId:'',
        isValidSender: function() {
            // Firefox and chrome
            return (navigator.webkitGetUserMedia || navigator.mozGetUserMedia );
        },
        isValidReceiver: function() {
            // Firefox and Chrome
            return (navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
        },
        userColors: {},
        styleFor: function(sender) {
            var val = this.userColors[sender];
            if (!val) {
                val = '#'+Math.floor(Math.random()*16777215).toString(16);
                this.userColors[sender] = val;
            }
            return {color:val};
        },
        namePattern: /^[^'"|]{3,30}$/,
        numberResolutionPattern: /^\d\d\d\d?$/,
        bitratePattern: /^\d\d?\d?\d?$/,
       
        bot: '||@@||',
        own: '||##||',
        showError: function(scope,err) {
            scope.errorClass = 'error_now';
            scope.errorMessage = err;
            scope.ui.safeApply(scope,function(){});
            setTimeout(function(){scope.errorClass='';scope.errorMessage='';scope.ui.safeApply(scope,function(){});},10000);
        },
        hideError: function(scope) {
            scope.errorClass = '';
            scope.errorMessage = '';
        },
        _: function() {
        	if (arguments.length>0) {
        		var txt = this[arguments[0]];
        		if (txt) {
	        		for (var z=0; z<arguments.length; z+=1) {
	        			txt = txt.replace('{'+z+'}',arguments[z+1]);
	        		}
	        		return txt;
        		} else {
        			return 'not found: '+arguments[0];
        		}
        	}
        	return null;
        },
        setupI18N: function(scope,rbundle,config,cb) {
        	if (scope.ui) {
        		scope.ui.supportedLocales = config.supportedLocales;
        		scope.ui.defaultLocale = config.defaultLocale;
        		scope.ui.basePath = config.basePath;
        		scope.ui.cache = config.cache;
        	}
        	// Get default locale and then add
        	if (!scope.resourceBundle) {
	            rbundle.get({locale:'en'}).success(function (defaultBundle) {
	                scope.resourceBundle = defaultBundle;
	                scope.resourceBundle._ = _this._data._;
	                rbundle.get().success(function (resourceBundle) {
	                	for (var el in scope.resourceBundle) {
	                		// Redefine i18n tags
	                		if (resourceBundle[el]) {
	                			scope.resourceBundle[el] = resourceBundle[el];
	                		}
	                	}
	                	if (cb) { cb(); }
	                });
	            });
        	}
        },
        getUrlPort:	function($location) {
    		return ($location.$$port===80 || $location.$$port===443)?'':':'+$location.$$port;
    	},
    	speechText: function(scope,readText) {
    		if ('speechSynthesis' in window) {
    			 // Synthesis support. Make your web apps talk!
    			var speechUtt = new SpeechSynthesisUtterance();
    			if (!scope.ui.speechEnabled) {
    				speechUtt.onend = function() {
    					scope.ui.speechVoice = speechUtt.voice;
    					scope.ui.speechVoiceList = speechSynthesis.getVoices().filter(function(voice){ return voice.lang.indexOf((navigator.userLanguage || navigator.language)+'-')>=0; });
    					scope.ui.speechEnabled = (scope.ui.speechVoiceList.length > 0);
    				};
    			} 
    			speechUtt.rate = 1.0;
    			// TODO: This should be the origin locale not the destination locale !!
    			speechUtt.lang = navigator.userLanguage || navigator.language;
    			if (scope.ui.speechVoice) {
    				speechUtt.voice = scope.ui.speechVoice;
    			}
    			// Get talk smart, do not read everything !!
    			var t = readText;
    			if (t.length>50) { t = t.substring(0,50)+';'+scope.resourceBundle.moretext; }
    			speechUtt.text = t;
    			speechSynthesis.speak(speechUtt);
    		} else {
    			scope.ui.speechEnabled = false;
    			var audio = document.getElementById('audiotts')?document.getElementById('audiotts'):document.createElement('audio');
    			audio.setAttribute('id', 'audiotts');
    			audio.setAttribute('src', '/chat/talk?text=' + encodeURIComponent(readText));
    			audio.load();
    			audio.play();
    		}
    	}
    };

    return _this._data;
}]);