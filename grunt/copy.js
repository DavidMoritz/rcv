module.exports = function exportCopy(grunt) {
	grunt.config('copy', {
		main: {
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

				// copy favicon & apple-icon & htaccess
				{
					expand: true,
					cwd: 'src/',
					src: ['favicon.ico', 'apple-touch-icon.png', 'github-fork.png', '.htaccess'],
					dest: '<%= distRoot %>/'
				}
			]
		},
		noMySql: {
			files: [
				// copy all no-mysql api files
				{
					expand: true,
					cwd: 'src/api/no-mysql',
					src: ['**'],
					dest: '<%= distRoot %>/api'
				}
			]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
};
