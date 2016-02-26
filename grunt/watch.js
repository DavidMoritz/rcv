module.exports = function exportWatch(grunt) {
	grunt.config.set('watch', {
		src: {
			files: [
				'src/**/*.*'
			],
			tasks: [
				'dev'
			]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
};
