module.exports = function(grunt) {
  
  grunt.initConfig({
    browserify: {
      full: {
        src: ['index.js'],
        dest: 'bundle.js',
      },
      light: {
        src: ['index.js'],
        dest: 'bundle-no-request.js',
        options: {
          ignore: ['./lib/browser-request.js']
        }
      }
    },
    karma: {
      unit: {
        options: {
          frameworks: ['jasmine'],
          basePath: '',
          files: ['bundle.js', 'test/browser-unit.js'],
          customLaunchers: {
            Chrome_without_security: {
              base: 'Chrome',
              flags: ['--disable-web-security']
            }
          },
          browsers: ['Chrome_without_security'],
          singleRun: true
        }
      }
    },
    jasmine_node: {
      options: {
        forceExit: true,
        match: '.',
        matchall: false,
        extensions: 'js',
        specNameMatcher: 'spec',
        jUnit: {
          report: true,
          savePath : "./build/reports/jasmine/",
          useDotNotation: true,
          consolidate: true
        }
      },
      all: ['spec/']
    },
    watch: {
      options: {
        livereload: 35730,
      },
      main: {
        files: ['index.js'],
        tasks: [
          'browserify'
        ]
      }
    },
    // connect: {
    //   options: {
    //     port: 35730
    //   }
    // }
      
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
