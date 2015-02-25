'use strict';
angular.module('mean.stats').controller('StatsController',['$scope','Stats','Global','ngI18nResourceBundle','ngI18nConfig', function ($scope,Stats,Global,ngI18nResourceBundle,ngI18nConfig) {
	
	$scope.global = Global;
	
	$scope.global.setupI18N($scope,ngI18nResourceBundle,ngI18nConfig);
	
	$scope.init = function(){
		
		var stopLoading = function() {
			document.getElementById('noscript').style.display = 'none';
		};
		
		var roundNumber = function(num) {
			return Math.round(num * 100) / 100;
		};
		
		Stats.rooms(function(list){
			var labels = [];
			var rooms = [];
			var members = [];
			var messages = [];
			for (var k=0; k<list.length; k+=1) {
				labels.push($scope.resourceBundle.dateformat.replace('dd',list[k]._id.day).replace('mm',list[k]._id.month).replace('yyyy',list[k]._id.year));
				rooms.push(list[k].count);
				members.push(list[k].members);
				messages.push(roundNumber(list[k].count>0?list[k].messages/list[k].count:0));
			}
			$scope.labels0 = labels;
			$scope.series0 = [$scope.resourceBundle.roomsbyday,$scope.resourceBundle.membersbyday,$scope.resourceBundle.messagesbyroom];
			$scope.data0 = [ rooms, members, messages ];
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
