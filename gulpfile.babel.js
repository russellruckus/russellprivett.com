/* jshint node: true */
/* global $: true */
'use strict';

import babelify from 'babelify';
import gulp from 'gulp';
import fs from 'fs';
import gulpLoadPlugins from 'gulp-load-plugins';
import rimraf from 'rimraf';
import browserify from "browserify";
import vsource from "vinyl-source-stream";
import vbuffer from "vinyl-buffer";
import runSequence from 'run-sequence';
import webpack from 'webpack-stream';
var browserSync = require('browser-sync').create();
var Metalsmith = require('metalsmith');

const imageminPngquant = require('imagemin-pngquant');

const $ = gulpLoadPlugins();

let envProd = false;

const staticSrc = 'src/**/*.{eot,ttf,woff,woff2,otf,pdf,txt}';

const dist = 'dist/';

/* Configure Nunjucks */
var nunjucks = require('nunjucks');
var nunjucksEnv = nunjucks.configure('./src/html/views', {
	watch: false,
	throwOnUndefined: false,
	noCache: true
});
/* Enable Mardown parseing */
var markdown = require('nunjucks-markdown');
var marked = require('marked');
markdown.register(nunjucksEnv, marked);

// Handlebar helpers for revisioned asset paths and content
const handlebarOpts = {
	ignorePartials: true,
	batch: ['./src/partials'],
	helpers: {
		cssPath(path, context) {
			if (envProd) {
				return ['css', context.data.root[path]].join('/');
			} else {
				return 'css/' + path;
			}
		},
		jsPath(path, context) {
			if (envProd) {
				return ['js', context.data.root[path]].join('/');
			} else {
				return 'js/' + path;
			}
		},
		pTags(content) {
			var output = '';
			var lines = content.split(/\r\n|\r|\n/g);

			for (var i = 0; i < lines.length; i++) {
				if (lines[i]) {
					output += '<p>' + lines[i] + '</p>';
				}
			}

			return output;
		},
		lowerCaseNoSpace(content) {
			return content.replace(/ /g, '-').toLowerCase(); // Removes all whitespace and sets to lower case
		}
	}
};

// Clean
gulp.task('clean', () => {
	return rimraf.sync('dist');
});

gulp.task('cacheclear', () => {
	$.cache.clearAll();
});

// Copy staticSrc
gulp.task('copy'
	, () => {
		return gulp.src(staticSrc, {
			base: 'src'
		}).pipe(gulp.dest(dist));
	});



gulp.task("revreplace", function () {
	var manifest = gulp.src(dist + 'manifest.json');

	return gulp.src(dist + 'index.html')
		.pipe($.revReplace({
			manifest: manifest
		}))
		.pipe(gulp.dest(dist));
});

// JSHint
gulp.task('jshint', () => {
	return gulp.src(['src/js/**/*.js'])
		.pipe($.jshint())
		.pipe($.jshint.reporter('jshint-stylish'))
		.pipe($.jshint.reporter('fail'))
		.on('error', function (e) {
			if (!envProd) {
				$.notify().write(e);
			}
		});
});

/** Compile Javascript */
gulp.task('javascript', ['jshint'], function () {
	var out = gulp.src('./src/js/main.js')
		.pipe(webpack(require('./webpack.config.js')))
		.on('error', function (e) {
			$.notify().write(e);
		});

	if (envProd) {
		return out.pipe($.uglify())
			// .pipe($.rev())
			.pipe(gulp.dest(dist + 'js'))
			.pipe($.rev.manifest(dist + 'manifest.json', {
				merge: true,
				base: '',
			}))
			.pipe(gulp.dest(''));
	} else {
		return out.pipe($.sourcemaps.init({
				loadMaps: true
			}))
			.pipe($.sourcemaps.write())
			.pipe(gulp.dest(dist + 'js'));
	}
});

// Metalsmith
gulp.task('metalsmith', function (cb) {
	Metalsmith(__dirname)
		.source('src/html/pages')
		.destination(dist)
		.clean(false)
		.use(require('metalsmith-metadata-directory')({
			directory: 'src/html/data/**/*.json',
		}))
		.use(require('metalsmith-layouts')({
			'engine': 'nunjucks',
			'directory': 'src/html/views',
			'rename': true
		}))
		.build(function (err) {
			if (err) {
				throw err;
			}
			cb();
		});
});

// Images
gulp.task("images", function (cb) {
	return gulp.src('src/img/**/*.{jpg,png,gif,svg,ico}')
		.pipe($.cache(
			$.imagemin([
				imageminPngquant(),
				$.imagemin.gifsicle(),
				$.imagemin.svgo({
					svgoPlugins: [{
						removeViewBox: true,
					}, ],
				}),
			], {
				verbose: true,
			})
		))
		.pipe(gulp.dest(dist + 'img'));
});

// Stylesheets
gulp.task('stylesheets', ['javascript'], (done) => {
	var paths = [
	];
	var out = gulp.src('src/css/main.scss')
		.pipe($.sourcemaps.init())
		.pipe($.sassGlob())
		.pipe($.sass({
			style: 'expanded',
			includePaths: paths .concat(require('node-neat').includePaths)
			
			
			.concat(require('node-normalize-scss').includePaths)
			
			
		}))
		.on('error', $.sass.logError)
		.on('error', function (e) {
			if (!envProd) {
				$.notify().write(e);
			}
		})
		.pipe($.autoprefixer({
			browsers: ['last 3 versions'],
			cascade: false
		}));

	if (envProd) {
		return out.pipe($.csso())
			// .pipe($.rev())
			.pipe(gulp.dest(dist + 'css'))
			.pipe($.rev.manifest(dist + 'manifest.json', {
				merge: true,
				base: '',
			}))
			.pipe(gulp.dest(''));
	} else {
		return out.pipe($.sourcemaps.write())
			.pipe(gulp.dest(dist + 'css'));
	}
});

// Set Production Environment
gulp.task('production_env', () => {
	envProd = true;
});

// Serve
gulp.task('serve', ['clean', 'stylesheets', 'javascript', 'images', 'copy', 'metalsmith'], function () {
	browserSync.init({
		ghostMode: false,
		open: false,
		server: {
			baseDir: dist,
			serveStaticOptions: {
				extensions: ['html'] // pretty urls
			}
		}
	});
	gulp.watch(staticSrc, ['copy']);
	gulp.watch('src/css/**/*.scss', ['stylesheets']);
	gulp.watch('src/js/**/*.js', ['javascript']);
	gulp.watch("src/**/*.{html,njk}", ["metalsmith"]);
	gulp.watch(dist + '/**/*.{jpg,png,svg,webp,js,html}').on('change', browserSync.reload);
});

// Deploy
gulp.task("deploy", function (callback) {
	runSequence(
		'build',
		'publish',
		callback)
});

// Build
gulp.task("build", function (callback) {
	runSequence(
		"production_env",
		"clean",
		"stylesheets",
		"javascript",
		"images",
		"copy",
		"metalsmith",
		"revreplace",
		callback)
});


// Publish to whatever here
gulp.task('publish', function () {

});

