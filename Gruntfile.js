module.exports = function(grunt) {
  
  grunt.initConfig({
    browserify: {
      build: {
        src: ['index.js'],
        dest: 'bundle.js'
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
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-karma');
};
