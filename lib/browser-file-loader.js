function FileLoader() {

  this.existsSync = function() {
    false;
  };

  this.createReadStream = function() {
  };

}

module.exports = new FileLoader();
