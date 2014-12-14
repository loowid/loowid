'use strict';
module.exports = function(grunt) {
    // Project Configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            jade: {
                files: ['app/views/**'],
                options: {
                    livereload: true,
                },
            },
            js: {
                files: ['client/js/**/*js', 'public/js/**', 'app/**/*.js'],
                //tasks: ['jshint'],
                options: {
                    livereload: true,
                },
            },
            html: {
                files: ['public/views/**'],
                options: {
                    livereload: true,
                },
            },
            css: {
                files: ['public/css/**'],
                options: {
                    livereload: true
                }
            }
        },
        jshint: {
            all: { 
            	files: { 
            		src: ['*.js',
            		      'app/**/*.js',
            		      'client/js/**/*.js',
            		      '!client/js/**/*min.js',
            		      '!client/js/ventus.js',
            		      '!client/js/modernizr.js',
            		      '!client/js/jquery.js'
            		      ] 
            	},
            	options: { 
            		jshintrc: '.jshintrc' 
            	}
            }
        },
        shell: {
        	mongo: {
        		command: 'mongod --dbpath ./data',
        		options: {
        			async: true
        		}
        	}
        },
        nodemon: {
            dev: {
            	script: 'server.js',
                options: {
                    args: [],
                    ignoredFiles: ['README.md', 'node_modules/**', '.DS_Store'],
                    watchedExtensions: ['js'],
                    watchedFolders: ['app', 'client', 'public'],
                    debug: true,
                    delayTime: 1,
                    cwd: __dirname
                }
            },
            prod: {
            	script: 'server.js',
                options: {
                    args: ['prod'],
                    ignoredFiles: ['README.md', 'node_modules/**', '.DS_Store'],
                    watchedExtensions: ['js'],
                    watchedFolders: ['app', 'client', 'public'],
                    debug: true,
                    delayTime: 1,
                    cwd: __dirname
                }
            },
        	dev1: {
	        	script: 'server.js',
	            options: {
	                args: [8001],
	                ignoredFiles: ['README.md', 'node_modules/**', '.DS_Store'],
	                watchedExtensions: ['js'],
	                watchedFolders: ['app', 'client', 'public'],
	                debug: true,
	                delayTime: 1,
	                cwd: __dirname
	            }
	        },
        	dev2: {
	        	script: 'server.js',
	            options: {
	                args: [8002],
	                ignoredFiles: ['README.md', 'node_modules/**', '.DS_Store'],
	                watchedExtensions: ['js'],
	                watchedFolders: ['app', 'client', 'public'],
	                debug: true,
	                delayTime: 1,
	                cwd: __dirname
	            }
	        },
        	proxy: {
	        	script: 'proxy.js',
	            options: {
	                args: [],
	                ignoredFiles: ['README.md', 'node_modules/**', '.DS_Store'],
	                watchedExtensions: ['js'],
	                watchedFolders: ['app', 'client', 'public'],
	                debug: true,
	                delayTime: 1,
	                cwd: __dirname
	            }
	        }
        },
        concurrent: {
        	default: {
	            tasks: ['shell','nodemon:dev', 'watch'], 
	            options: {
	                logConcurrentOutput: true
	            }
        	},
        	prod: {
	            tasks: ['shell','nodemon:prod', 'watch'], 
	            options: {
	                logConcurrentOutput: true
	            }
        	},
        	cluster: {
	            tasks: ['shell','nodemon:dev1','nodemon:dev2', 'nodemon:proxy', 'watch'], 
	            options: {
	                logConcurrentOutput: true
	            }
        	}
        },
        concat: {
        	dist: {
        		src:['client/js/angular/angular.min.js',
        		     'client/js/angular/angular-*.js',
        		     'client/js/angular/ui-*.js',
        		     'client/js/angular/ng-tags-input.min.js',
        		     'client/js/*.js',
        		     'client/js/services/*.js',
        		     'client/js/controllers/*.js'],
        		dest: 'public/js/loowid.js'
        	}
        },
        uglify: {
        	options: {
        	   mangle: false
        	},
        	build: {
        		files: {
        			'public/js/loowid.min.js':['public/js/loowid.js']
        		}
        	}
        },
        less: {
        	prod: {
        		options: {
        			paths:['client/less'],
        			cleancss:true
        		},
            	files: {
            		'public/css/loowid.min.css':'client/less/loowid.less'
            	}
        	}
        }
    });

    //Load NPM tasks 
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');

    //Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    //Default task(s).
    grunt.registerTask('default', ['mini','concurrent:default']);

    //Cluster local configuration 2 nodes 8001,8002
    grunt.registerTask('cluster', ['mini','concurrent:cluster']);

    // Same as development but using min.js (to test if its working)
    grunt.registerTask('prod', ['mini','concurrent:prod']);

    // Minify tasks (generate min files)
    grunt.registerTask('mini', ['concat','uglify','less']);

};
