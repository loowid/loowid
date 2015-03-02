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

	_this._data.hideAddThis = function() {
		var rAddThis = setInterval(function(){
			var addThis = document.getElementById('at4-share');
			if (addThis) {
				window.clearInterval(rAddThis);
				_this._data.addThisParent = addThis.parentNode;
				_this._data.addThisNode = addThis;
				addThis.parentNode.removeChild(addThis);
			}
	   	},100);
	};
	
	_this._data.addThisSetUrl = function($scope) {
		var addthis = 'addthis_share';
		window[addthis] = {};
		if (_this._data.sharepermanent) {
			window[addthis].title = $scope.resourceBundle.addthisptitle;
			window[addthis].url = _this._data.permanenturl;
		} else {
			window[addthis].title = $scope.resourceBundle.addthistitle;
			window[addthis].url = _this._data.screenurl;
		}
	};
	
	_this._data.addThisSlideOut = function() {
		if (_this._data.addthisslide) {
			window.clearTimeout(_this._data.addthisslide);
		}
		_this._data.addthisslide = setTimeout(function(){
			document.getElementById('at4-scc').click();
			_this._data.addthisvisible = false;
		},10000);
	};
	
	_this._data.showAddThis = function($scope) {
		_this._data.addThisSetUrl($scope);
		var ats = document.getElementById('at4-share');
		if (!ats) {
			ats = _this._data.addThisNode;
			_this._data.addThisParent.appendChild(_this._data.addThisNode);
			_this._data.addThisSlideOut();
		} else {
			if (ats.className.indexOf('at4-show')>0) {
				_this._data.addThisSlideOut();
			} else {
				document.getElementById('at4-soc').click();
				_this._data.addThisSlideOut();
			}
		}
		if (_this._data.sharepermanent && ats.className.indexOf('atss-perm')<0) {
			ats.className += ' atss-perm';
		} else {
			ats.className = ats.className.replace(' atss-perm','');
		}
	};

	_this._data.sharePermanentUrl = function(value,$scope) {
		_this._data.sharepermanent = value;
		_this._data.showAddThis($scope);
		
	};
	
	document.addEventListener ('keydown',_this.keyboard.keydown);
	document.addEventListener ('keyup',_this.keyboard.keyup);
	
	return _this._data;
	
}]);