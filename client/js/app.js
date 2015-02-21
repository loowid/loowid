'use strict';

window.app = angular.module('mean', ['ngCookies', 'ngResource', 'ngRoute', 'mean.system', 'mean.rooms', 'mean.stats', 'ngSanitize','ngAnimate','ngI18n','ngTagsInput','ngWindowManager','notification']);

angular.module('mean.system', []);
angular.module('mean.rooms', ['luegg.directives','chart.js']);
angular.module('mean.stats', ['chart.js']);


