(function() {
	'use strict';
	angular.module('sigmajs-ng', []).directive('sigmajs', function() {
		//over-engineered random id, so that multiple instances can be put on a single page
		var divId = 'sigmjs-dir-container-'+Math.floor((Math.random() * 999999999999))+'-'+Math.floor((Math.random() * 999999999999))+'-'+Math.floor((Math.random() * 999999999999));
		return {
			restrict: 'E',
			template: '<div id="'+divId+'" style="width: 100%;height: 100%;"></div>',
			scope: {
				//@ reads the attribute value, = provides two-way binding, & works with functions
				graph: '=',
				width: '@',
				height: '@',
				releativeSizeNode: '='
			},
			link: function (scope, element, attrs) {
				// Let's first initialize sigma:
				
				
			var i,
				s,
				g = {
				  nodes: [],
				  edges: []
				};
  
				s = new sigma({
				  graph: g,
				  renderer: {
					container: element[0].firstChild,
					type: 'canvas'
				  },
				  settings: {
					minArrowSize: 8,
					mouseEnabled: false,
					 defaultLabelColor: '#FFF'
				  }
				});
	
				scope.$watch('graph', function(newVal,oldVal) {
					s.graph.clear();
					s.graph.read(scope.graph);
					s.refresh();
					if(scope.releativeSizeNode) {
						//this feature needs the plugin to be added
						sigma.plugins.relativeSize(s, 2);
					}
				});
	
				scope.$watch('width', function(newVal,oldVal) {
					element.children().css("width",scope.width);
					s.refresh();
					window.dispatchEvent(new Event('resize')); //hack so that it will be shown instantly
				});
				scope.$watch('height', function(newVal,oldVal) {
					element.children().css("height",scope.height);
					s.refresh();
					window.dispatchEvent(new Event('resize'));//hack so that it will be shown instantly
				});
	
				element.on('$destroy', function() {
					s.graph.clear();
				});
			}
		};
	});
})();	