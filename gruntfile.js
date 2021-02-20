module.exports = function(grunt) {


    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-contrib-copy');

// Project configuration.
    grunt.initConfig({
        uglify: {
            options: {
                /*
                * For eslint
                * */
                banner: '/* eslint no-undef: "off" */\n' +
                    '/* eslint no-unused-expressions: "off" */\n' +
                    '/* eslint no-restricted-globals: "off" */',
                /*
                * change this, part when you want to for debug bcr
                * mangle: false,
                * compress: false,
                * beautify: true
                * */
                mangle: false,
                compress: false,
                beautify: true
            },
            build: {
                files: {
                    'dist/bcr.min.js': [
                        'src/bcr.js',
                        'src/bcr.analyze.js',
                        'src/bcr.cleaning.js',
                        'src/bcr.utility.js',
                        'src/lang/dan.js',
                        'src/lang/deu.js',
                        'src/lang/eng.js',
                        'src/lang/fra.js',
                        'src/lang/ita.js',
                        'src/lang/spa.js',
                        'src/lang/swe.js',
                        'src/bcr.cities.js',
                        'src/bcr.job.js',
                        'src/bcr.names.js',
                        'src/bcr.streets.js',
                        'src/tesseract/tesseract.min.js'],
                    'dist/bcr.tesseractv2.min.js': [
                        'src/bcr.js',
                        'src/bcr.analyze.js',
                        'src/bcr.cleaning.js',
                        'src/bcr.utility.js',
                        'src/lang/dan.js',
                        'src/lang/deu.js',
                        'src/lang/eng.js',
                        'src/lang/fra.js',
                        'src/lang/ita.js',
                        'src/lang/spa.js',
                        'src/lang/swe.js',
                        'src/bcr.cities.js',
                        'src/bcr.job.js',
                        'src/bcr.names.js',
                        'src/bcr.streets.js',
                        'src/tesseractv2/tesseract.min.js'],
                    'dist/bcr.qr.min.js': [
                        'src/bcr.js',
                        'src/bcr.analyze.js',
                        'src/bcr.cleaning.js',
                        'src/bcr.utility.js',
                        'src/lang/dan.js',
                        'src/lang/deu.js',
                        'src/lang/eng.js',
                        'src/lang/fra.js',
                        'src/lang/ita.js',
                        'src/lang/spa.js',
                        'src/lang/swe.js',
                        'src/bcr.cities.js',
                        'src/bcr.job.js',
                        'src/bcr.names.js',
                        'src/bcr.streets.js',
                        'src/qr/grid.js',
                        'src/qr/version.js',
                        'src/qr/detector.js',
                        'src/qr/formatinf.js',
                        'src/qr/errorlevel.js',
                        'src/qr/bitmat.js',
                        'src/qr/datablock.js',
                        'src/qr/bmparser.js',
                        'src/qr/datamask.js',
                        'src/qr/rsdecoder.js',
                        'src/qr/gf256poly.js',
                        'src/qr/gf256.js',
                        'src/qr/decoder.js',
                        'src/qr/qrcode.js',
                        'src/qr/findpat.js',
                        'src/qr/alignpat.js',
                        'src/qr/databr.js',
                        'src/tesseract/tesseract.min.js',],
                    'dist/bcr.tesseractv2.qr.min.js': [
                        'src/bcr.js',
                        'src/bcr.analyze.js',
                        'src/bcr.cleaning.js',
                        'src/bcr.utility.js',
                        'src/lang/dan.js',
                        'src/lang/deu.js',
                        'src/lang/eng.js',
                        'src/lang/fra.js',
                        'src/lang/ita.js',
                        'src/lang/spa.js',
                        'src/lang/swe.js',
                        'src/bcr.cities.js',
                        'src/bcr.job.js',
                        'src/bcr.names.js',
                        'src/bcr.streets.js',
                        'src/qr/grid.js',
                        'src/qr/version.js',
                        'src/qr/detector.js',
                        'src/qr/formatinf.js',
                        'src/qr/errorlevel.js',
                        'src/qr/bitmat.js',
                        'src/qr/datablock.js',
                        'src/qr/bmparser.js',
                        'src/qr/datamask.js',
                        'src/qr/rsdecoder.js',
                        'src/qr/gf256poly.js',
                        'src/qr/gf256.js',
                        'src/qr/decoder.js',
                        'src/qr/qrcode.js',
                        'src/qr/findpat.js',
                        'src/qr/alignpat.js',
                        'src/qr/databr.js',
                        'src/tesseractv2/tesseract.min.js']
                }
            }
        },
        copy: {
            main: {
                files: [
                    // includes files within path
                    {expand: true, cwd: 'src/data/', src: ['**'], dest: 'dist/data', filter: 'isFile'},
                    {expand: true, cwd: 'src/tesseract/', src: ['**'], dest: 'dist/tesseract', filter: 'isFile'},
                    //Tesseractjs V2 Dependencies
                    {expand: true, cwd: 'src/tesseractv2/', src: ['**'], dest: 'dist/tesseractv2', filter: 'isFile'},
                    {expand: true, cwd: 'src/tesseractv2-lang-data/', src: ['**'], dest: 'dist/tesseractv2-lang-data', filter: 'isFile'},
                    // Here you can change Trainingdata
                   /* {expand: true, cwd: 'src/tesseractv2-lang-data-best/', src: ['**'], dest: 'dist/tesseractv2-lang-data', filter: 'isFile'},
                    {expand: true, cwd: 'src/tesseractv2-lang-data-fast/', src: ['**'], dest: 'dist/tesseractv2-lang-data', filter: 'isFile'}*/
                ],
            },
        }
    });

    grunt.registerTask('default', ['uglify', 'copy']);
}