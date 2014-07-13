ArchivesSpace REST Api Client
==================================

NodeJS module providing common functions of the ArchivesSpace REST Api

Install:

    $ npm install https://github.com/lcdhoffman/asapi/tarball/master

Use:

```javascript
var api = new require('asapi')({url:"http://localhost:4567"});
api.ping(function(err, json) {
  console.log("ArchivesSpace version: " + json.archivesSpaceVersion);
});
```

Test:

    $ npm install nodeunit -g
    $ nodeunit test.js




