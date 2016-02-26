module.exports = function(grunt) {
	// load in package.json to reference any data from it (like the version number)
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json')
	});

	// Define other properties of the config object
	// Define the root directory for distribution
	var distRoot = 'dist',
	// Build main distribution path. NOTE: There is no slash at the end
		distPath = distRoot + '/inc/',
	// Define banner for css and js files
		banner = '/*!\n' +
		' * <%= pkg.description %> - v<%= pkg.version %> \n' +
		' * Build Date: <%= grunt.template.today("yyyy.mm.dd") %> \n' +
		' * Docs: <%= pkg.homepage %> \n' +
		' * Coded @ <%= pkg.author %> \n' +
		' */ \n \n';

	// Set distribution path to grunt config object
	// This should be used when defining output files
	// Access this config option using <%= distRoot %>
	grunt.config.set('distRoot', distRoot);
	// Access this config option using <%= distPath %>
	grunt.config.set('distPath', distPath);
  // Access this config option using <%= banner %>
	grunt.config.set('banner', banner);

	// Load Grunt plugins from the config files in the grunt/ directory
	grunt.loadTasks('grunt');

	// default is just dev
	grunt.registerTask('default', [
		'dev',
		'watch'
	]);

	// Register task for generating unminified output files
	// This is safe to run on bamboo
	// Note: all subtasks of the sass and autoprefixer tasks will run. This will generate a minified and unminified version of the css.
	// If you run this task all of the example html files and generated documentation will reference the unminified version of Edge UI's css and js
	grunt.registerTask('dev', [
		'jade',
		'less:dev',
		'copy',
		'replace:dev',
		'pleeease:dev',
		'concat',
		'jshint'
	]);

	// Register task for generating minified (Prod ready) output files
	// Note: all subtasks of the sass and autoprefixer tasks will run. This will generate a minified and unminified version of the css.
	// If you run this task all of the example html files and generated documentation will reference the minified version of Edge UI's css and js
	grunt.registerTask('prod', [
		'jscs',
		'jade',
		'less:prod',
		'copy',
		'replace:prod',
		'pleeease:prod',
		'concat',
		'uglify'
	]);
};
