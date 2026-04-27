export const trickVote = '123456';

export function jsUcfirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function dataFromObj(jsonObjOrString) {
  let jsonObj;

  if (typeof jsonObjOrString === 'string') {
    // processing visuals
    jsonObj = {
      config: {
        contest: jsonObjOrString
      },
      results: [
        {
          round: 1,
          tally: { processing: '1' },
          tallyResults: [{ elected: 'processing' }]
        }
      ]
    };
  } else {
    jsonObj = jsonObjOrString;
  }

  const outputstring = JSON.stringify(jsonObj);
  const file = new File(['\ufeff' + outputstring], 'results.json', { type: 'application/json' });
  const data = new FormData();

  data.append('jsonFile', file);

  return data;
}

// String hash polyfill – applied as side-effect of importing this module
String.prototype.hashCode = function () {
  var hash = 0;
  if (this.length === 0) {
    return hash;
  }
  for (var i = 0; i < this.length; i++) {
    var char = this.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};
