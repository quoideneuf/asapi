function Logger() {
  this.debug = function(msg) {
    console.log(msg);
  };

  this.info = function(msg) {
    console.log(msg);
  };
}



module.exports = function() {
  return new Logger();
};
