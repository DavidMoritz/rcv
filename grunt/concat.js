/**
 * concatenate scripts together for dev
 */
module.exports = function exportConcat(grunt) {
	grunt.config.set('concat', {
		js: {
			options: {
				stripBanners: true,
				banner: '<%= banner %>',
			},
			files: {
				'<%= distPath %>angular.js': [
					'lib/jquery/dist/jquery.min.js',
					'lib/angular/angular.min.js'
				],
				'<%= distPath %>lib.js': [
					'lib/angular-bootstrap/ui-bootstrap-tpls.min.js'
				],
				'<%= distPath %>main.js': [
					'src/services/mc.js',
					'src/js/app.js',
					'src/services/*.js',
					'src/js/**/*.js'
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
};
