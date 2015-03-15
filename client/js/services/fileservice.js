	'use strict';
/*global rtc: true */
angular.module('mean.rooms').config(['$compileProvider', function($compileProvider){   
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|blob):/);
}]).factory('FileService',['$sce','UIHandler',function($sce,UIHandler){
	return function (){

	    //Control files
	   	var uiHandler = UIHandler;
	    var self = this; 
	    this.sentFileOffers = {};
	    this.acceptedFileOffers = {};
	    this.arrayToStoreChunks = {};
	    this.hasToRefresh = true;

	    this.uploadFiles = function ($scope,inputId){
	          var fileContainer = document.getElementById(inputId);
	          //build the file offer
	          var files;
	          var connectionId;

	          if (uiHandler.isowner){
	          	var userindex = parseInt(inputId.split('userfiles_')[1]);
	          	if(!uiHandler.users[userindex].files){
	          		uiHandler.users[userindex].files = [];
	          	}
				files = uiHandler.users[userindex].files;
	          	connectionId = uiHandler.users[userindex].connectionId;
	          }else{
	          	files = uiHandler.ownerFiles;
	          	connectionId = uiHandler.ownerConnectionId;
	          }

	          if (fileContainer){
	                var fileOfferId = self.makeId();
	                var fileOffer = self.sentFileOffers[fileOfferId] = {}; //Create a new File offer
	                
	                fileOffer.destinationId = connectionId;
	                fileOffer.files = {};
	                fileOffer.attended =false;
	             
	                for (var i = 0 ; i < fileContainer.files.length ; i+=1){
	                     var fileId = self.makeId();
	                     fileOffer.files[fileId] = {'id':fileId, 'file': fileContainer.files[i]};
	                     files.push ({'id': fileId, 'name': fileContainer.files[i].name, 'completed': 0,'direction':'upload','requestId':fileOfferId});
	                }

	            rtc.askForAcceptFiles ($scope.global.roomId,fileOfferId,fileOffer);
	            //reset the file input stream
	            document.getElementById(inputId).value='';
	          }
	    };

		this.sendFile = function ($scope,userindex,ofile,requestId,token){
	        var connectionId = {};

	        if (typeof(userindex) === 'string'){
	            connectionId = userindex;
	         }else{
	            connectionId = uiHandler.users[userindex].connectionId;
	         }    

			if (typeof(userindex) === 'string'){
	            if (userindex === 'owner'){
	                connectionId = uiHandler.ownerConnectionId;
	            }else{
	                connectionId = userindex;
	            }
	         }else{   
	            connectionId = uiHandler.users[userindex].connectionId;
	         }  
            
            var reader = new window.FileReader();
            reader.readAsDataURL(ofile.file);
            
            reader.onload = function (event){
				var fileInfo = {
					'id': ofile.id,
					'text': undefined, 
					'chunks': undefined,
					'connectionId': connectionId,
					'requestId': requestId,
					'token': token	
				};
				
                self.onReadAsDataURL ($scope,event,fileInfo);
            };
	    };

	    this.getRemainingChunks = function(text,chunkLength) {
	        if (text.length > chunkLength) {
	            return (Math.floor(text.length / chunkLength)) + (text.length % chunkLength > 0 ? 1 : 0);
	        } else {
	            return 1;
	        }
	    };

	    this.getDataMessage = function(text,chunkLength) {
	        if (text.length > chunkLength) {
	            return text.slice(0, chunkLength); // getting chunk using predefined chunk length
	        } else {
	            return text;
	        }
	    };

		this.onReadAsDataURL = function ($scope,event,fileInfo) {

			var chunkLength = 10000;
	        var data = {}; // data object to transmit over data channel
	    	
			var orinalChunks = fileInfo.chunks;
		    var remainigChunks = 0;

	        if (event) { fileInfo.text = event.target.result; }// on first invocation
	        
	        if (self.sentFileOffers[fileInfo.requestId].files[fileInfo.id].canceled){
	            return;
	        }

	        remainigChunks = this.getRemainingChunks(fileInfo.text,chunkLength);
	        data.message = this.getDataMessage(fileInfo.text,chunkLength);
	        
	        if (!orinalChunks) { orinalChunks = remainigChunks; }
	        data.fileid = fileInfo.id;
	        data.remainigChunks = remainigChunks-1;
	        data.chunks = orinalChunks;

	        rtc.sendMessage(fileInfo.connectionId,'filedata',data,fileInfo.requestId,fileInfo.token);
	        
	        $scope.getFile((uiHandler.isowner ? $scope.getUser(fileInfo.connectionId).files : uiHandler.ownerFiles ),fileInfo.id).completed = Math.floor((1 - (data.remainigChunks / data.chunks)) * 100);

            if (self.hasToRefresh){
	            	//Just refresh each second not in each packet
	            	self.hasToRefresh= false;

	            	setTimeout (function () {
	            		uiHandler.safeApply($scope,function (){});
	            		self.hasToRefresh = true;
	            	},2000);
            }
            
	        var remainingDataURL = fileInfo.text.slice(data.message.length);
	        
	        // we try to do it semiasync
	        if (remainingDataURL.length) {
	        	setTimeout(function () {
					var remainFileInfo = {
						'id' : fileInfo.id,	
						'text' : remainingDataURL,
						'chunks': orinalChunks,
						'connectionId': fileInfo.connectionId,
						'requestId': fileInfo.requestId,
						'token': fileInfo.token
					};
					
	        		self.onReadAsDataURL($scope,null,remainFileInfo); // continue transmitting
	        	}, 50);
	        }
    	};

    	this.bytesToSize = function (bytes) {
             var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
             if (bytes === 0) { return '0 Bytes'; }
             var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
             return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    	};

		this.cancelFile = function ($scope,connectionId,file){
    		if (file.direction === 'upload'){
         		rtc.cancelFile ($scope.global.roomId,connectionId,file.requestId,file.id,self.sentFileOffers[file.requestId].token,'upload');
            	self.sentFileOffers[file.requestId].files[file.id].canceled = true;
            	file.canceled = true;
       		}else{
            	rtc.cancelFile ($scope.global.roomId,connectionId,file.requestId,file.id,self.acceptedFileOffers[file.requestId].token,'download');
            	//Now simulate that you received a cancel signal from emisor
            	var data = {'requestId':file.requestId,'id':connectionId,'fileid':file.id,'token':self.acceptedFileOffers[file.requestId].token,'direction':'upload'};
            	rtc.fire('file canceled',data);
        	}
    	};

    	this.makeId = function(){
    	    var text = '';
    	    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    	    for( var i=0; i < 7; i+=1 ) {
    	        text += possible.charAt(Math.floor(Math.random() * possible.length));
    	    }
    	    return text;
    	};

    	this.dataUrlToBlob = function(dataURL) {
            var binary = atob(dataURL.substr(dataURL.indexOf(',') + 1));
            var array = [];
            for (var i = 0; i < binary.length; i+=1) {
                array.push(binary.charCodeAt(i));
            }

            var type;

            try {
                type = dataURL.substr(dataURL.indexOf(':') + 1).split(';')[0];
            } catch(e) {
                type = 'text/plain';
            }

            return new Blob([new Uint8Array(array)], { type: type });
        };

    	this.init = function($scope){
    		uiHandler.ownerFiles = [];

    	    $scope.openFileDialog = function(index){
       
				var initiateUploadRequest = function (){
					self.uploadFiles($scope,this.id);
					document.getElementById('userfiles_'+index).removeEventListener('change',initiateUploadRequest);
				};	
		    
				document.getElementById('userfiles_'+index).addEventListener('change',initiateUploadRequest);
	    	    document.getElementById('userfiles_'+index).click();
		    };

		    $scope.cancelFile = function (connectionId,file){
		         self.cancelFile ($scope,connectionId,file);
		    };

		    $scope.getFile = function (files,fileid){
		        if (files) {
		            for (var i = 0; i < files.length; i+=1){
		                if (files[i].id === fileid){
		                    return files[i];
		                }
		            }
		        }
		        return null;
		    };

		    //File rtc events
			rtc.uniqueon ('receive file offer',function (data){
	            
	            if (data.token && data.requestId && self.acceptedFileOffers[data.requestId]){
	                if (self.acceptedFileOffers[data.requestId].token === data.token && self.acceptedFileOffers[data.requestId].connectionId === data.socketId){
	                    rtc.receiveOffer(data.socketId, data.sdp, data.mediatype,data.requestId);
	                }
	            }
	            
	        });

			var cancelUpload = function(data,files) {
                if (data.token && data.requestId && self.acceptedFileOffers[data.requestId]){
                    if (self.acceptedFileOffers[data.requestId].token === data.token && self.acceptedFileOffers[data.requestId].connectionId === data.id){
                           //If the file exist and is not completed
                        if (self.acceptedFileOffers[data.requestId].files[data.fileid] ){
                            var fileToCancel = self.acceptedFileOffers[data.requestId].files[data.fileid];
                            if(!fileToCancel.completed){
                                //We don't delete the file, we just mark as canceled and completed
                                fileToCancel.canceled = true;
                                fileToCancel.completed = true;
                                self.acceptedFileOffers[data.requestId].filesCompleted+=1;

                                //if all files are completed send the signal
                                if (self.acceptedFileOffers[data.requestId].filesCompleted === Object.keys(self.acceptedFileOffers[data.requestId].files).length){
                                    // All files were completed, we should drop the conection
                                    rtc.dataChannels[data.id]['filedata_' +data.requestId].channel.close();
                                     //Drop the accepted files token. User can't use it anymore
                                    delete self.acceptedFileOffers [data.requestId];
                                    rtc.dropPeerConnection (data.id,'filedata_' +data.requestId,false); 
                                    rtc.allRequestCompleted ($scope.global.roomId,data.id,data.requestId);
                                } 

                                var renderedIndex = self.arrayToStoreChunks[data.id]['filedata_' +data.requestId][data.fileid].renderedFile;
                                files[renderedIndex].completed = 101;
                                files[renderedIndex].canceled = true;  
                            }
                        }
                    }
                }    
			};
			
			var cancelDownload = function(data,files) {
                self.sentFileOffers[data.requestId].files[data.fileid].canceled = true;
                var fileToCancel2 = $scope.getFile(files,data.fileid);
                fileToCancel2.completed = 101;
                fileToCancel2.canceled = true;
			};
			
			var getFilesFromUser = function (connectionId){
				if (!uiHandler.isowner){
	               return uiHandler.ownerFiles;
	            }else{
					var user = $scope.getUser(connectionId);
					if (!user.files){
		               user.files =[];
		 			}
		 			return user.files; 
	            }	
			};
			
	        rtc.uniqueon ('file canceled',function (data){
	            // Check the 

	        	var files = getFilesFromUser(data.id);

	            if (data.direction === 'upload'){
	            	cancelUpload(data,files);
	            } else if (data.direction === 'download'){
	            	cancelDownload(data,files);
	            }

	            uiHandler.safeApply($scope,function(){});  
	        });
			
			var closeIfCompleted = function (channel,connectionId,requestId,mediatype){
				if (self.acceptedFileOffers[requestId].filesCompleted === Object.keys(self.acceptedFileOffers[requestId].files).length){
					// All files were completed, we should drop the conection
					channel.close();
					//Drop the accepted files token. User can't use it anymore
					delete self.acceptedFileOffers [requestId];
					rtc.dropPeerConnection (connectionId,mediatype,false); 
					rtc.allRequestCompleted ($scope.global.roomId,connectionId,requestId);
				} 
			};
			
			var proccesChunkStates = function(files,data,connectionId,requestId,mediatype,renderedIndex,channel) {
	            	if (data.remainigChunks === 0) {
	                //Re-join: Take care using join method couls explode on a memory leak
	                
	                var dataUrl = '';

	                 //Now we can release the connection sending transfer completed
	                //Check if all files are completed
	                files[renderedIndex].completed = 100;
	                uiHandler.safeApply($scope,function(){});

	                rtc.fileDownloaded( $scope.global.roomId,connectionId,requestId,data.fileid);

	                while (self.arrayToStoreChunks[connectionId][mediatype][data.fileid].length>0){
	                    dataUrl = dataUrl + self.arrayToStoreChunks[connectionId][mediatype][data.fileid].shift();
	                }

	                self.acceptedFileOffers[requestId].files[data.fileid].completed = true;
	                self.acceptedFileOffers[requestId].filesCompleted+=1;

					closeIfCompleted (channel,connectionId,requestId,mediatype);
	                
	                uiHandler.safeApply($scope,function (){
	                	files[renderedIndex].completed = 101; //data is composed
	                });
	                
	                var blob = self.dataUrlToBlob(dataUrl);
	                
	                uiHandler.safeApply($scope,function (){
	                	files[renderedIndex].completed = 102; //data is composed
	                });

	                var virtualURL = (window.URL || window.webkitURL).createObjectURL(blob);

					files[renderedIndex].virtualURL =  $sce.trustAsResourceUrl(virtualURL);
	                self.arrayToStoreChunks[connectionId][mediatype][data.fileid] = []; // resetting array
	                
					//Mark that a percentage of refresh is needed
					self.hasToRefresh=true;
	            }else{
	                files[renderedIndex].completed = Math.floor((1 - (data.remainigChunks / data.chunks)) * 100);
	            }
	
			};

			var processMessageData = function (files,data,connectionId,requestId,mediatype) {
				if (!self.arrayToStoreChunks[connectionId][mediatype][data.fileid]){
	                self.arrayToStoreChunks[connectionId][mediatype][data.fileid] = [];                
	                self.arrayToStoreChunks[connectionId][mediatype][data.fileid].renderedFile = files.length;
	                //add the new file in the array
	                var filename = self.acceptedFileOffers[requestId].files[data.fileid].name;
	                files.push ({'id':data.fileid,'name': filename, 'completed': 0,'direction':'download','requestId':requestId});                
	            }

	            
	            self.arrayToStoreChunks[connectionId][mediatype][data.fileid].push(data.message); // pushing chunks in array
	            var renderedIndex = self.arrayToStoreChunks[connectionId][mediatype][data.fileid].renderedFile;
	            
	            if (self.acceptedFileOffers[requestId].files[data.fileid].processedChunks === 0){
	                self.acceptedFileOffers[requestId].files[data.fileid].totalChunks = data.chunks;
	            }
	            
	            self.acceptedFileOffers[requestId].files[data.fileid].processedChunks+=1;
				
				return renderedIndex;
			};

			rtc.uniqueon ('data stream data', function (channel,connectionId,requestId,mediatype,message){

				var data = JSON.parse(message);
	    
	            //files array for rendering
	            var files = getFilesFromUser(connectionId);

	            self.arrayToStoreChunks[connectionId] = self.arrayToStoreChunks[connectionId] || {};
	            self.arrayToStoreChunks[connectionId][mediatype] = self.arrayToStoreChunks[connectionId][mediatype] || {};                

	            //Controls to avoid undesired downloads 
	            if (!self.acceptedFileOffers[requestId].files[data.fileid]){
	                //This file was not permitted

	                //We close the dataChannel and peer connection
	                rtc.fileRequestFailed ($scope.global.roomId,connectionId,requestId,'sent file is not allowed');
	                channel.close();
	                rtc.dropPeerConnection (connectionId,mediatype,false); 
	                //Drop the accepted files token. User can't use it anymore
	                delete self.acceptedFileOffers [requestId];
	                return;
	            }

				var renderedIndex = processMessageData (files,data,connectionId,requestId,mediatype);

	            //Control flow chunk
	            if((data.chunks !== self.acceptedFileOffers[requestId].files[data.fileid].totalChunks) ||
	              ((data.chunks - data.remainigChunks) !== self.acceptedFileOffers[requestId].files[data.fileid].processedChunks)){
	                rtc.fileRequestFailed ($scope.global.roomId,connectionId,requestId,'data sequence not valid');
	                channel.close();
	                 rtc.dropPeerConnection (connectionId,mediatype,false); 
	                //Drop the accepted files token. User can't use it anymore
	                delete self.acceptedFileOffers [requestId];
	                return;
	            }

				proccesChunkStates(files,data,connectionId,requestId,mediatype,renderedIndex,channel);
				checkRefresh();

	        });

			var checkRefresh = function (){
	            if (self.hasToRefresh){
	            	//Just refresh each second not in each packet
	            	self.hasToRefresh= false;

	            	setTimeout (function () {
	            		uiHandler.safeApply($scope,function (){});
	            		self.hasToRefresh = true;
	            	},2000);
	            }
			};
		
	        rtc.uniqueon ('request_for_accept_files', function(data){
	            if (data.files && data.requestId){
	                var confirmationStr = '<strong>' + $scope.getUserName(data.id) + '</strong> ' + $scope.resourceBundle.wantstosharefiles  +'<br/><ul class="filelist">';

	                for (var fileId in data.files){
						if (data.files.hasOwnProperty(fileId)) {
							var curFile = data.files[fileId];
							//Set the first chunk
							curFile.processedChunks = 0;
							confirmationStr = confirmationStr + '<li>' + curFile.name + ' <span class="size">(' + self.bytesToSize(curFile.size) + ')</span> </li>';
						}
	                }

	                confirmationStr = confirmationStr + '</ul>';

	                if (!self.acceptedFileOffers[data.requestId]){
	                	uiHandler.safeApply ($scope,function (){
		    				if (!uiHandler.modals) { uiHandler.modals = []; }

			    			uiHandler.modals.push({'text': confirmationStr,
			    				'yes': function (index){
			    					uiHandler.modals.splice(index,1);
					                   //Create a token and accept the answer 
				                    var fileOffer = self.acceptedFileOffers[data.requestId] = {};
				                    fileOffer.token = self.makeId();
				                    fileOffer.connectionId = data.id;
				                    fileOffer.files = data.files; 
				                    fileOffer.filesCompleted = 0;
				                    rtc.acceptFilesRequest($scope.global.roomId,data.id,data.requestId,fileOffer.token);
			    				},
			    				'no': function (index){
									uiHandler.modals.splice(index,1);
			 		                rtc.fileRequestFailed($scope.global.roomId,data.id,data.requestId,'files are not accepted');
								},
			    				'class':'modalform editable',
			    				'done':false,
								'avatar': $scope.getUser(data.id).avatar
			    			});	
			    		});
	                }
	            }

	        });

	        rtc.uniqueon ('files accepted',function(data){
	            var fileOffer = self.sentFileOffers[data.requestId];
				
	            if (fileOffer && fileOffer.attended===false && fileOffer.destinationId === data.id){
	                fileOffer.attended = true; // We try to avoid masive sent of files for duplicated answers
	                fileOffer.token = data.token;
	                for (var fileId in fileOffer.files){
						if (fileOffer.files.hasOwnProperty(fileId)) {
							self.sendFile ($scope,fileOffer.destinationId,fileOffer.files[fileId],data.requestId,data.token);
						}
	                }
	            }
	         });

	        rtc.uniqueon ('file downloaded',function (data){
	                //rtc.dropPeerConnection (connectionId,mediatype,false);
	        });

	        rtc.uniqueon ('files request completed',function (data){
	                delete rtc.dataChannels[data.id]['filedata_'+ data.requestId];
	                rtc.dropPeerConnection (data.id,'filedata_' + data.requestId,true);
	        });

	        rtc.uniqueon ('files request error',function (data){
	                var errMessage = $scope.getUserName(data.id) + ' ' + $scope.resourceBundle.canceledFile;
	                $scope.global.showError($scope,errMessage);
				
					var fileOffer = self.sentFileOffers[data.requestId];
					var files = getFilesFromUser(data.id);

	                for (var fileId in fileOffer.files){
						if (fileOffer.files.hasOwnProperty(fileId)) {
							for (var userFileId in files){
								if (files[userFileId].id === fileId){
									files[userFileId].canceled = true;
									files[userFileId].completed = 101;
								}
							}
						}
					}

				
	        });
    	};

	};
}]);
