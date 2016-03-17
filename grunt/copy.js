module.exports = function exportCopy(grunt) {
	grunt.config('copy', {
		copy: {
			files: [
				// copy all bootstrap fonts
				{
					expand: true,
					cwd: 'lib/bootstrap/fonts/',
					src: ['**'],
					dest: '<%= distRoot %>/fonts/'
				},

				// copy all fontawesome fonts
				{
					expand: true,
					cwd: 'lib/fontawesome/fonts/',
					src: ['**'],
					dest: '<%= distRoot %>/fonts/'
				},

				// copy all custom fonts
				{
					expand: true,
					cwd: 'src/fonts/',
					src: ['**'],
					dest: '<%= distRoot %>/fonts/'
				},

				// copy all api files too
				{
					expand: true,
					cwd: 'src/api',
					src: ['**'],
					dest: '<%= distRoot %>/api'
				},

				// copy favicon & apple-icon
				{
					expand: true,
					cwd: 'src/',
					src: ['favicon.ico', 'apple-touch-icon.png'],
					dest: '<%= distRoot %>/'
				}
			]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
};
