angular.module('mean.rooms').factory("WindowHandler",[function(){
	

	return function (){
	
		var pwm = undefined;
		var defaultRelations = [{x:4,y:3},{x:16,y:9}];

		WManager = function (){
	    	if (!this.pwm)
	    		this.pwm = new Ventus.WindowManager();
	    	return this.pwm;
		};

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
			var winCount = $(".wm-window").length;
			return 40 + (20*winCount);
		}


		this.create = function (mediaElement,winTitle,source,winratio,winscale,onopen,onclose){

			

			var window_class = 'my_' + source + '_window';

			var winWidth = this.getDefaultWidth(winscale);
			var winHeight = this.getDefaultHeight(winratio,winscale);

			var customWindow = WManager().createWindow.fromQuery(mediaElement,{
		                title: winTitle,
		                classname: window_class,
		                width: winWidth,
		                height: winHeight,
		                x: this.getCentered(winWidth),
		                y: this.getSomeYPosition(),

		    });
	
		    customWindow.signals.once('open', function (win){
		    	if (onopen){onopen.call (this,win);}
		    },customWindow);

		    customWindow.signals.on ('maximize', function (win){
		    	$('body').prepend (win.el);
		      	win.move(10,10);
		      	var width =  '' + (window.innerWidth -20) + 'px';
		      	var height = '' + (window.innerHeight -20) + 'px';
        		win.el.css ({'z-index':'50000'});
		      	$('section',win.el).css ('height','100%');
		      	$('video',win.el).addClass('fullVideo');
		      	$('video',win.el).get(0).play();
		      	win.resize (width,height);
		      	win.movable = false;
		    });
		    
		    customWindow.signals.on ('restore', function (win){
				$('.wm-space').prepend (win.el);
				win.el.css ({'z-index':'10001'});
				setTimeout (function (){
					$('section',win.el).css('height','');
					$('video',win.el).removeClass('fullVideo');
			      	$('video',win.el).get(0).play();
		      		$('.wm-window-title',win.el).click();
		      		$('.wm-space',win.el).click();
		      		win.movable = true;
		      	},200);
		    });


		    customWindow.signals.once('close', function (win){
		    	if (onclose) onclose.call(this,win);
		    	$("."+window_class).remove();
			},customWindow);

		    customWindow.open();
			
		};


	};
}]);
