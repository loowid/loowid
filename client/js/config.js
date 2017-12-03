'use strict';
//Setting up route
window.app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
        when ('/r/:roomId/join',{reloadOnSearch: false,
    		templateUrl: 'views/rooms/join.html'
    	}).when ('/r/:roomId/owner',{
            templateUrl: 'views/rooms/owner.html'
    	}).when ('/r/:roomId/claim',{
            templateUrl: 'views/rooms/claim.html'
    	}).when ('/stats',{
            templateUrl: 'views/rooms/stats.html'
    	}).when ('/r/:roomId/webrtcstatus',{
            templateUrl: 'views/rooms/webrtcstats.html'
    	}).when ('/lti/error',{
            templateUrl: 'views/rooms/lti.html'
        }).when ('/r/:roomId',{reloadOnSearch: false,
    		templateUrl: 'views/rooms/view.html'
    	}).when ('/about-desktop-sharing',{
            templateUrl: 'views/rooms/about-desktop-sharing.html'
        }).when ('/tos_en',{
            templateUrl: 'views/rooms/tos_en.html'
        }).when ('/tos_es',{
            templateUrl: 'views/rooms/tos_es.html'
        }).when ('/tos_ca',{
            templateUrl: 'views/rooms/tos_ca.html'
        }).when ('/desktop_cap',{
            templateUrl: 'views/desktop_cap.html'
		}).when('/', {
                templateUrl: 'views/rooms/create.html'
        }).otherwise({
                redirectTo: '/'
        });
    }
]);

//Setting HTML5 Location Mode
window.app.config(['$locationProvider',
    function($locationProvider) {
        $locationProvider.hashPrefix('!');
    }
]);

window.app.config(['$compileProvider', function ($compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|blob|filesystem):/);
}]);

window.app.value('ngI18nConfig', {
    //defaultLocale should be in lowercase and is required!!
    defaultLocale:'en',
    //supportedLocales is required - all locales should be in lowercase!!
    supportedLocales:['en', 'es', 'ca', 'de', 'ru', 'hu', 'nl'],
    //without leading and trailing slashes, default is i18n
    basePath:'i18n/bundle',
    //default is false
    cache:true
});
