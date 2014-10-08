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
                files: ['public/js/**', 'app/**/*.js'],
                tasks: ['jshint'],
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
            		src: ['gruntfile.js', 'public/js/**/*.js', 'test/**/*.js', 'app/**/*.js'] 
            	},
            	options: { 
            		jshintrc: '.jshintrc' 
            	}
            }
        },
        nodemon: {
            dev: {
                options: {
                    file: 'server.js',
                    args: [],
                    ignoredFiles: ['README.md', 'node_modules/**', '.DS_Store'],
                    watchedExtensions: ['js'],
                    watchedFolders: ['app', 'config'],
                    debug: true,
                    delayTime: 1,
                    env: {
                        PORT: 3000
                    },
                    cwd: __dirname
                }
            }
        },
        concurrent: {
            tasks: ['nodemon', 'watch'], 
            options: {
                logConcurrentOutput: true
            }
        },
        mochaTest: {
            options: {
                reporter: 'spec'
            },
            src: ['test/**/*.js']
        },
        env: {
            test: {
                NODE_ENV: 'test'
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
        'closure-compiler': {
            frontend: {
              closurePath: 'node_modules/grunt-closure-compiler',
              js: 'public/js/loowid.js',
              jsOutputFile: 'public/js/loowid.min.js',
              maxBuffer: 500,
              options: {
                compilation_level: 'ADVANCED_OPTIMIZATIONS',
                language_in: 'ECMASCRIPT5_STRICT'
              }
            }
        },
        ngmin: {
        	angular: {
        		src: ['public/js/loowid.js'],
        		dest: 'public/js/loowid.min.js'
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
        min: {
            dist: {
                src: ['public/js/loowid.js'],
                dest: 'public/js/loowid.min.js'
            }        	
        },
        cssmin: {
        	  minify: {
        	    expand: true,
        	    cwd: 'public/css/',
        	    src: ['*.css', '!*.min.css'],
        	    dest: 'public/css/',
        	    ext: '.min.css'
        	  }
        }        
    });

    //Load NPM tasks 
    //grunt.loadNpmTasks('grunt-ngmin');
    //grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    //grunt.loadNpmTasks('grunt-mocha-test');
    //grunt.loadNpmTasks('grunt-nodemon');
    //grunt.loadNpmTasks('grunt-concurrent');
    //grunt.loadNpmTasks('grunt-env');
    //grunt.loadNpmTasks('grunt-yui-compressor');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    //grunt.loadNpmTasks('grunt-contrib-cssmin');
    //grunt.loadNpmTasks('grunt-closure-compiler');

    //Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    //Default task(s).
    grunt.registerTask('default', ['jshint', 'concurrent']);
    
    // Minify tasks
    grunt.registerTask('mini', ['concat','uglify']);

    // Minify tasks
    //grunt.registerTask('minic', ['concat','closure-compiler']);

    // Minify tasks
    //grunt.registerTask('miniu', ['concat','uglify']);

    // Minify tasks
    //grunt.registerTask('minin', ['concat','ngmin']);

    // Minify tasks
    //grunt.registerTask('miniy', ['concat','min']);

    //Test task.
    //grunt.registerTask('test', ['env:test', 'mochaTest']);
};
