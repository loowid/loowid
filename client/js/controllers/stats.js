'use strict';
angular.module('mean.stats').controller('StatsController',['$scope','Stats','Global','ngI18nResourceBundle','ngI18nConfig','UIHandler','$routeParams', function ($scope,Stats,Global,ngI18nResourceBundle,ngI18nConfig,uiHandler,$routeParams) {
	
	$scope.global = Global;
	
	$scope.global.setupI18N($scope,ngI18nResourceBundle,ngI18nConfig);
	
	var stopLoading = function() {
			document.getElementById('noscript').style.display = 'none';
	};
		
	
	$scope.init = function(){
		
		
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
	
	$scope.initWebRTCStatistics = function() {
		$scope.sigmaGraph = {
		  'nodes': [],
		  'edges': []
		};
		
		var colors = [
			  '#617db4',
			  '#668f3c',
			  '#c6583e',
			  '#b956af'
			];
		
		var edgeColors = {
				'video': {
					'new': 'rgba(97, 125, 180, 0.76)',
					'checking': 'rgba(97, 125, 180, 0.94)',
					'connecting': 'rgba(0, 189, 196, 0.76)',
					'connected': 'rgba(0, 245, 255, 0.76)',
					'completed': 'rgb(0, 95, 248)',
					'failed':  'rgb(224, 89, 229)',
					'disconnected':  'rgb(166, 105, 168)',
					'closed': 'rgb(166, 105, 168)'
				},
				'screen': {
					'new': 'rgba(116, 180, 97, 0.76)',
					'checking': 'rgba(129, 180, 97, 0.94)',
					'connecting': 'rgba(173, 196, 0, 0.76)',
					'connected': 'rgba(255, 245, 0, 0.76)',
					'completed': 'rgb(0, 248, 29)',
					'failed':  'rgb(117, 157, 87)',
					'disconnected':  'rgb(153, 168, 105)',
					'closed': 'rgb(134, 168, 105)'
				},
				'audio': {
					'new': 'rgba(180, 135, 97, 0.76)',
					'checking': 'rgba(180, 142, 97, 0.94)',
					'connecting': 'rgba(196, 0, 0, 0.76)',
					'connected': 'rgba(255, 0, 0, 0.76)',
					'completed': 'rgb(248, 172, 0)',
					'failed':  'rgb(157, 103, 87)',
					'disconnected':  'rgb(168, 105, 105)',
					'closed': 'rgb(168, 141, 105)'
				}
		};

		var readWebRTCStats = function (){
			Stats.webrtcstats ($routeParams.roomId,function (list){
				var graph={};
				graph.nodes =[];
				graph.edges = [];
				for (var key in list){
					if (list.hasOwnProperty(key)){
						var peerList = list[key];
						var node = {
							'id': key,
							'label': key,
							'size': peerList.length,
							'x': Math.random(),
							'y': Math.random(),
							'color': colors[Math.floor(Math.random() * colors.length)]
						};
						graph.nodes.push (node);
						
						//Add the edges
						
						for (var edgeKey in peerList){
							var peerInfo = peerList[edgeKey];
							if (peerInfo.produced){
								var edge = {
									id: 'ed_' +	key + '_' + peerInfo.peerId +'_' + peerInfo.source,
									color: edgeColors[peerInfo.source][peerInfo.status],
									source: key,
									target: peerInfo.peerId,
									type: 'curvedArrow'
								};
								graph.edges.push (edge);
							}
						}
					}
				}
				
				$scope.sigmaGraph = graph;
				
				
				
			});
			
			setTimeout (function (){
				uiHandler.safeApply($scope,function(){
					readWebRTCStats();
				});
			},5000);
		};
		
		readWebRTCStats();

		
		/*$scope.sigmaGraph = {
		  'nodes': [
			{
			  'id': 'n0',
			  'label': 'A node',
			  'x': 0,
			  'y': 0,
			  'size': 3
			},
			{
			  'id': 'n1',
			  'label': 'Another node',
			  'x': 3,
			  'y': 1,
			  'size': 2
			},
			{
			  'id': 'n2',
			  'label': 'And a last one',
			  'x': 1,
			  'y': 3,
			  'size': 1
			}
		  ],
		  'edges': [
			{
			  'id': 'e0',
			  'source': 'n0',
			  'target': 'n1',
			  'type': 'curvedArrow'
			},
			  {
			  'id': 'e3',
			  'source': 'n1',
			  'target': 'n0',
			  'type': 'curvedArrow'
			},

			  {
			  'id': 'e1',
			  'source': 'n1',
			  'target': 'n2'
			},
			{
			  'id': 'e2',
			  'source': 'n2',
			  'target': 'n0'
			}
		  ]
	
		};*/
			uiHandler.safeApply($scope,function(){
				stopLoading();
			});
	
	};
}]);
