/**
 * Replaces all references for typography.com and edge css / js
 *
 * Any file ending in '.html' with the exception of files ending in
 * '-documentation.html' will be searched for the patterns defined below.
 * This module searches for every instance of a 'match' defined below that has a
 * @@ in front of it. For example, the two matches defined below have
 * placeholders in the html pages that look like.
 * - @@typographyUrl
 * - @@majorVersion
 * - @@edgeuiFileName
 *
 * Using typographyUrl as an example:
 * Every instance of @@typographyUrl is replaced with the value in replacement
 * option for the typographyUrl match. The replacement option for typographUrl
 * is set to <%= typographyFontUrl %>. This value is defined in the Gruntfile.js
 * file.
 *
 * @@majorVersion and @@edgeuiFileName work the same way.
 *
 * After the placeholders are replaced with the final values the html files are
 * moved to the distrubtion root (this is also defined in the Gruntfile.js)
 *
 * Grunt plugin documentation: https://github.com/yoniholmes/grunt-text-replace
 */
module.exports = function exportReplace(grunt) {
	grunt.config('replace', {
		dev: {
			options: {
				patterns: [
					{
						match: 'javascriptReplaceFiles',
						replacement: '<script src="inc/lib.js"></script><script src="inc/main.js"></script>'
					}
				]
			},
			files: [
				{
					expand: true,
					flatten: true,
					src: [
						'<%= distRoot %>/*.html'
					],
					dest: '<%= distRoot %>/'
				}
			]
		},
		prod: {
			options: {
				patterns: [
					{
						match: 'javascriptReplaceFiles',
						replacement: '<script src="inc/main.js"></script>'
					}
				]
			},
			files: [
				{
					expand: true,
					flatten: true,
					src: [
						'<%= distRoot %>/*.html'
					],
					dest: '<%= distRoot %>/'
				}
			]
		}
	});

	grunt.loadNpmTasks('grunt-replace');
};
