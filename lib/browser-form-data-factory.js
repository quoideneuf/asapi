function NoFormData() {
  this.append = function(field, json) {
    throw new Error("Multipart form not supported for browsers at this time");
  };
}

module.exports = function() {
  return new NoFormData();
};
