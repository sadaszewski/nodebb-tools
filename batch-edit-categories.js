const NODEBB_PATH = process.env['NODEBB_PATH'] || '/nodebb';

const path = require('path');
const nconf = require(path.resolve(NODEBB_PATH, 'node_modules', 'nconf'));
const prestart = require(path.resolve(NODEBB_PATH, 'src', 'prestart'));

nconf.env({
  separator: '__',
});
prestart.setupWinston();
const configFile = path.resolve(NODEBB_PATH, nconf.get('config') || 'config.json');
prestart.loadConfig(configFile);

async function main() {
  const _ = require(path.resolve(NODEBB_PATH, 'node_modules', 'lodash'));
  const { program } = require(path.resolve(NODEBB_PATH, 'node_modules', 'commander'));
  const fs = require('fs');
  const db = require(path.resolve(NODEBB_PATH, 'src', 'database'));
  const categories = require(path.resolve(NODEBB_PATH, 'src', 'categories'));

  await db.init();

  async function getCid(name) {
    let cids = await db.getSortedSetScan({
      key: 'categories:name',
      match: name.toLowerCase() + ':*'
    });
    cids = cids.map(data => parseInt(data.split(':').pop(), 10));
    if (!cids.length)
      throw Error("Not found");
    if (cids.length > 1)
      throw Error("Ambiguous");
    return cids[0];
  }

  async function getAllCids() {
    let cids = await db.getSortedSetScan({
      key: 'categories:name',
      match: '*'
    });
    cids = cids.map(data => parseInt(data.split(':').pop(), 10));
    return cids;
  }

  program
    .name('./batch-edit-categories')
    .description('Batch edit categories')
    .option('--root-category <name>', 'Root category', null)
    .option('--properties-file-name <filename>', 'JSON properties file name', 'category-properties.json')
    .action(async () => {
      const opts = program.opts();
      const { rootCategory, propertiesFileName } = opts;

      let cids = [];

      console.log('All categories: ' + await db.getSortedSetScan({ key: 'categories:name', match: '*' }));

      if (rootCategory) {
        console.log('rootCategory: ' + rootCategory);
        const rootCid = await getCid(rootCategory);
        cids.push(rootCid);
        cids = cids.concat(await categories.getChildrenCids(rootCid));
      } else {
        cids = cids.concat(await getAllCids());
      }

      console.log('cids: ' + cids);

      let props = fs.readFileSync(propertiesFileName);
      props = JSON.parse(props.toString('utf8'));
      console.log('props:', props);

      cids = cids.map(id => `category:${id}`);
      // console.log('cids:', cids);

      console.log(await db.getObject(cids[0]));
      
      await db.setObjectBulk(cids, Array(cids.length).fill(props)); 
    });

  await program.parseAsync();
}

main().then(() => {
  console.log('ok');
  process.exit(0);
}).catch(e => {
  console.log('catch: ' + e);
  process.exit(1);
});

