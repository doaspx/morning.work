var config = require('config');
console.log(config);
console.log(config.get('Customer'));
console.log(config.get('Customer.dbConfig'));
console.log(config.has('Customer.dbConfig.host'));
console.log(config.has('Customer.dbConfig.host2'));