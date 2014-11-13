'use strict';

var as;

describe('AS Api Client', function() {
  
  beforeEach(function() {
    as = new Api({
      url: 'http://localhost:8089',
      active_repo: 2
    });
  });

  it('pings ASpace', function(done) {

    as.ping(function(err, json) {
      expect(json.archivesSpaceVersion).toMatch(/v\d\.\d/);
      done();
    });
  });
});
