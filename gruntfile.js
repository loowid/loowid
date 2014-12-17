'use strict';
module.exports = function(grunt) {
	
	/*
	 * grunt 								: Run default development server
	 * grunt cluster 						: Run default development cluster server with 2 nodes
	 * grunt cluster --nodes=N 				: Run default development cluster server with N nodes
	 * grunt minijs							: Minify client js files
	 * grunt less							: Compile less sources to css
	 * grunt mini							: Minify js files and compile less
	 * grunt jshint							: Analyze js files to check style and best practices
	 * grunt prod							: Run server in production mode
	 * 						
	 *  The server reloads if you change something from server side.
	 *  The minified and css are compiled when client side is changed.
	 * 
	*/
	var generateOptions = function(arg) {
		return {
            args: arg,
            watch: ['proxy.js','server.js','webrtc.io.js','app'],
            debug: true,
            delayTime: 1,
            cwd: __dirname
        };		
	}
	
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
                files: ['client/js/**/*js'],
                tasks: ['minijs'],
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
                files: ['client/less/**'],
                tasks: ['less'],
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
            prod: {
            	script: 'server.js'
            },
            dev: {
            	script: 'server.js'
            },
        	proxy: {
	        	script: 'proxy.js'
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
	            tasks: ['shell','nodemon:prod'], 
	            options: {
	                logConcurrentOutput: true
	            }
        	},
        	cluster: {
	            tasks: ['shell', 'nodemon:proxy', 'watch'], 
	            options: {
	                logConcurrentOutput: true
	            }
        	}
        },
        uglify: {
        	options: {
        	   mangle: false,
        	   sourceMap: true,
        	   compress: false
        	},
        	build: {
        		files: {
        			'public/js/loowid.min.js':[
						'client/js/angular/angular.min.js',
						'client/js/angular/angular-*.js',
						'client/js/angular/ui-*.js',
						'client/js/angular/ng-*.js',
						'client/js/*.js',
						'client/js/services/*.js',
						'client/js/controllers/*.js'        			
					]
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
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-concurrent');
    
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');

    //Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    //Default task(s).
    grunt.registerTask('default', ['mini','concurrent:default']);

    //Cluster local configuration N nodes 8001,8002,...
    // grunt cluster --nodes=N
    var nodes = grunt.option('nodes') || 2;
    // Create nodemon tasks for cluster
    for (var k=0; k<nodes; k++) {
    	grunt.config.data.nodemon['dev'+k] = { script: 'server.js', options: generateOptions([8000+k+1]) }
    	grunt.config.data.concurrent.cluster.tasks.push('nodemon:dev'+k);
    }
    // Setting number of cluster nodes
    grunt.config.data.nodemon.proxy.options = generateOptions([nodes]);
    grunt.config.data.nodemon.dev.options = generateOptions([]);
    grunt.registerTask('cluster', ['mini','concurrent:cluster']);

    // Same as development but using min.js (to test if its working)
    grunt.registerTask('prod', ['concurrent:prod']);

    // Minify tasks (generate min files)
    grunt.registerTask('minijs', ['uglify']);
    
    // Minify tasks (generate min files)
    grunt.registerTask('mini', ['minijs','less']);

};
