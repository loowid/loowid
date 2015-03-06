'use strict';

window.app = angular.module('mean', ['ngCookies', 'ngResource', 'ngRoute', 'mean.system', 'mean.rooms', 'mean.stats', 'ngSanitize','ngAnimate','ngI18n','ngTagsInput','ngWindowManager','notification']);

angular.module('mean.system', []);
angular.module('mean.rooms', ['luegg.directives']);
angular.module('mean.stats', ['chart.js','sigmajs-ng','underscore']);


