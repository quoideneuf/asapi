ArchivesSpace REST Api Client
==================================

NodeJS module providing common functions of the ArchivesSpace REST Api

## Basic Info

Install:

    $ npm install asapi

Use:

```javascript
var Api = require('asapi');
var api = new Api({url:"http://localhost:8089"});
api.ping(function(err, json) {
  console.log("ArchivesSpace version: " + json.archivesSpaceVersion);
});
```

Test:

    $ npm install jasmine-node -g
    $ jasmine-node spec

Note: ArchivesSpace should be running on port 8089, using a test database.

## Examples

Convert all extent information to metric system:

```javascript
api.eachResource(function(resource) {
  var update = false;

  for (var i = 0; i < resource.extents.length; i++) {

    if (resource.extents[i] && resource.extents[i].extent_type == 'linear_feet') {
      resource.extents[i].number = (resource.extents[i].number * 0.3048) + "";
      resource.extents[i].extent_type = "linear_meters";
      update = true;
    }
  }

  if (update) api.updateRecord(resource, function(err, body) {
    if (err)
      console.log(err);
    else {
      console.log(body);
    }
  });

});

```

## Promises (0.1.0 and up)

You can use this library with promises. You need to wrap whatever promise provider you want to use when constructing the client:

```javascript
var Q = require('q');

var api = new Api({
  url:'http://localhost:8089',
  active_repo: 2,
  promiseFactory: function() {
    var d = Q.defer();

    return {
      resolve: d.resolve,
      reject: d.reject,
      promise: d.promise
    }
  }
});

api.ping().then(function(json) {
  console.log(json.archivesSpaceVersion);
}).catch(function(error) {
  console.log(error.message);
});
```

## In the Browser

Install with bower and include bundle.js in your project:

    $ bower install asapi --save

To build bundle.js and test it, check out the source code and do the following:

```bash
git clone git@github.com:quoideneuf/asapi.git
npm install
grunt browserify
grunt karma
```

This requires Chrome. 

## REPL

To play around in REPL mode, start up ArchivesSpace on the default ports with the default admin user, and:

```bash
./scripts/repl.js
>api.ping();
```
