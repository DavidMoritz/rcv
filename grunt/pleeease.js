module.exports = function exportPleeease(grunt) {
	grunt.config('pleeease', {
		dev: {
			options: {
				optimizers: {
					minifier: false
				}
			},
			files: {
				'<%= distPath %>main.css': '<%= distPath %>main.css'
			}
		},
		prod: {
			options: {
				optimizers: {
					minifier: true
				}
			},
			files: {
				'<%= distPath %>main.css': '<%= distPath %>main.css'
			}
		}
	});

	grunt.loadNpmTasks('grunt-pleeease');
};
