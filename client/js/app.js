window.app = angular.module('mean', ['ngCookies', 'ngResource', 'ui.bootstrap', 'ngRoute', 'mean.system', 'mean.rooms', 'ngSanitize','ngAnimate','ngI18n','ngTagsInput','ngWindowManager']);

angular.module('mean.system', []);
angular.module('mean.rooms', ['luegg.directives']);


