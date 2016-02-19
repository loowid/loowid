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
	
	var getGruntOption = function(id,def) {
		return grunt.option(id) || def;
	};
	
	var generateOptions = function(arg) {
		return {
            args: arg,
            watch: ['log.js','proxy.js','server.js','webrtc.io.js','app'],
            debug: true,
            delayTime: 1,
            cwd: __dirname
        };		
	};
	
	var checkMongoOff = function() {
	    var mongodb = getGruntOption('mongodb','on');
	    // Do not run mongo in openshift environment
	    if (process.env.OPENSHIFT_NODEJS_PORT || process.env.MONGOHQ_URL || mongodb==='off') {
	    	grunt.config.data.concurrent.prod.tasks.splice(0,1);
	    	grunt.config.data.concurrent.default.tasks.splice(0,1);
	    	grunt.config.data.concurrent.cluster.tasks.splice(0,1);
	    } 
	};
	
	var generateNodeShell = function(port) {
		return { 
			command: 'node server.js '+port+' test', 
			options: { 
				async: true, 
				stdout: true, 
				stderr: true 
			} 
		};
	};
	
	var generateTestNode = function(nodes) {
		var taskName = 't';
		var tasks = [];
		var mongodb = getGruntOption('mongodb','on');
		if (!process.env.OPENSHIFT_NODEJS_PORT && mongodb!=='off') {
			tasks.push('shell:mongo');
			taskName = 'n';
		}
		for (var j=1; j<nodes; j+=1) {
			// In test one server is running with jasmine
			if (!grunt.config.data.shell['node'+j]) {
				grunt.config.data.shell['node'+j] = generateNodeShell(Number(process.env.LOOWID_BASE_PORT)+j+1);
			}
			tasks.push('shell:node'+j);
		}
	    tasks.push('jasmine_node:'+taskName+nodes);
		return {
            tasks: tasks, 
            options: {
                logConcurrentOutput: true
            }
    	};
	};
	
	var addTestNodesToTasks = function(tasks,tests) {
		for (var x=0; x<tests.length; x+=1) {
			grunt.config.data.concurrent['test'+x] = generateTestNode(tests[x]);
			tasks.push('concurrent:test'+x);
		}
	};
	
	var addClusterNodesToTasks = function(nodes) {
	    // Create nodemon tasks for cluster
	    for (var k=0; k<nodes; k+=1) {
	    	grunt.config.data.nodemon['dev'+k] = { script: 'server.js', options: generateOptions([Number(process.env.LOOWID_BASE_PORT)+k+1]) };
	    	grunt.config.data.concurrent.cluster.tasks.push('nodemon:dev'+k);
	    }
	};
	
    // Project Configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            jade: {
                files: ['app/views/**'],
                tasks: ['jshint'],
                options: {
                    livereload: true,
                },
            },
            js: {
                files: ['client/js/**/*js','oembed.js'],
                tasks: ['minicheck'],
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
            		      'spec/**/*.js',
            		      'client/js/*.js',
            		      'client/js/services/*.js',
            		      'client/js/controllers/*.js',
            		      '!client/js/lib/**/*.js'
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
        			async: true,
        			stdout: false,
        			stderr: true
        		}
        	}
        },
        nodemon: {
            prod: {
            	script: 'server.js',
            	options: {
            		watch: 'nothing.js'
            	}
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
	            tasks: ['shell:mongo','nodemon:dev', 'watch'], 
	            options: {
	                logConcurrentOutput: true
	            }
        	},
        	prod: {
	            tasks: ['shell:mongo','nodemon:prod'], 
	            options: {
	                logConcurrentOutput: true
	            }
        	},
        	cluster: {
	            tasks: ['shell:mongo', 'nodemon:proxy', 'watch'], 
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
						'client/js/lib/angular/angular.min.js',
						'client/js/lib/angular/angular-*.js',
						'client/js/lib/angular/ng-*.js',
						'client/js/lib/angular/ui-*.js',
						'client/js/lib/underscore/*.js',
						'client/js/lib/sigma/*.js',
						'client/js/*.js',
						'client/js/services/*.js',
						'client/js/controllers/*.js',
						'oembed.js'        			
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
        },
        'jasmine_node': {
            options: {
              forceExit: true,
              matchall: false,
              extensions: 'js',
              specNameMatcher: 'spec',
              junitreport: {
                report: true,
                savePath : './reports/',
                useDotNotation: true,
                consolidate: true
              }
            },
            coverage: {
                options : {
                    failTask: false,
                    branches : 100 ,
                    functions: 100,
                    statements:100,
                    lines:100
                }
            },
            all: ['spec/']
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
    grunt.loadNpmTasks('grunt-jasmine-node');
    grunt.loadNpmTasks('grunt-jasmine-node-istanbul');
    
    //Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    checkMongoOff();
    
    if (!process.env.OPENSHIFT_NODEJS_PORT) {
        process.env.LOOWID_HTTP_PORT = getGruntOption('port',80);
        process.env.LOOWID_HTTPS_PORT = getGruntOption('sport',443);
        process.env.LOOWID_BASE_PORT = getGruntOption('bport',8000);
    }
    
    // Cluster local configuration N nodes BasePort + 1, BasePort + 2,...
    // grunt cluster --nodes=N
    var nodes = getGruntOption('nodes',2);
    addClusterNodesToTasks(nodes);

    // Setting number of cluster nodes
    grunt.config.data.nodemon.proxy.options = generateOptions([nodes]);
    grunt.config.data.nodemon.dev.options = generateOptions([]);
    
    //Default task(s).
    grunt.registerTask('default', ['minicheck','concurrent:default']);
    
    grunt.registerTask('cluster', ['minicheck','concurrent:cluster']);
    grunt.registerTask('prod', ['mini','concurrent:prod']);
    
    // Minify tasks (generate min files)
    grunt.registerTask('minijs', ['uglify']);
    
    // Minify tasks (generate min files)
    grunt.registerTask('mini', ['minijs','less']);
    grunt.registerTask('minicheck', ['jshint','minijs','less']);
    
    var testingTasks = ['jshint'];
    // By default add 3 cluster tests with 3, 2 and 1 nodes. End with single node test to get max coberture report last
    var testNodes = (grunt.option('nodes')?[Number(grunt.option('nodes'))]:[3,2,1]);
    addTestNodesToTasks(testingTasks,testNodes);

    process.env.LOOWID_TEST_CASE = getGruntOption('testcase','');
    
    // Run tests
    grunt.registerTask('test', testingTasks);
    
};
