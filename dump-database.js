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

  program
    .name('./dump-database')
    .description('Dump database to a JSON file')
    .option('-o, --output-file-name <filename>', 'JSON output file name', null)
    .action(async () => {
      const opts = program.opts();
      const { outputFileName } = opts;

      const allKeys = await db.scan({ match: '*' });
      console.log('allKeys: ' + allKeys.slice(0, 10) + ' ...');
    
      let outFd = fs.openSync(outputFileName, 'w');
    
      for (let k of allKeys) {
        const otype = await db.type(k);
        let obj;
        switch (otype) {
          case 'hash':
            obj = await db.getObject(k);
            break;
          case 'set':
            obj = await db.getSetMembers(k);
            break;
          case 'zset':
            obj = await db.getSortedSetScan({ key: k, match: '*' });
            break;
          case 'list':
            const L = await db.listLength(k);
            obj = await db.getListRange(k, 0, L);
            break;
          case 'string':
            obj = await db.get(k);
            break;
          default:
            throw Error(`Unknown object type: ${type}`)
        }
        
        obj = [ k, otype, obj ];
        obj = JSON.stringify(obj);
        fs.writeSync(outFd, obj + '\n');
      }

      fs.closeSync(outFd);
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
