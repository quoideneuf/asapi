var fs = require('fs');

function FileLoader() {

  this.existsSync = fs.existsSync;
  this.createReadStream = fs.createReadStream;

}

module.exports = new FileLoader();
