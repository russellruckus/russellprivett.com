'use strict';

require('dotenv').load();

// dato, allows you to get content coming from your administrative area;
// root, represents the root of your project and makes it easy to create local files and directories;
// i18n, is useful in multi-language sites to switch between the various available locales and get back translated content;


module.exports = (dato, root, i18n) => {
	root.directory("src/html/data", (dir) => {
		writeNav(dir,dato);
	});
};

function writeNav(dir, dato) {
	let items = [];

	dato.navWorks.forEach((item) => {
		const el = item.toMap();

		const content = {
			title: el.title,
			url: el.url
		};
		items.push(content);
	});
	dato.navInfos.forEach((item) => {
		const el = item.toMap();

		const content = {
			title: el.title,
			url: el.url
		};
		items.push(content);
	});

	dir.createDataFile('nav.json', 'json', items);
	writeWork(dir, dato);
}

function writeWork(dir, dato) {
	let items = [];

	dato.works.forEach((item) => {
		const el = item.toMap();

		const content = {
			image: el.image,
			subject: el.subject,
			location: el.location,
			publication: el.publication,
			purpose: el.purpose
		};
		items.push(content);
	});

	dir.createDataFile('content.json', 'json', items);
	writeInfo(dir, dato);
}

function writeInfo(dir, dato) {
  const about = dato.about.about;
  dir.createDataFile('about.json', 'json', about);

};









