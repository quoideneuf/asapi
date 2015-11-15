
function merge(overrides, defaults) {

  if (typeof(overrides) != 'undefined') {
    for (var i = 0; i < Object.keys(overrides).length; i++) { defaults[Object.keys(overrides)[i]] = overrides[Object.keys(overrides)[i]] }
  }

  return defaults;
}


module.exports = {
  repo: function() {
    return {
      repo_code: Math.random().toString(36).substring(7),
      name: Math.random().toString(36).substring(7)
    };
  },

  resource: function() {
    return {
      id_0: Math.random().toString(36).substring(7),
      title: Math.random().toString(36).substring(7),
      level: "collection",
      extents: [{number: "1",
                 portion: "whole",
                 extent_type: "linear_feet"}],
      dates: [{date_type: "single",
               label: "creation",
               begin: "1900"}]               
    };
  },

  classification: function() {
    return {
      identifier: Math.random().toString(36).substring(7),
      title: Math.random().toString(36).substring(7)
    };
  },

  location: function() {
    return {
      building: Math.random().toString(36).substring(7),
      classification: Math.random().toString(36).substring(7)
    };
  },

  accession: function() {
    return {
      id_0: Math.random().toString(36).substring(7),
      title: Math.random().toString(36).substring(7),
      accession_date: "2001-01-01"
    };
  },

  digital_object: function() {
    return {
      title: Math.random().toString(36).substring(7),
      digital_object_id: Math.random().toString(36).substring(7),
      level: "collection"
    };
  },

  mockGetResources: function(thisPage, lastPage) {
    var results = {
      first_page: 1,
      last_page: lastPage,
      this_page: thisPage,
      results: [],
    }

    for (var i=0; i < 10; i++) {
      results.results.push(this.resource());
    }

    return JSON.stringify(results);
  }
}
