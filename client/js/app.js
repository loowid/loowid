window.app = angular.module('mean', ['ngCookies', 'ngResource', 'ngRoute', 'mean.system', 'mean.rooms', 'ngSanitize','ngAnimate','ngI18n','ngTagsInput','ngWindowManager']);

angular.module('mean.system', []);
angular.module('mean.rooms', ['luegg.directives']);


