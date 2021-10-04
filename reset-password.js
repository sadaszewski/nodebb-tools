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
  const prompt = require(path.resolve(NODEBB_PATH, 'node_modules', 'prompt'));
  const fs = require('fs');
  const db = require(path.resolve(NODEBB_PATH, 'src', 'database'));
  const user = require(path.resolve(NODEBB_PATH, 'src', 'user'));

  await db.init();

  program
    .name('./reset-password')
    .description('Reset password for the specified user')
    .option('-s, --search-by <field>', 'Field name to search by', 'username')
    .option('-q, --query <query>', 'Query string', '')
    .action(async () => {
      const opts = program.opts();
      const { searchBy, query } = opts;

      if (!query) {
        throw Error('Query string is required');
      }
    
      const searchResult = await user.search({ searchBy, query });
      if (!searchResult.users) {
        throw Error("User not found");
      }
    
      if (searchResult.users.length > 1) {
        throw Error("User search returned ambiguous results");
      }
    
      const uid = searchResult.users[0].uid;
    
      const schema = {
        properties: {
          password: {
            hidden: true
          }
        }
      };
    
      prompt.start();
      const { password } = await prompt.get(schema);

      const hash = await user.hashPassword(password);
      const data = {
        password: hash,
        'password:shaWrapped': 1,
      };
    
      await user.setUserFields(uid, data);
      await user.reset.updateExpiry(uid);
      await user.auth.resetLockout(uid);
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
