module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
		    options: {
				separator: ';'
			},
			mergeJs: {
				src: ['bower_components/milagro/amcl/js/rand.js', 'bower_components/milagro/amcl/js/rom_curve.js', 'bower_components/milagro/amcl/js/rom_field.js', 'bower_components/milagro/amcl/js/uint64.js', 'bower_components/milagro/amcl/js/aes.js', 'bower_components/milagro/amcl/js/big.js', 'bower_components/milagro/amcl/js/gcm.js', 'bower_components/milagro/amcl/js/hash256.js', 'bower_components/milagro/amcl/js/hash384.js', 'bower_components/milagro/amcl/js/hash512.js', 'bower_components/milagro/amcl/js/sha3.js', 'bower_components/milagro/amcl/crypto-js/src/newhope.js', 'bower_components/milagro/amcl/js/nhs.js', 'bower_components/milagro/amcl/js/fp.js', 'bower_components/milagro/amcl/js/fp2.js', 'bower_components/milagro/amcl/js/fp4.js', 'bower_components/milagro/amcl/js/fp12.js', 'bower_components/milagro/amcl/js/ecp.js', 'bower_components/milagro/amcl/js/ecp2.js', 'bower_components/milagro/amcl/js/ecdh.js', 'bower_components/milagro/amcl/js/pair.js', 'bower_components/milagro/amcl/js/mpin.js', 'bower_components/milagro/amcl/js/ctx.js', 'lib/mpin.js'],
				dest: './dist/mpinjs.js'
			}
		},
		bgShell: {
			createDir: {
				cmd: "mkdir -p ./dist",
				options: {
	            	stdout: true
				}
			},
			test: {
				cmd: 'mocha',
				options: {
					stdout: true
				}
			},
			testCoverage: {
				cmd: 'mocha test --require blanket --reporter html-cov > test/coverage.html',
				options: {
					stdout: true
				}
			},
			bowerInstall: {
				cmd: 'bower install --allow-root',
				options: {
					stdout: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-bg-shell');
	grunt.loadNpmTasks('grunt-contrib-concat');

	grunt.registerTask('build',  ['bgShell:createDir', 'bgShell:bowerInstall', 'concat']);
	grunt.registerTask('chk',  ['bgShell:createDir', 'bgShell:bowerInstall', 'concat']);
	grunt.registerTask('test',  ['bgShell:test']);
	grunt.registerTask('testCover',  ['bgShell:testCoverage']);
};
