const { src, dest } = require( 'gulp' );
const babel = require( 'gulp-babel' );
const minify = require( 'gulp-babel-minify' );

function buildTask( callback ) {

    // Process javascripts
    src( 'src/toc.jquery.js' )
        .pipe( babel({
            presets: [ '@babel/env' ]
        } ) ).on( 'error', function( error ) {
        console.error( error.toString(), '\n\b', error.codeFrame );
        this.emit( 'end' );
    } )
        .pipe( minify() )
        .pipe( dest( 'dist' ) );

    callback();
}

exports.default = buildTask;