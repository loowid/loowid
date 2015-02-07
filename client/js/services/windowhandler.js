'use strict';
angular.module('mean.rooms').factory('WindowHandler',[function(){
	

	return function (){
	
		var defaultRelations = [{x:4,y:3},{x:16,y:9}];

		this.getDefaultWidth = function (winscale){
			return window.innerWidth * winscale;
		};
		
		this.getDefaultHeight = function(winratio,winscale){
			if (window.innerWidth <= 800) winscale = 0.75;

			var width = this.getDefaultWidth (winscale);
			return (width / defaultRelations[winratio].x * defaultRelations[winratio].y);
		};

		this.getCentered = function (width){
			return  ((window.innerWidth - width) / 2);
		};

		this.getSomeYPosition = function (){
			var winCount = document.getElementsByTagName('wmwindow').length;
			return 80 + (20*winCount);
		};

		this.create = function ($scope,mediaElement,winTitle,source,winratio,winscale,closeable,onopen,onclose){
		
			var winWidth = this.getDefaultWidth(winscale);
			var winHeight = this.getDefaultHeight(winratio,winscale);
			
			var options = {
				position: {
					x: this.getCentered(winWidth),
					y: this.getSomeYPosition ()
				},
				size : {
					width: winWidth,
					height: winHeight
				},
				windowContainer: 'moveZone',
				maximizeTo: 'moveZone',
				title: winTitle,
				initialZIndex: 500
			};
			
			var open = function (win){
				var container = win.elem.find('video').parent();	
				win.elem.find('video').remove();
				container.append (mediaElement);
				window.winHandler = win;
				if (onopen!==undefined) {onopen(window)};
			};	
			
			var close = function (win){
				if (onclose!=undefined) {onclose(window);}
				for (var i = 0; i< $scope.windows.length; i+=1){
					if (window === $scope.windows[i]){
						$scope.windows.splice(i,1);	
					}
				}
				
				//We also try to enable videos after a close
				setTimeout(function() {selWindow();}, 100);
			};
			
			var selWindow = function (win){
				//There is a perverse effect on window selection that pauses the video, lets play all 
				var videos = document.getElementsByTagName('video');
				for (var i = 0; i< videos.length; i+=1){
					videos[i].play();	
				}
			};
			
			var window = {
				options: options,
				title: winTitle,
				mediaElement: mediaElement,
				close: close,
				closeable: (closeable===undefined) ? false : closeable,
				selectwindow: selWindow,
				open: open,
			};
			
			$scope.windows.unshift (window);

		};
		
		this.init = function ($scope){
			$scope.windows = [];
		};

	};
}]);
