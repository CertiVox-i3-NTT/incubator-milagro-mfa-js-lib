module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
		    options: {
				separator: ';'
			},
			mergeJs: {
				src: ['bower_components/milagro-crypto-js/src/rand.js', 'bower_components/milagro-crypto-js/src/rom_curve.js', 'bower_components/milagro-crypto-js/src/rom_field.js', 'bower_components/milagro-crypto-js/src/uint64.js', 'bower_components/milagro-crypto-js/src/aes.js', 'bower_components/milagro-crypto-js/src/big.js', 'bower_components/milagro-crypto-js/src/gcm.js', 'bower_components/milagro-crypto-js/src/hash256.js', 'bower_components/milagro-crypto-js/src/hash384.js', 'bower_components/milagro-crypto-js/src/hash512.js', 'bower_components/milagro-crypto-js/src/sha3.js', 'bower_components/milagro-crypto-js/src/newhope.js', 'bower_components/milagro-crypto-js/src/nhs.js', 'bower_components/milagro-crypto-js/src/fp.js', 'bower_components/milagro-crypto-js/src/fp2.js', 'bower_components/milagro-crypto-js/src/fp4.js', 'bower_components/milagro-crypto-js/src/fp12.js', 'bower_components/milagro-crypto-js/src/ecp.js', 'bower_components/milagro-crypto-js/src/ecp2.js', 'bower_components/milagro-crypto-js/src/ecdh.js', 'bower_components/milagro-crypto-js/src/pair.js', 'bower_components/milagro-crypto-js/src/mpin.js', 'bower_components/milagro-crypto-js/src/ctx.js', 'lib/mpin.js'],
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
