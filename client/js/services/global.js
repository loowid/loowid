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
            scope.error_class = 'error_now';
            scope.error_message = err;
            scope.ui.safeApply(scope,function(){});
            setTimeout(function(){scope.error_class='';scope.error_message='';scope.ui.safeApply(scope,function(){});},10000);
        },
        hideError: function(scope) {
            scope.error_class = '';
            scope.error_message = '';
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
        }
    };

    return _this._data;
}]);