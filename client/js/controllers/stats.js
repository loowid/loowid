'use strict';
angular.module('mean.stats').controller('StatsController',['$scope','Stats','Global','ngI18nResourceBundle','ngI18nConfig','UIHandler','$routeParams','_', function ($scope,Stats,Global,ngI18nResourceBundle,ngI18nConfig,uiHandler,$routeParams,_) {

	$scope.global = Global;

	var initFn = {};
	var currentPage = 1;
	var pageSize = 60;
	var lastPageSize = 0;
	var refresher; //The timeout refresher

	$scope.global.setupI18N($scope,ngI18nResourceBundle,ngI18nConfig,function(){
		Stats.rooms(currentPage,initFn.processByDay);
		Stats.roomsbytype(initFn.processByType);
	});

	var stopLoading = function() {
		document.getElementById('noscript').style.display = 'none';
	};

	var sources = ['video','screen','audio'];

	$scope.selectedSource = 'video';

	$scope.getCurrentPage = function () { return currentPage; };

	$scope.hasNextPage = function () {
		return lastPageSize === pageSize;
	};

	$scope.hasPreviousPage = function() {
		return currentPage > 1;
	};

	$scope.nextPage = function() {
		currentPage += 1;
		Stats.rooms(currentPage,initFn.processByDay);
	};

	$scope.previousPage = function() {
		currentPage -= 1;
		Stats.rooms(currentPage,initFn.processByDay);
	};

	$scope.init = function(){

		var roundNumber = function(num) {
			return Math.round(num * 100) / 100;
		};

		initFn.processByDay = function(list){
			var labels = [];
			var rooms = [];
			var members = [];
			var maxmembers = [];
			var messages = [];
			lastPageSize = list.length;
			if (lastPageSize===0) { currentPage -=1; }
			for (var k=0; k<list.length; k+=1) {
				labels.push($scope.resourceBundle.dateformat.replace('dd',list[k]._id.day).replace('mm',list[k]._id.month).replace('yyyy',list[k]._id.year));
				rooms.push(list[k].count);
				members.push(list[k].members);
				maxmembers.push(list[k].maxmembers || 0);
				messages.push(roundNumber(list[k].count>0?list[k].messages/list[k].count:0));
			}
			$scope.labelsl0 = labels;
			$scope.seriesl0 = [$scope.resourceBundle.roomsbyday];
			$scope.seriesl1 = [$scope.resourceBundle.membersbyday,$scope.resourceBundle.maxmembersbyroom];
			$scope.seriesl2 = [$scope.resourceBundle.messagesbyroom];
			$scope.datal0 = [ rooms ];
			$scope.datal1 = [ members , maxmembers ];
			$scope.datal2 = [ messages ];
			stopLoading();
		};

		var getNameFor = function(obj) {
			var first = (obj.permanent?$scope.resourceBundle.roomspermanent:$scope.resourceBundle.roomstemp);
			first += '/'+(obj.access==='LINK'?$scope.resourceBundle.roomslink:$scope.resourceBundle.roomspass);
			return first+'/'+(obj.moderated?$scope.resourceBundle.roomsmoderated:$scope.resourceBundle.roomsnomoderated);
		};

		initFn.processByType = function(list) {
			var labels = [];
			var rooms = [];
			for (var k=0; k<list.length; k+=1) {
				labels.push(getNameFor(list[k]._id));
				rooms.push(list[k].count);
			}
			$scope.labelsp1 = labels;
			$scope.seriesp1 = [$scope.resourceBundle.roomsbytype];
			$scope.datap1 = rooms;
			stopLoading();
		};

	};

	$scope.initWebRTCStatistics = function() {

		$scope.graphvideo = {
			'nodes': [],
			'edges': []
		};

		$scope.graphscreen = {
			'nodes': [],
			'edges': []
		};

		$scope.graphaudio = {
			'nodes': [],
			'edges': []
		};

		$scope.colors = {
			'userConnected' : '#617db4',
			'userDisconnected' :'#080808'
		};

		$scope.edgeColors = {
			'new': 'rgba(234, 234, 23, 0.76)',
			'checking': 'rgba(255, 165, 1, 0.94)',
			'connecting': 'rgb(57, 100, 35)',
			'connected': 'rgb(0, 255, 39)',
			'completed': 'rgb(19, 248, 0)',
			'failed':  'rgb(155, 9, 9)',
			'disconnected':  'rgb(255, 0, 0)',
			'closed': 'rgb(0, 0, 0)'
		};



		$scope.showDisconnected = true;

		var graphs={};

		graphs.video = {
			'nodes': [],
			'edges': []
		};

		graphs.screen = {
			'nodes': [],
			'edges': []
		};

		graphs.audio = {
			'nodes': [],
			'edges': []
		};

		$scope.selectTab = function (tab){
			$scope.selectedSource = tab;
			readWebRTCStats(true);
		};

		$scope.changeDisconnectedVisibility = function (){
			$scope.showDisconnected=!$scope.showDisconnected;
			readWebRTCStats(true);
		};

		$scope.onStartDraggingNode = function (node){
			if (refresher){
				clearTimeout (refresher);
			}
		};

		$scope.onEndDraggingNode = function (node){
			//Update the node status
			var toRenderNode = _.findWhere(graphs[$scope.selectedSource].nodes,{id: node.id});
			toRenderNode.x = node.x;
			toRenderNode.y = node.y;

			//Re initialize the graph updater
			readWebRTCStats (false);
		};

		var processData = function (list){
			$scope.graphvideo = [];
			$scope.graphscreen = [];
			$scope.graphaudio = [];
			//Clean the edges
			graphs.video.edges = [];
			graphs.screen.edges = [];
			graphs.audio.edges = [];

			processNodes(list);
			processEdges(list);


			uiHandler.safeApply($scope,function(){
				$scope.graphvideo.nodes = graphs.video.nodes;
				$scope.graphvideo.edges = graphs.video.edges;
				$scope.graphscreen.nodes = graphs.screen.nodes;
				$scope.graphscreen.edges = graphs.screen.edges;
				$scope.graphaudio.nodes = graphs.audio.nodes;
				$scope.graphaudio.edges = graphs.audio.edges;

			});
		};

		var processNodes = function(list){
			for (var key in list.webrtcStats){

				if (list.webrtcStats.hasOwnProperty(key)){

					var username , userstatus;

					if (list.roomInfo.owner.connectionId === key ){
						username = list.roomInfo.owner.name;
						userstatus = list.roomInfo.owner.status;
					}else{
						var user = _.findWhere (list.roomInfo.guests, {connectionId: key});
						username = user ? user.name : key;
						userstatus = user ? user.status : 'DISCONNECTED';
					}

					var peerList = list.webrtcStats[key];
					addNodes (key,username,userstatus,peerList,$scope.showDisconnected);

				}
			}
		};

		var addNodes = function (key,username,userstatus,peerList,showDisconnected){
			for (var sourceId in sources){
				if (sources.hasOwnProperty (sourceId)){
					var source = sources[sourceId];

					//Look if there are connections to other nodes of this source type
					var sourceEdges = _.findWhere (peerList,{'source': source});

					if (sourceEdges){

						//Look if the node is already in the list
						var node = _.findWhere (graphs[source].nodes, {id: key});
						handleNode(node,key,username,userstatus,source,showDisconnected);

					}
				}
			}
		};

		var handleNode = function (node,key,username,userstatus,source,showDisconnected){

			if (node === undefined) {
				//If it's not in the list put it in
				node = {
					'id': key,
					'size': 3,
					'x': Math.random(),
					'y': Math.random()
				};

				graphs[source].nodes.push (node);
			}

			//we change the name in case user changed

			node.label = username || key;
			node.color = userstatus === 'CONNECTED' ? $scope.colors.userConnected : $scope.colors.userDisconnected;

			if (!showDisconnected && userstatus==='DISCONNECTED'){
				graphs[source].nodes =	_.without (graphs[source].nodes,node);
			}
		};

		var processEdges = function (list){
			//Add the edges
			for (var key in list.webrtcStats){
				if (list.webrtcStats.hasOwnProperty(key)){
					var peerList = list.webrtcStats[key];
					addEdges (key,_.filter(peerList,function (peer){
						return (peer.source === 'video' || peer.source === 'audio' || peer.source === 'screen') ;
					}));
				}
			}
		};

		var addEdges = function (key,peerList){
			for (var edgeKey in peerList){
				if (peerList.hasOwnProperty(edgeKey)){
					var peerInfo = peerList[edgeKey];
					if (peerInfo.produced && _.findWhere (graphs[peerInfo.source].nodes, {id: peerInfo.peerId}) !== undefined && _.findWhere (graphs[peerInfo.source].nodes, {id: key}) !== undefined){
						var edge = {

							id: 'ed_' +	key + '_' + peerInfo.peerId +'_' + peerInfo.source,
							color: $scope.edgeColors[peerInfo.status],
							source: key,
							label: peerInfo.status,
							target: peerInfo.peerId,
							type: 'curvedArrow'
						};
						graphs[peerInfo.source].edges.push (edge);
					}
				}
			}
		};

		var readWebRTCStats = function (justonetime){

			Stats.webrtcstats ($routeParams.roomId,function (list){
				processData(list);
				uiHandler.safeApply($scope,function(){
					stopLoading();
				});
			});

			if (justonetime === undefined || !justonetime){
					refresher = setTimeout (function (){
					uiHandler.safeApply($scope,function(){
						readWebRTCStats();
					});

				},2500);
			}
		};

		readWebRTCStats();

	};
}]);
