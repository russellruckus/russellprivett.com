'use strict'

// dato, allows you to get content coming from your administrative area;
// root, represents the root of your project and makes it easy to create local files and directories;
// i18n, is useful in multi-language sites to switch between the various available locales and get back translated content;
const util = require('util');
const fs = require('fs');
module.exports = (dato, root, i18n) => {
	root.directory("src/html/data", (dir) => {
		writeExampleContent(dir,dato);
	});
};

function writeExampleContent(dir,dato) {
	let results = [];
	dato.contentCollectionName.forEach((contentTypeName) => {
		const el = contentTypeName.toMap();

		const content = {
			title: el.title,
			text: el.text
		};
		results.push(content);
	});

	dir.createDataFile('example_content.json', 'json', results);
}
