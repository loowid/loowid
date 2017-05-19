'use strict';
angular.module('mean.rooms').factory('WindowHandler',[function(){


	return function (){

		var defaultRelations = [{x:4,y:3},{x:16,y:9}];
		this.windowsOpen = 0;

		this.getDefaultWidth = function (winscale){
			return window.innerWidth * winscale;
		};

		this.getDefaultHeight = function(winratio,winscale){
			if (window.innerWidth <= 800) { winscale = 0.75; }

			var width = this.getDefaultWidth (winscale);
			return (width / defaultRelations[winratio].x * defaultRelations[winratio].y);
		};

		this.getCentered = function  (width){
			return  ((window.innerWidth - width) / 2) + (40 * (this.windowsOpen % 5));
		};

		this.getSomeYPosition = function (){
			return 80 + (40 * (this.windowsOpen % 4));
		};

		this.create = function ($scope,windowOptions){

			var mediaElement = windowOptions.mediaElement;
			var winTitle = windowOptions.title;
			var winratio = windowOptions.ratio;
			var winscale = windowOptions.scale;
			var closeable = windowOptions.closeable;
			var onopen = windowOptions.onopen;
			var onclose = windowOptions.onclose;
			var onmaximize = windowOptions.onmaximize;
			var onrestore = windowOptions.onrestore;
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
				minimizeTo: 'minimizedPlace',
				title: winTitle,
				initialZIndex: 500
			};

			this.windowsOpen +=1;

			var open = function (win){
				var container = win.elem.find('video').parent();
				win.elem.find('video').remove();
				container.append (mediaElement);
				window.winHandler = win;
				if (onopen!==undefined) { onopen(window); }
			};

			var close = function (win){
				if (onclose!==undefined) { onclose(window); }
				for (var i = 0; i< $scope.windows.length; i+=1){
					if (window === $scope.windows[i]){
						$scope.windows.splice(i,1);
					}
				}

				//We also try to enable videos after a close
				setTimeout(function() {selWindow();}, 100);
			};

			var maximize = function (win){
				if (onmaximize!==undefined) { onmaximize (window);}
			};

			var restore = function (win){
				if (onrestore!==undefined) { onrestore (window);}
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
				maximize: maximize,
				maximizeTitle:  $scope.resourceBundle._('titleMaximizeWindow',winTitle),
				minimizeTitle:  $scope.resourceBundle._('titleMinimizeWindow',winTitle),
				restoreTitle:  $scope.resourceBundle._('titleRestoreWindow',winTitle),
				closeTitle:  $scope.resourceBundle._('titleCloseWindow',winTitle),
				restore: restore
			};

			$scope.windows.unshift (window);
		};

		this.init = function ($scope){
			$scope.windows = [];
		};

	};
}]);
