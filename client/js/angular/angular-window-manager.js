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
								'<button class="wmMaximize" ng-show="isMaximizable()">' + 
								'<button style="display:none" class="wmRestore"/>'+
								'<button class="wmClose" ng-show="isCloseable()" />'+
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
			maximize: '=',
			restore: '=',
			options: '@',
			maximizable: '@',
			closeable: '@'
		},

		link: function (scope, element) {
			var parentWindow = element[0].parentElement;
			var windowArea = parentWindow;
			
			var titleBarElement = element[0].children[0].children[0];
			var contentButtonElement = element[0].children[0].children[1];
			var resizeButtonElement = element[0].children[0].children[2];
			
			var buttonBar = titleBarElement.children[1];
		
			var maximizeButton = buttonBar.children[0];
			var closeButton = buttonBar.children[2];
			
			//State variables
			var positionState = null;
			var sizeState = null;
			var maximizeState = null;

			//Parse the options
			var options = scope.options ? JSON.parse(scope.options) :{};
	
			//If it's defined a windowContainer zone we will use it to bind 
			//all the listeners, that way we can fit windows under an element but move in other 
			if (options.windowContainer){
				windowArea = document.getElementById(options.windowContainer);
			}
		
			//Set the destroy method. 
			scope.$on('$destroy',function handleDestroyEvent() {
						setTimeout (function (){
						element.addClass ('closing');
				
							setTimeout (function (){
							element.removeClass ('closing');
							element.remove();
						},300);
					},50);
            
					if (scope.close){
						scope.close(element);
					}
				}
			);

			scope.isMaximizable = function (){
				return (scope.maximizable === undefined || scope.maximizable === true || scope.maximizable === 'true') ? true : false ;
			}
			
			scope.isCloseable = function (){
				return (scope.closeable === undefined || scope.closeable === true || scope.closeable === 'true') ? true : false ;
			}
			
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

				selectWindow();
				
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
				selectWindow();
				
				e.preventDefault();

			};

			//Execute when user moves the mouse after title is clicked
			var dragWindow = function(e) {  
				var moveRef = (e.targetTouches && e.targetTouches.length === 1) ?  e.targetTouches[0] : e;
				
				if (positionState){
					move(
						moveRef.pageX - positionState.x,
						moveRef.pageY - positionState.y
					);
				}
			};

			//Execute when user moves the pointer after resize button is clicked
			var dragWindowCorner = function (e){
				var moveRef = (e.targetTouches && e.targetTouches.length === 1) ?  e.targetTouches[0] : e;

				if (sizeState){
					resize (
						moveRef.pageX + sizeState.width,
						moveRef.pageY + sizeState.height
					);	
				}
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
				titleBarElement.removeEventListener ('click', selectWindow);
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
			var move = function(x, y) {
				element.css('left',x +'px');
				element.css('top',y + 'px');

			};

			//set the new size of the element
			var resize = function (width,height) {
				element.css ('width', width + 'px');
				element.css ('height', height + 'px');
			};

			//Move the current window to the highest position
			var selectWindow = function (){
				parentWindow.appendChild (element[0]);
			};
			
			//This function is executed when close button is pushed
			var close = function (){
				scope.$destroy();
			};
			
			//This functions is executed when maximize is executed
			var maximize = function (){
				
				//Store the position and the size state
				maximizeState = {
					x: parseInt(element.prop('offsetLeft'), 10),
					y: parseInt(element.prop('offsetTop'), 10),
					width: parseInt(element.prop('offsetWidth'), 10),
					height: parseInt(element.prop('offsetHeight'), 10)
				};
			
				//Select the element where to maximize
				var maximizeToElement = options.maximizeTo ? angular.element (options.maximizeTo) : windowArea;
				
				var maximizeCoords = {
					x: 0,
					y: 0,
					width: parseInt(maximizeToElement.offsetWidth, 10),
					height: parseInt(maximizeToElement.offsetHeight, 10)
				};
				
				//Set it to 
				selectWindow();
			
				//move, set the effect and resize 
				move (maximizeCoords.x + 10,maximizeCoords.y +10 );
				element.addClass ('maximizing');
				resize (maximizeCoords.width -20, maximizeCoords.height - 20);
				
				//Set the apropiate listeners
				maximizeButton.removeEventListener ('click',maximize);
				maximizeButton.addEventListener ('click',restore);
				titleBarElement.removeEventListener ('dblclick', maximize);
				titleBarElement.addEventListener ('dblclick', restore);
				
				//Stop all the window listener (drag,resize...)
				stopWindowListeners();
			
				//Program the effect extraction
				setTimeout (function (){
					element.removeClass ('maximizing');
				},500);
				
				if (scope.maximize){
					scope.maximize();	
				}
				
			};
			
			var restore = function (){
				//move and resize to previus state
				element.addClass ('restoring');
				
				//move and resize to prior state
				move (maximizeState.x,maximizeState.y);
				resize(maximizeState.width,maximizeState.height);
					  
				//Restore the listeners	   
				maximizeButton.removeEventListener ('click',restore);
				maximizeButton.addEventListener ('click',maximize);
				
				titleBarElement.removeEventListener ('dblclick', restore);
				titleBarElement.addEventListener ('dblclick', maximize);
				
				//start all the window listener (drag,resize...)
				startWindowListeners();
				
				//Execute restore method if it's provided
				if (scope.restore){
					scope.restore();	
				}
				
				//Removes the element some time ago
				setTimeout (function (){
					element.removeClass ('restoring');
				},500);
				
			};
			
			
			var startWindowListeners =  function (){
				titleBarElement.addEventListener ('mousedown', startMoving);
				titleBarElement.addEventListener ('touchstart', startMoving);
				
				resizeButtonElement.addEventListener ('mousedown',startResizing);
				resizeButtonElement.addEventListener ('touchstart',startResizing);
				contentButtonElement.addEventListener ('click', selectWindow);
				
			};
			
			var stopWindowListeners = function (){
				titleBarElement.removeEventListener ('mousedown', startMoving);
				titleBarElement.removeEventListener ('touchstart', startMoving);
				
				resizeButtonElement.removeEventListener ('mousedown',startResizing);
				resizeButtonElement.removeEventListener ('touchstart',startResizing);
				contentButtonElement.removeEventListener ('click', selectWindow);
			};
			
			//Set the window in creatio
			
			//Set and start all the window listener (drag,resize...)
			startWindowListeners ();
			
			//Set buttons listener
			closeButton.addEventListener ('click',close);
			maximizeButton.addEventListener ('click',maximize);
			if (scope.maximizable) {titleBarElement.addEventListener ('dblclick', maximize);}
			
			// apply the options for the window
			if (options.position){
				var position = options.position;
				move (position.x,position.y);	
			}
			if (options.size){
				var size = options.size;
				resize (size.width,size.height);
			}
			
			//To avoid adding transition listeners we remove tha clas after some time
			setTimeout (function (){
				element.addClass ('active');
				element.addClass ('opening');
				selectWindow();
			
				setTimeout (function (){
					element.removeClass ('opening');
					if (scope.open) scope.open(element);
				},400);
			},50);
		}
	};
});
