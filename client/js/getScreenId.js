'use strict';
// Last time updated at Sep 07, 2014, 08:32:23

// Latest file can be found here: https://cdn.webrtc-experiment.com/getScreenId.js

// Muaz Khan         - www.MuazKhan.com
// MIT License       - www.WebRTC-Experiment.com/licence
// Documentation     - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/getScreenId.js

// ______________
// getScreenId.js

(function() {
    window.getScreenId = function(extensionid,callback) {

		this.extensionId = extensionid;

		if (!!navigator.mozGetUserMedia) {
            callback(null, 'firefox', {
                video: {
                    mozMediaSource: 'window',
                    mediaSource: 'window'
                }
            });
            return;
        }

        postMessage();

        function onIFrameCallback(event) {
            if (!event.data) { return; }

            if (event.data.chromeMediaSourceId) {
                if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                    callback('permission-denied');
                } else {
                    callback(null, event.data.chromeMediaSourceId, getScreenConstraints(null, event.data.chromeMediaSourceId));
                }
            }

            if (event.data.chromeExtensionStatus) {
                callback(event.data.chromeExtensionStatus, null, getScreenConstraints(event.data.chromeExtensionStatus));
            }

            if (event.data.chromeExtensionStatus || event.data.chromeMediaSourceId) {
              // this event listener is no more needed
              window.removeEventListener('message', onIFrameCallback);
            }
        }

        window.addEventListener('message', onIFrameCallback);

    };

    var getScreenConstraints = function(error, sourceId) {
        var screenConstraints = {
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: error ? 'screen' : 'desktop',
                    maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                    maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
                },
                optional: []
            }
        };

        if (sourceId) {
            screenConstraints.video.mandatory.chromeMediaSourceId = sourceId;
        }

        return screenConstraints;
    };

    var postMessage = function() {
        if (!iframe.isLoaded) {
            setTimeout(postMessage, 100);
            return;
        }

        iframe.contentWindow.postMessage({/*jshint validthis:true */
            captureSourceId: this.extensionId
        }, '*');
    };

    var iframe = document.createElement('iframe');
    iframe.onload = function() {
        iframe.isLoaded = true;
    };

	iframe.src = '/desktop_cap.html';
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
})();
