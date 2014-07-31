ArchivesSpace REST Api Client
==================================

NodeJS module providing common functions of the ArchivesSpace REST Api

## Basic Info

Install:

    $ npm install asapi

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
      console.log("uh oh " + err);
    else {
      console.log(body);
    }
  });

});

```
