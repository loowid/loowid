'use strict';
/*global rtc: true */
angular.module('mean.rooms').factory('UIHandler',['$window','$timeout',function($window, $timeout){
    var _this = this;
    _this._data = {};
    
    //necessary to avoid asyncronious errors
	_this._data.safeApply = function(scope, fn) {
			var phase = scope.$root.$$phase;
			if(phase === '$apply' || phase === '$digest') {
				scope.$eval(fn);
			} else {
				scope.$apply(fn);
			}
	};

	_this._data.debug = false;
	_this._data.version = 'v'+window.loowidVersion;
	_this._data.node = window.loowidNode;
	
	_this.keyboard = {
	
		buffer: [],
	  	
		detectCombination: function() {
			var codes = {};
			
			_this.keyboard.buffer.forEach(function(code) {
			  codes['key' + code] = 1;
			});

			if (codes.key17 && codes.key16 && codes.key68) {
			  rtc.debug = !rtc.debug;
			  var status = (rtc.debug) ? 'enabled' : 'disabled';
			  console.log ('RTC Debug ' +  status);
			  return true; 
			}
			return false;
		  },

		  keydown: function(event) {
			_this.keyboard.buffer.push(event.keyCode);
			if (_this.keyboard.detectCombination()){
				event.preventDefault();	
			}
		
		  },
		  keyup: function(event) {
			_this.keyboard.buffer = [];
			event.preventDefault();
		  }
	};
	
	document.addEventListener ('keydown',_this.keyboard.keydown);
	document.addEventListener ('keyup',_this.keyboard.keyup);
	
	return _this._data;
	
}]);