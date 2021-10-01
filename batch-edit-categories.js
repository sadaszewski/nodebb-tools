const NODEBB_PATH = process.env['NODEBB_PATH'];

const _ = require('lodash');
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const nconf = require('nconf');
const db = require(path.resolve(NODEBB_PATH, 'src/database'));
const prestart = require(path.resolve(NODEBB_PATH, 'src/prestart'));
const categories = require(path.resolve(NODEBB_PATH, 'src/categories'));

async function main() {
  nconf.env({
    separator: '__',
  });

  prestart.setupWinston();
  const myconsole = new winston.transports.Console();
  winston.add(myconsole);

	const	configFile = path.resolve(NODEBB_PATH, nconf.get('config') || 'config.json');

	prestart.loadConfig(configFile);

	await db.init();

	async function getCid(name) {
	  let cids = await db.getSortedSetScan({
	    key: 'categories:name',
	    match: name
	  });
	  cids = cids.map(data => parseInt(data.split(':').pop(), 10));
	  if (!cids.length)
	    throw Error("Not found");
	  return cids[0];
	}

	async function getAllCids() {
	  let cids = await db.getSortedSetScan({
	    key: 'categories:name'
	  });
	  cids = cids.map(data => parseInt(data.split(':').pop(), 10));
	  return cids;
	}

	program
	  .name('./batch-edit-categories')
	  .description('Batch edit categories')
	  .option('--root-category', 'Root category', null)
	  .option('--properties-file-name <filename>', 'JSON properties file name', 'category-properties.json')
	  .action(async () => {
	    const opts = program.opts();
	    const { rootCategory, propertiesFileName } = opts;

	    let cats = [];

	    if (rootCategory) {
	      const rootCid = await getCid(rootCategory);
	      cats.push(rootCid);
	      cats = cats.concat(await categories.getChildrenCids(rootCid));
	    } else {
	      cats = cats.concat(await getAllCids());
	    }

	    console.log('cats: ' + cats);
	  });

	program.parse();
}

main().then(() => { console.log('ok'); }).catch(() => { console.log('catch'); });


