'use strict';
angular.module('mean.stats').controller('StatsController',['$scope','Stats','ngI18nResourceBundle','ngI18nConfig', function ($scope,Stats,ngI18nResourceBundle,ngI18nConfig) {
	
    ngI18nResourceBundle.get().success(function (resourceBundle) {
        $scope.resourceBundle = resourceBundle;
        $scope.resourceBundle._ = $scope.global._;
    });
    
	$scope.init = function(){
		
		var stopLoading = function() {
			document.getElementById('noscript').style.display = 'none';
		};
		
		Stats.rooms(function(list){
			var labels = [];
			var rooms = [];
			for (var k=0; k<list.length; k+=1) {
				labels.push($scope.resourceBundle.dateformat.replace('dd',list[k]._id.day).replace('mm',list[k]._id.month).replace('yyyy',list[k]._id.year));
				rooms.push(list[k].count);
			}
			$scope.labels0 = labels;
			$scope.series0 = [$scope.resourceBundle.roomsbyday];
			$scope.data0 = [ rooms ];
			stopLoading();
		});

		var getNameFor = function(obj) {
			var first = (obj.permanent?$scope.resourceBundle.roomspermanent:$scope.resourceBundle.roomstemp);
			first += '/'+(obj.access==='LINK'?$scope.resourceBundle.roomslink:$scope.resourceBundle.roomspass);
			return first+'/'+(obj.moderated?$scope.resourceBundle.roomsmoderated:$scope.resourceBundle.roomsnomoderated);
		};
		
		Stats.roomsbytype(function(list){
			var labels = [];
			var rooms = [];
			for (var k=0; k<list.length; k+=1) {
				labels.push(getNameFor(list[k]._id));
				rooms.push(list[k].count);
			}
			$scope.labels1 = labels;
			$scope.series1 = [$scope.resourceBundle.roomsbytype];
			$scope.data1 = rooms;
			stopLoading();
		});
	};

}]);
