module.exports = function exportJade(grunt) {
	grunt.config('jade', {
		compile: {
			options: {
				pretty: true
			},
			files: {
				'dist/index.html': 'src/jade/index.jade'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jade');
};
