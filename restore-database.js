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
  const { program } = require(path.resolve(NODEBB_PATH, 'node_modules', 'commander'));
  const fs = require('fs');
  const db = require(path.resolve(NODEBB_PATH, 'src', 'database'));
  const readline = require('readline');

  await db.init();

  program
    .name('./restore-database')
    .description('Restore database from a JSON file')
    .option('-i, --input-file-name <filename>', 'JSON input file name', null)
    .action(async () => {
      const opts = program.opts();
      const { inputFileName } = opts;

      const inStream = fs.createReadStream(inputFileName);

      await db.emptydb();

      const inLines = readline.createInterface({ input: inStream });

      for await (const line of inLines) {
        const obj = JSON.decode(line);
        const [ key, type, data, pexpireAt ] = obj;
        switch (type) {
          case 'hash':
            await db.setObject(key, data);
            break;
          case 'set':
            await db.setAdd(key, data);
            break;
          case 'zset':
            const scores = data.map(e => e.score);
            const values = data.map(e => e.value);
            await db.sortedSetAddBulk(key, scores, values);
            break;
          case 'list':
            await db.listAppend(key, data);
            break;
          case 'string':
            await db.set(key, data);
            break;
          default:
            throw Error(`Unsupported type: ${type}`);
        }
        await db.pexpireAt(key, pexpireAt);
      }

      inLines.close();
      inStream.close();
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
