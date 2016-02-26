/**
 * Make less into css file in the dist directory
 */
module.exports = function exportLess(grunt) {
	grunt.config('less', {
		dev: {
			files: [{
				'<%= distPath %>main.css': [
					'src/less/all.less'
				]
			}]
		},
		prod: {
			options: {
				cleancss: true,
				compress: true
			},
			files: [{
				'<%= distPath %>main.css': [
					'src/less/all.less'
				]
			}]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-less');
};
