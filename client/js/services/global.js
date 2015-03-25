'use strict';
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
        setupI18N: function(scope,rbundle,config) {
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
	                });
	            });
        	}
        },
        getUrlPort:	function($location) {
    		return ($location.$$port===80 || $location.$$port===443)?'':':'+$location.$$port;
    	}
    };

    return _this._data;
}]);