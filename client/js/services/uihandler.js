angular.module('mean.rooms').factory("UIHandler",[function(){
    var _this = this;
    _this._data = {};
    
    //necessary to avoid asyncronious errors
	_this._data.safeApply = function(scope, fn) {
			var phase = scope.$root.$$phase;
			if(phase == '$apply' || phase == '$digest')
			scope.$eval(fn);
			else
			scope.$apply(fn);
	}

    return _this._data;



}]);