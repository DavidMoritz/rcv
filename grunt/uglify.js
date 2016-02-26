/**
 * concat and minify scripts
 */
module.exports = function exportUglify(grunt) {
	grunt.config.set('uglify', {
		prod: {
			options: {
				banner: '<%= banner %>',
			},
			files: {
				'<%= distPath %>main.js': '<%= distPath %>main.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
};
