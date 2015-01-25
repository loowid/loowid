angular.module('mean.rooms').factory("WindowHandler",[function(){
	

	return function (){
	
		//var pwm = undefined;
		var defaultRelations = [{x:4,y:3},{x:16,y:9}];
		var e= null;
		
		/*WManager = function (){
	    	if (!this.pwm)
	    		this.pwm = new Ventus.WindowManager();
	    	return this.pwm;
		};*/

		this.getDefaultWidth = function (winscale){
			return window.innerWidth * winscale;
		}
		this.getDefaultHeight = function(winratio,winscale){
			if (window.innerWidth <= 800) winscale = 0.75;

			var width = this.getDefaultWidth (winscale);
			return (width / defaultRelations[winratio].x * defaultRelations[winratio].y);
		}

		this.getCentered = function (width){
			return  ((window.innerWidth - width) / 2);
		}

		this.getSomeYPosition = function (){
			var winCount = $("wmwindow").length;
			return 80 + (20*winCount);
		}


		this.create = function ($scope,mediaElement,winTitle,source,winratio,winscale,closeable,onopen,onclose){
		
			var winWidth = this.getDefaultWidth(winscale);
			var winHeight = this.getDefaultHeight(winratio,winscale);
		
			if ($scope.windows === undefined){
				$scope.windows = [];
			}	
			
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
				title: winTitle	
			};
			
			var open = function (win){
				var container = win.elem.find('video').parent();	
				win.elem.find('video').remove();
				container.append (mediaElement);
				onopen(win);
			};	

			var close = function (win){
				onclose(win);
				
				for (i = 0; i< $scope.windows.length; i++){
					if (window === $scope.windows[i]){
						$scope.windows.splice(i,1);	
					}
				}
			};
			
			var window = {
				options: options,
				title: winTitle,
				mediaElement: mediaElement,
				close: close,
				closeable: (closeable===undefined) ? false : closeable,
				open: open
			};
			
			$scope.windows.unshift (window);

		};
		this.init = function (scope){
			this.scope = scope;	
		}

	};
}]);
