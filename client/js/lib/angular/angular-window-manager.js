'use strict';

/**
 * @ngdoc directive
 * @name ngWindowManager.directive:wmwindow
 * @description
 * # wmWindow
 */

angular.module('ngWindowManager',[])
.directive('wmwindow', function () {
	return {
		template: '<div class="wmWindow">'+
					'<div class="wmWindowBox">'+
						'<div class="wmTitleBar">' +
							'<div class="wmTitle">{{title}}</div>'+
							'<div class="wmButtonBar">' +
								'<button title="{{minimizetitle}}" class="wmMinimize" ng-show="isMinimizable()">' + 
								'<button title="{{maximizetitle}}" class="wmMaximize" ng-show="isMaximizable()">' + 
								'<button title="{{restoretitle}}"  class="isHidden wmRestore"/>'+
								'<button title="{{closetitle}}" class="wmClose" ng-show="isCloseable()" />'+
							'</div>'+
						'</div>'+
						'<div class="wmContent" data-ng-transclude ></div>'+
						'<button  class="wmResize" />'+
					'</div>'+
				'</div>',
		restrict: 'E',
		replace: true,
		transclude: true,
		scope: {
			title: '@',
			close: '=',
			open: '=',
			selectwindow: '=',
			maximize: '=',
			restore: '=',
			minimize: '=',
			options: '@',
			maximizable: '@',
			minimizable: '@',
			closeable: '@',
			maximizetitle: '@',
			minimizetitle: '@',
			restoretitle: '@',
			closetitle: '@'
		},
		link: function (scope, element) {
			
			var parentWindow = element[0].parentElement;
			
			var titleBarElement = element[0].children[0].children[0];
			var contentButtonElement = element[0].children[0].children[1];
			var resizeButtonElement = element[0].children[0].children[2];
			
			var buttonBar = titleBarElement.children[1];
		
			var minimizeButton = buttonBar.children[0];
			var maximizeButton = buttonBar.children[1];
			var restoreButton = buttonBar.children[2];
			
			var closeButton = buttonBar.children[3];
			
			//State variables
			var positionState = null;
			var sizeState = null;
			var currentWindowState = {state:'flow'};
			
			var winHandler = {};
			winHandler.elem = element;
			
			//Parse the options
			var options = scope.options ? JSON.parse(scope.options) :{};
	
			//If it's defined a windowContainer zone we will use it to bind 
			//all the listeners, that way we can fit windows under an element but move in other 
			var windowArea = options.windowContainer===undefined ? parentWindow : document.getElementById(options.windowContainer);
		
			//Set some tricky controls to handle the layering
			parentWindow.topZ = parentWindow.topZ || options.initialZIndex || angular.element(parentWindow).css('z-index') || 100000;
			
			//This function is executed when close button is pushed
			winHandler.close = function (){
				
				//If the window is minimized we remove the button
				if (currentWindowState !== undefined){
								angular.element (currentWindowState.minimizedBtn).remove();
				}
				
				setTimeout (function (){
					element.addClass ('closing');
					setTimeout (function (){
						element.removeClass ('closing');
						element.remove();
					},300);
				},50);

				if (scope.close){
					scope.close(winHandler);
				}
			};
		

			scope.isMaximizable = function (){
				return (scope.maximizable === undefined || scope.maximizable === true || scope.maximizable === 'true') ? true : false ;
			};
			
			scope.isMinimizable = function (){
				return ((scope.minimizable === undefined || scope.minimizable === true || scope.minimizable === 'true') && currentWindowState.state !=='maximized') ? true : false ;
			};
			
			scope.isCloseable = function (){
				return (scope.closeable === undefined || scope.closeable === true || scope.closeable === 'true') ? true : false ;
			};
			
			//Executed when touches or clicks in the title bar 
			var startMoving = function (e){
				var isTouch = (e.targetTouches && e.targetTouches.length === 1);
				var moveRef =  isTouch ?  e.targetTouches[0] : e;
				
				positionState = calculatePos({
					x: moveRef.pageX,
					y: moveRef.pageY
				});

				element.addClass('moving');

				windowArea.addEventListener (isTouch ? 'touchmove' : 'mousemove',dragWindow);
				windowArea.addEventListener (isTouch ? 'touchend' : 'mouseup',dragWindowEnds);

				winHandler.selectWindow();
				
				e.preventDefault();
			};

			//Executed when touches or clicks in the resize button
			var startResizing = function (e){
				var isTouch = (e.targetTouches && e.targetTouches.length === 1);
				var moveRef =  isTouch ?  e.targetTouches[0] : e;
				
				
				sizeState = calculateSize ({
					width:  moveRef.pageX,
					height: moveRef.pageY
				});

				element.addClass('resizing');

				windowArea.addEventListener (isTouch ? 'touchmove' : 'mousemove',dragWindowCorner);
				windowArea.addEventListener (isTouch ? 'touchend' : 'mouseup', dragWindowCornerEnds);
				winHandler.selectWindow();
				
				e.preventDefault();

			};

			//Execute when user moves the mouse after title is clicked
			var dragWindow = function(e) {  
				var moveRef = (e.targetTouches && e.targetTouches.length === 1) ?  e.targetTouches[0] : e;
			
				if (positionState){
					winHandler.move(
						moveRef.pageX - positionState.x,
						moveRef.pageY - positionState.y
					);
				}
				
				e.preventDefault();
			};

			//Execute when user moves the pointer after resize button is clicked
			var dragWindowCorner = function (e){
				var moveRef = (e.targetTouches && e.targetTouches.length === 1) ?  e.targetTouches[0] : e;
				
				if (sizeState){
					winHandler.resize (
						moveRef.pageX + sizeState.width,
						moveRef.pageY + sizeState.height
					);	
				}
				
				e.preventDefault();
			};

			//The user ends moving window when mouseup or touchends
			var dragWindowEnds = function (e){
				var isTouch = (e.targetTouches && e.targetTouches.length === 1);
				
				if (positionState) {
					element.removeClass('moving');
					positionState = null;
				}

				windowArea.removeEventListener (isTouch ? 'touchmove' : 'mousemove',dragWindow);
				windowArea.removeEventListener (isTouch ? 'touchend' : 'mouseup',dragWindowEnds);
				titleBarElement.removeEventListener ('click', winHandler.selectWindow);
				
				e.preventDefault();
			};
			
			
			//The user ends moving the resize button when mouseup or touchends
			var dragWindowCornerEnds = function (e){
				var isTouch = (e.targetTouches && e.targetTouches.length === 1);
				
				if (sizeState){
					element.removeClass ('resizing');
					sizeState = null;
				}
				
				windowArea.removeEventListener (isTouch ? 'touchmove' : 'mousemove',dragWindowCorner);
				windowArea.removeEventListener (isTouch ? 'touchend' : 'mouseup',dragWindowCornerEnds);
				
				e.preventDefault();	
			};

			
			//it just makes a postion calculation from the current positon reference passed
			var calculatePos = function(ref) {
				var winX = parseInt(element.prop('offsetLeft'), 10);
				var winY = parseInt(element.prop('offsetTop'), 10); 	

				return {
					x: ref.x - winX,
					y: ref.y - winY
				};
			};

			//it just makes a size calculation from the current positon reference passed
			var calculateSize = function (ref){
				var winWidth = parseInt(element.prop('offsetWidth'), 10);
				var winHeight = parseInt(element.prop('offsetHeight'), 10);

				return {
					width: winWidth - ref.width,
					height: winHeight - ref.height
				};
			};

			//set the element in the specified position
			winHandler.move = function(x, y) {
				winHandler.setWindowProps({'x':x, 'y':y});
			};

			//set the new size of the element
			winHandler.resize = function (width,height) {
				winHandler.setWindowProps ({'width':width,'height':height});
			};
			
			
			/**
			* Set position and size properties
			*/
			winHandler.setWindowProps = function (props){
				var cssObject = {};
				
				if (props) {
					if (props.x) {cssObject.left = props.x +'px';}
					if (props.y) {cssObject.top = props.y +'px';}
					if (props.width) {cssObject.width = props.width + 'px';}
					if (props.height) {cssObject.height = props.height + 'px';}
					
					element.css (cssObject);	
				}	
			};

			//Move the current window to the highest position
			winHandler.selectWindow = function (){
				parentWindow.topZ = parentWindow.topZ +1;
				element.css ('z-index', parentWindow.topZ);
				if (scope.selectwindow) { scope.selectwindow(winHandler); }
			};
			
			winHandler.getMaximizeToElement = function() {
				if (options.maximizeTo!=='window'){
					var elementToMaximize = document.getElementById (options.maximizeTo) || document.getElementsByTagName (options.maximizeTo);
					return options.maximizeTo ? (elementToMaximize) : windowArea;
				}
				return window;
			};

			winHandler.getMinimizeToElement = function() {
				if (options.minimizeTo!=='body'){
					var elementToMinimize = document.getElementById (options.minimizeTo) || document.getElementsByTagName (options.minimizeTo);
					return options.minimizeTo ? (elementToMinimize) : windowArea;
				}
				return document.getElementsByTagName('body');
			};
			
			
			//This functions is executed when maximize is executed
			winHandler.maximize = function (){
				
				saveWindowState('maximized');
				
				//Select the element where to maximize
				var maximizeToElement = winHandler.getMaximizeToElement();

				var maximizeCoords = {
					x: parseInt(maximizeToElement.offsetLeft || 0, 10) ,
					y: parseInt(maximizeToElement.offsetTop ||0, 10),
					width:  parseInt(maximizeToElement.offsetWidth ||maximizeToElement.innerWidth, 10),
					height: parseInt(maximizeToElement.offsetHeight || maximizeToElement.innerHeight, 10)
				};
				
				element.addClass ('maximizing');
				element.addClass('maximized');
				//move, set the effect and resize 
				
				winHandler.setWindowProps ( {
						x: maximizeCoords.x + 10,
						y: maximizeCoords.y +10,
						width: maximizeCoords.width -20, 
						height: maximizeCoords.height - 20
				});
				
				//Set the apropiate listeners
				titleBarElement.removeEventListener ('dblclick', winHandler.maximize);
				titleBarElement.addEventListener ('dblclick', winHandler.restore);
				angular.element(maximizeButton).addClass('isHidden');
				angular.element(restoreButton).removeClass('isHidden');
				
				//Stop all the window listener (drag,resize...)
				stopWindowListeners();
			
				//Program the effect extraction
				setTimeout (function (){
					element.removeClass ('maximizing');

				},500);
				
				if (scope.maximize){
					scope.maximize(winHandler);	
				}
				
			};
			
			//This functions is executed when maximize is executed
			winHandler.minimize = function (){
				var minimizeToElement = winHandler.getMinimizeToElement();
				
				var childrenCount = (minimizeToElement.childElementCount + 1) % 10;
				
				
				var minimizedBtn = angular.element('<div class="minimizedWindowBtn" title="'+scope.restoretitle +'" ><span class="btn_'+childrenCount+'">' + scope.title.substr(0,1) + '</span></div>')[0];
				
				saveWindowState('minimized',minimizedBtn);
				angular.element (minimizeToElement).prepend(minimizedBtn);
				
				var minimizeCoords = {
					x: parseInt(minimizeToElement.offsetLeft, 10),
					y: parseInt(minimizeToElement.offsetTop - minimizeToElement.offsetHeight - 30 , 10) ,
					width:  32,
					height: 32
				};
				
				//Just do the effect of going there
				element.addClass ('minimizing');
				element.addClass ('buttonized');
				
				winHandler.setWindowProps ({
					x: minimizeCoords.x  ,
					y: minimizeCoords.y  ,
					width: minimizeCoords.width,
					height: minimizeCoords.height
				});
				
				setTimeout (function (){
					element.removeClass ('minimizing');
					element.addClass('minimized');
					angular.element(minimizedBtn).addClass('active');
				},500);
				
				minimizedBtn.addEventListener ('mousedown',winHandler.restore);
				minimizedBtn.addEventListener ('touchstart',winHandler.restore);
				minimizedBtn.addEventListener ('click', winHandler.restore);
			};

						
			
			winHandler.restore = function (){
				
				element.addClass ('restoring');
				element.removeClass ('minimized');
				angular.element(restoreButton).addClass('isHidden');
				angular.element(maximizeButton).removeClass('isHidden');
				//Set to the top of windows
				winHandler.selectWindow();
				
				//Restore the listeners	   
				if (currentWindowState.state === 'maximized'){
					titleBarElement.removeEventListener ('dblclick',winHandler.restore);
					titleBarElement.addEventListener ('dblclick', winHandler.maximize);

					//start all the window listener (drag,resize...)
					startWindowListeners();
				}else if (currentWindowState.state === 'minimized'){
					angular.element (currentWindowState.minimizedBtn).addClass('disable');
					setTimeout (function (){
						angular.element (currentWindowState.minimizedBtn).remove();
					
					},500);
				}
				
				currentWindowState.state = 'flow';
				
				
				setTimeout (function (){
					element.removeClass ('maximized');
	
					
					winHandler.setWindowProps ({
						x: currentWindowState.x,
						y: currentWindowState.y,
						width: currentWindowState.width,
						height: currentWindowState.height
					});
					
						//Execute restore method if it's provided
					
					//Removes the element some time ago
					setTimeout (function (){
						element.removeClass ('restoring');
						element.removeClass ('buttonized');
						if (scope.restore){
							scope.restore(winHandler);	
						}
					},200);

				},200);
			
				
				
			};
			
			/**
			* Save the window state in order to restore again
			*/
			
			var saveWindowState = function (state,button){
				//Store the position and the size state
				currentWindowState = {
					x: parseInt(element.prop('offsetLeft'), 10),
					y: parseInt(element.prop('offsetTop'), 10),
					width: parseInt(element.prop('offsetWidth'), 10),
					height: parseInt(element.prop('offsetHeight'), 10),
					z: element.css ('z-index'),
					state: state,
					minimizedBtn: button
				};
				
			};
			
			var startWindowListeners =  function (){
				titleBarElement.addEventListener ('mousedown', startMoving);
				titleBarElement.addEventListener ('touchstart', startMoving);
				
				resizeButtonElement.addEventListener ('mousedown',startResizing);
				resizeButtonElement.addEventListener ('touchstart',startResizing);
				contentButtonElement.addEventListener ('click', winHandler.selectWindow);
				
			};
			
			var stopWindowListeners = function (){
				titleBarElement.removeEventListener ('mousedown', startMoving);
				titleBarElement.removeEventListener ('touchstart', startMoving);
				
				resizeButtonElement.removeEventListener ('mousedown',startResizing);
				resizeButtonElement.removeEventListener ('touchstart',startResizing);
				contentButtonElement.removeEventListener ('click', winHandler.selectWindow);
			};
			
			//Set the window in creatio
			
			//Set and start all the window listener (drag,resize...)
			startWindowListeners ();
			
			//Set buttons listener
			closeButton.addEventListener ('click',winHandler.close);
			closeButton.addEventListener ('touchstart',winHandler.close);
			maximizeButton.addEventListener ('click',winHandler.maximize);
			maximizeButton.addEventListener ('touchstart',winHandler.maximize);
			restoreButton.addEventListener ('click',winHandler.restore);
			restoreButton.addEventListener ('touchstart',winHandler.restore);
			minimizeButton.addEventListener ('click',winHandler.minimize);
			minimizeButton.addEventListener ('touchstart',winHandler.minimize);
			
			if (scope.maximizable) {titleBarElement.addEventListener ('dblclick', winHandler.maximize);}
			
			var applyWindowOptions = function(wh,opt) {
				if (opt.position){
					var position = opt.position;
					wh.move (position.x,position.y);	
				}
				if (opt.size){
					var size = opt.size;
					wh.resize (size.width,size.height);
				}
			};
			
			// apply the options for the window
			applyWindowOptions(winHandler,options);
			
			//To avoid adding transition listeners we remove tha clas after some time
			setTimeout (function (){
				element.addClass ('active');
				element.addClass ('opening');
				winHandler.selectWindow();
			
				setTimeout (function (){
					element.removeClass ('opening');
					if (scope.open) {
						scope.open(winHandler);
					}
				},400);
			},50);
		}
	};
});
