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
	
	_this._data.addThisSetUrl = function($scope,pm) {
		var addthis = 'addthis_share';
		var mtitle = 'addthistitle';
		window[addthis] = {};
		_this._data.sharepermanent = pm && _this._data.sharepermanent;
		if (_this._data.sharepermanent) {
			mtitle = 'addthisptitle';
			window[addthis].url = _this._data.permanenturl;
		} else {
			window[addthis].url = _this._data.screenurl;
		}
		var itm = setTimeout(function(){
			if ($scope.resourceBundle) {
				window[addthis].title = $scope.resourceBundle[mtitle];
				window.clearInterval(itm);
			}
		},100);
	};
	
	_this._data.showAddThis = function($scope) {
		_this._data.addThisSetUrl($scope);
		if (_this._data.addThisParent) {
			_this._data.addThisParent.appendChild(_this._data.addThisNode);
		}
	};

	_this._data.sharePermanentUrl = function(value,$scope) {
		_this._data.sharepermanent = value;
		_this._data.addThisSetUrl($scope,true);
		
	};
	
	document.addEventListener ('keydown',_this.keyboard.keydown);
	document.addEventListener ('keyup',_this.keyboard.keyup);
	
	return _this._data;
	
}]);