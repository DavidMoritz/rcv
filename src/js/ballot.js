import { dataFromObj } from './utils/helpers.js';

var $s, $http;

export function sanitizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function displayTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

export function updateTime(dateObj, zoneString) {
  zoneString = zoneString || moment.tz.guess();
  var mom = moment(dateObj).tz(zoneString, true);

  return mom
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z/, '');
}

function deleteThis(data, item) {
  $http({
    method: 'POST',
    url: '/api/delete-' + item + '.php',
    data: data
  }).success(function (resp) {
    $s.deleted = true;
  });
}

export function roundResultsRelease() {
  var now = new Date();
  var m = now.getMinutes();
  var offset = parseInt((m + 25) / 15) * 15;
  now = new Date(now.setSeconds(0));

  // vote ends 15 minutes after it starts round to the nearest quarter
  return new Date(now.setMinutes(offset));
}

export function dateToTime(d) {
  var h = d.getHours();
  var meridian = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  // Round minute to nearest 5
  var m = Math.round(d.getMinutes() / 5) * 5;
  if (m === 60) m = 55;
  return { hour: h, minute: m, meridian: meridian };
}

function updateTimeObj(scopeKey, d) {
  var t = dateToTime(d);
  var cur = $s[scopeKey];
  if (!cur || cur.hour !== t.hour || cur.minute !== t.minute || cur.meridian !== t.meridian) {
    $s[scopeKey] = t;
  }
}

export function assignFieldSlugs(fields) {
  var slugCounts = {};
  fields.forEach(function (field) {
    var base = sanitizeTitle(field.title || 'field');
    slugCounts[base] = (slugCounts[base] || 0) + 1;
    field.fieldSlug = slugCounts[base] > 1 ? base + '-' + slugCounts[base] : base;
  });
}

export function initBallot(scope, http) {
  $s = scope;
  $http = http;

  // Time-picker helpers
  $s.hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  $s.minutes = [];
  for (var i = 0; i < 60; i += 5) {
    $s.minutes.push({ value: i, label: (i < 10 ? '0' : '') + i });
  }

  $s.syncTimeToDate = function (field, t) {
    var d = new Date($s.ballot[field]);
    var h = t.hour % 12;
    if (t.meridian === 'PM') h += 12;
    d.setHours(h);
    d.setMinutes(t.minute);
    $s.ballot[field] = d;
  };

  $s.$watch('ballot.voteCutoff', function (v) {
    if (v) updateTimeObj('cutoffTime', new Date(v));
  });
  $s.$watch('ballot.resultsRelease', function (v) {
    if (v) updateTimeObj('releaseTime', new Date(v));
  });

  $s.resetBallot = function () {
    $s.generateRandomKey();
    $s.entries = null;
    $s.showGroupPage = false;
    $s.images = [];
    $s.hyperlinks = [];
    $s.entryColors = null;
    $s.entryIds = [];
    $s.advancedOptions = false;
    $s.activeSection = null;
    $s.errorEntry = '';
    $s.showRelease = false;
    $s.editTime = false;
    $s.editDate = false;
    $s.showIntegrationOptions = false;

    return {
      positions: 1,
      createdBy: $s.user.id || 'guest',
      maxVotes: 1,
      register: 0,
      allowCustom: 0,
      oneDeviceOneVote: 0,
      orderedEntries: 0,
      tieBreak: 'weighted',
      voteCutoff: roundResultsRelease(),
      voteTimezone: moment.tz.guess(),
      resultTimezone: moment.tz.guess()
    };
  };

  $s.getBallots = function () {
    // we need to get ballots based on user signin
    if ($s.user.id) {
      $http({
        method: 'POST',
        url: '/api/get-ballots.php',
        data: $s.user
      }).then(function (resp) {
        $s.now = new Date();
        $s.allBallots = resp.data.map(function (ballot) {
          ballot.voteCutoff = moment.tz(ballot.voteCutoff, 'Zulu');
          ballot.resultsRelease = moment.tz(ballot.resultsRelease, 'Zulu');

          return ballot;
        });
      });
    } else {
      setTimeout($s.getBallots, 750);
    }
  };

  $s.claimBallot = function () {
    $http
      .post('/api/claim-ballot.php', {
        ballotId: $s.ballotId,
        userId: $s.user.id
      })
      .then(function (resp) {
        if (resp.data.data && resp.data.data.success) {
          $s.claimSuccess = true;
          $s.ballotCreatedBy = $s.user.id;
        }
      });
  };

  $s.generateRandomKey = function (len, dup) {
    len = len || 4;
    var key = Math.random().toString(36).substr(2, len);
    $http.get('/api/get-key-ballot.php?key=' + key).then(function (resp) {
      if (resp.data.length) {
        $s.generateRandomKey(++len);
      } else {
        $s.errors.key = null;
        $s.success.key = null;
        if (dup) {
          $s.dupBallot.key = key;
        } else {
          $s.ballot.key = key;
        }
      }
    });
  };

  $s.changeBallot = function (ballot) {
    $s.ballot = ballot;
    $s.editBallot = true;
    $s.ballot.positions = parseInt($s.ballot.positions);
    $s.ballot.resultsRelease = new Date($s.ballot.resultsRelease);
    $s.ballot.voteCutoff = new Date($s.ballot.voteCutoff);
    $s.editTime = true;
    $s.editDate = true;
    $s.showRelease = true;
    $s.advancedOptions = true;
    $s.ballot.isSecure = ballot.isSecure == 1;
    $s.ballot.hideNames = ballot.hideNames == 1;
    $s.ballot.hideDetails = ballot.hideDetails == 1;
    $s.ballot.allowCustom = ballot.allowCustom == 1;
    $s.ballot.showGraph = ballot.showGraph == 1;
    $s.ballot.oneDeviceOneVote = ballot.oneDeviceOneVote == 1;
    $s.ballot.orderedEntries = ballot.orderedEntries == 1;
    $s.ballot.kickbackUrl = ballot.kickbackUrl || '';
    $s.ballot.iframeUrl = ballot.iframeUrl || '';
    $s.showIntegrationOptions = !!(ballot.kickbackUrl || ballot.iframeUrl);
    $s.ballot.allowGrouping = ballot.allowGrouping == 1;

    $http
      .get('/api/get-candidates.php?edit=true&key=' + $s.ballot.key + '&t=' + Date.now())
      .then(function (resp) {
        var candidates = resp.data.candidates;
        if (candidates) {
          $s.entries = candidates.map(function (entry) {
            return entry.candidate;
          });
          $s.images = candidates.map(function (entry) {
            return entry.image;
          });
          $s.hyperlinks = candidates.map(function (entry) {
            return entry.hyperlink;
          });
          $s.entryColors = candidates.map(function (entry) {
            return entry.color;
          });
          $s.entryIds = candidates.map(function (entry) {
            return entry.entry_id;
          });

          // Load group fields if grouping is enabled
          var groupFields = resp.data.groupFields || [];
          if ($s.ballot.allowGrouping && groupFields.length) {
            $s.groupFields = groupFields.map(function (field) {
              return {
                title: field.title,
                question_text: field.question_text,
                type: field.type || 'select',
                required: field.required != 0,
                options: (field.options || []).map(function (opt) {
                  return opt.label;
                })
              };
            });
          } else {
            $s.groupFields = [];
          }

          $s.navigate('create');
        }
      });
  };

  $s.checkAvailability = _.debounce(function () {
    var key = $s.dupBallot ? $s.dupBallot.key : $s.ballot.key;
    $http.get('/api/get-key-ballot.php?key=' + key).then(function (resp) {
      if (resp.data.length) {
        $s.success.key = null;

        if (key) {
          $s.errors.key = key + ' is already in use';
        } else {
          $s.errors.key = 'Shortcode is required';
        }
      } else {
        $s.errors.key = null;
        $s.success.key = key + ' is available';
      }
    });
  }, 250);

  $s.entryColorOptions = [
    { value: null },
    { value: 'dddddd' },
    { value: 'e7b9af' },
    { value: 'f4cccd' },
    { value: 'fce6cd' },
    { value: 'fdf3cc' },
    { value: 'd9ead4' },
    { value: 'd0e0e3' },
    { value: 'c9daf8' },
    { value: 'd0e3f3' },
    { value: 'dad3e9' },
    { value: 'ebd1dd' }
  ];

  $s.editEntryModal = function (idx) {
    $s.editingEntry = {
      idx: idx,
      name: $s.entries[idx],
      image: $s.images[idx] || '',
      hyperlink: decodeURIComponent($s.hyperlinks[idx] || ''),
      color: $s.entryColors[idx] || null
    };
    $('#edit-entry-modal').modal('show');
  };

  $s.saveEntry = function () {
    var idx = $s.editingEntry.idx;
    $s.entries[idx] = $s.editingEntry.name;
    $s.images[idx] = $s.editingEntry.image || '';
    var href = $s.editingEntry.hyperlink || '';
    if (href && !href.match(/^(http|https):\/\//i)) {
      href = 'http://' + href;
    }
    $s.hyperlinks[idx] = href ? encodeURIComponent(href) : '';
    $s.entryColors[idx] = $s.editingEntry.color || '';
    $('#edit-entry-modal').modal('hide');
  };

  $s.deleteEntry = function () {
    $s.removeEntry($s.editingEntry.idx);
    $('#edit-entry-modal').modal('hide');
  };

  $s.sameTime = function () {
    if ($s.showRelease && $s.ballot.voteCutoff) {
      $s.ballot.resultsRelease = new Date($s.ballot.voteCutoff);
    }
  };

  $s.manageSecureBallot = function (ballot) {
    $s.manageBallot = ballot;
    $s.manageSort = 'code';
    $s.manageSortReverse = false;
    $s.activeLink = 'manage';
    $s.manageGroupFields = [];
    if (ballot.isSecure == 1) {
      $s.loadBallotCodes(ballot);
    }
    if (ballot.allowGrouping == 1) {
      $s.showManageGroups = ballot.isSecure != 1; // Default open if no codes section
      $http.get('/api/get-group-fields.php?ballotId=' + ballot.id).then(function (resp) {
        $s.manageGroupFields = resp.data || [];
      });
    }
  };

  $s.startEditManageGroupFields = function () {
    $s.groupFields = ($s.manageGroupFields || []).map(function (field) {
      return {
        title: field.title,
        question_text: field.question_text,
        type: field.type || 'select',
        required: field.required != 0,
        options: (field.options || []).map(function (opt) {
          return opt.label;
        })
      };
    });
    if (!$s.groupFields.length) {
      $s.groupFields = [
        { title: '', question_text: '', type: 'select', required: true, options: [''] }
      ];
    }
    $s._manageInitialRegister = $s.manageBallot.register;
    $s._manageInitialHideDetails = $s.manageBallot.hideDetails;
    $s.editingManageGroupFields = true;
    $s.showManageGroups = true;
  };

  $s.cancelEditManageGroupFields = function () {
    $s.manageBallot.register = $s._manageInitialRegister;
    $s.manageBallot.hideDetails = $s._manageInitialHideDetails;
    $s.editingManageGroupFields = false;
  };

  $s.saveManageGroupFields = function () {
    var validFields = ($s.groupFields || []).filter(function (f) {
      return f.title || f.question_text;
    }).map(function (f) {
      var copy = angular.copy(f);
      if (copy.title) {
        copy.title = sanitizeTitle(copy.title);
      }
      return copy;
    });

    var ballotSettingsChanged =
      $s.manageBallot.register != $s._manageInitialRegister ||
      !!$s.manageBallot.hideDetails !== !!$s._manageInitialHideDetails;

    function onDone() {
      $http.get('/api/get-group-fields.php?ballotId=' + $s.manageBallot.id).then(function (resp) {
        $s.manageGroupFields = resp.data || [];
        $s.editingManageGroupFields = false;
      });
    }

    function saveBallotSettingsIfChanged() {
      if (ballotSettingsChanged) {
        $http({
          method: 'POST',
          url: '/api/update-ballot.php',
          data: {
            id: $s.manageBallot.id,
            name: $s.manageBallot.name,
            positions: $s.manageBallot.positions,
            key: $s.manageBallot.key,
            createdBy: $s.user.id,
            register: $s.manageBallot.register,
            hideDetails: $s.manageBallot.hideDetails ? 1 : 0
          }
        });
      }
    }

    if (validFields.length) {
      $http({
        method: 'POST',
        url: '/api/save-group-fields.php',
        data: {
          ballotId: $s.manageBallot.id,
          createdBy: $s.user.id,
          fields: validFields
        }
      }).success(function () {
        saveBallotSettingsIfChanged();
        onDone();
      });
    } else {
      saveBallotSettingsIfChanged();
      onDone();
    }
  };

  $s.loadBallotCodes = function (ballot) {
    $http({
      method: 'POST',
      url: '/api/get-ballot-codes.php',
      data: { ballotId: ballot.id, createdBy: $s.user.id }
    }).success(function (resp) {
      if (resp.codes) {
        $s.manageCodes = resp.codes.map(function (c) {
          if (c.votedAt) {
            c.votedAt = moment(c.votedAt).format('MMM D, h:mm a');
          }
          return c;
        });
        $s.manageCodesAvailable = resp.codes.filter(function (c) {
          return !c.votedAt;
        }).length;
      }
    });
  };

  $s.printCodeSheet = function () {
    var codes = ($s.manageCodes || [])
      .filter(function (c) {
        return !c.votedAt;
      })
      .sort(function (a, b) {
        return a.codeId - b.codeId;
      });
    if (!codes.length) {
      alert('No available codes to print.');
      return;
    }

    var ballot = $s.manageBallot;
    var html =
      '<!DOCTYPE html><html><head><title>Voter Codes - ' +
      ballot.name +
      '</title><style>' +
      '* { margin: 0; padding: 0; box-sizing: border-box; }' +
      'body { font-family: Arial, sans-serif; }' +
      '.instructions { text-align: center; padding: 20px; border-bottom: 2px solid #333; }' +
      '.instructions h2 { margin-bottom: 5px; }' +
      '.instructions p { color: #555; font-size: 14px; }' +
      '.grid { display: grid; grid-template-columns: repeat(3, 1fr); }' +
      '.code-cell { border: 1px solid #ccc; margin: -0.5px; padding: 24px 16px; text-align: center; break-inside: avoid; }' +
      '.code-cell .code { font-family: monospace; font-size: 32px; letter-spacing: 6px; font-weight: bold; text-transform: uppercase; }' +
      '.code-cell .label { font-size: 11px; color: #999; margin-top: 6px; }' +
      '.code-cell .ballot-name { font-size: 12px; color: #777; margin-bottom: 6px; }' +
      '@media print { .instructions { break-after: avoid; } }' +
      '</style></head><body>' +
      '<div class="instructions">' +
      '<h2>' +
      ballot.name +
      '</h2>' +
      '<h4>Cut along the lines.</h4>' +
      '<p>For &ldquo;Double-Blind&rdquo; elections, randomize the cut slips and distribute discreetly.<br/>This ensures no vote can be traced back to a voter without their direct consent.</p>' +
      '<p>Vote at: ' +
      $s.origin +
      '/' +
      ballot.key +
      '</p>' +
      '</div>' +
      '<div class="grid">';

    codes.forEach(function (c) {
      html +=
        '<div class="code-cell">' +
        '<div class="ballot-name">' +
        ballot.name +
        '</div>' +
        '<div class="code">' +
        c.code.toUpperCase() +
        '</div>' +
        '<div class="label">' +
        $s.origin +
        '/' +
        ballot.key +
        '</div>' +
        '</div>';
    });

    html += '</div></body></html>';

    var w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  };

  $s.saveCodeLabel = function (code) {
    $http({
      method: 'POST',
      url: '/api/update-code-label.php',
      data: {
        ballotId: $s.manageBallot.id,
        code: code.code,
        label: code.label || '',
        createdBy: $s.user.id
      }
    });
  };

  $s.resetSecureVote = function (code) {
    if (
      !confirm(
        'Reset this vote for code ' +
          code.code.toUpperCase() +
          '?\nThis will delete the vote and free the code for reuse.'
      )
    )
      return;
    $http({
      method: 'POST',
      url: '/api/delete-vote.php',
      data: {
        voteId: code.voteId,
        shortcode: $s.manageBallot.key,
        createdBy: $s.user.id,
        username: $s.user.name
      }
    }).success(function () {
      $s.loadBallotCodes($s.manageBallot);
    });
  };

  $s.deleteCode = function (code) {
    $http({
      method: 'POST',
      url: '/api/delete-code.php',
      data: { ballotId: $s.manageBallot.id, code: code.code, createdBy: $s.user.id }
    }).success(function (resp) {
      if (resp.success) {
        $s.loadBallotCodes($s.manageBallot);
      }
    });
  };

  $s.endVotingNow = function () {
    if (
      !confirm('End voting now and release results immediately?\nNo more votes will be accepted.')
    )
      return;
    $http({
      method: 'POST',
      url: '/api/end-voting.php',
      data: { ballotId: $s.manageBallot.id, createdBy: $s.user.id }
    }).success(function (resp) {
      if (resp.success) {
        $s.manageBallot.voteCutoff = moment();
        $s.now = new Date();
      }
    });
  };

  $s.requestMoreCodes = function (count) {
    count = count || 10;
    $http({
      method: 'POST',
      url: '/api/assign-codes.php',
      data: { ballotId: $s.manageBallot.id, count: count, createdBy: $s.user.id }
    }).success(function (resp) {
      if (resp.codes) {
        $s.loadBallotCodes($s.manageBallot);
      }
    });
  };

  $s.removeEntry = function (idx) {
    $s.entries.splice(idx, 1);
    $s.images.splice(idx, 1);
    $s.hyperlinks.splice(idx, 1);
    $s.entryColors.splice(idx, 1);
    if ($s.entryIds) $s.entryIds.splice(idx, 1);
  };

  $s.onSecureToggle = function () {
    if ($s.ballot.isSecure) {
      $s.ballot.tieBreak = 'random';
      $s.ballot.allowCustom = false;
      $s.ballot.register = '2'; // Anonymous — code replaces name
      $s.ballot.hideDetails = false;
      $s.ballot.hideNames = false;

      // Set vote cutoff to one week from now, rounded to next 15 minutes
      var d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      var m = d.getMinutes();
      d.setMinutes(Math.ceil(m / 15) * 15, 0, 0);
      $s.ballot.voteCutoff = d;
      $s.editTime = true;
      $s.editDate = true;
    }
  };

  $s.onGroupingToggle = function () {
    if ($s.ballot.allowGrouping) {
      $s.ballot.allowCustom = false;
      if (!$s.groupFields || !$s.groupFields.length) {
        $s.groupFields = [
          { title: '', question_text: '', type: 'select', required: true, options: [''] }
        ];
      }
    }
  };

  $s.addGroupField = function () {
    $s.groupFields.push({
      title: '',
      question_text: '',
      type: 'select',
      required: true,
      options: ['']
    });
  };

  $s.onFieldTypeChange = function (field) {
    if (field.type === 'text') {
      field.options = [];
    } else if (field.type === 'checkbox') {
      field.options = [];
      field.required = false;
    } else if (!field.options || !field.options.length) {
      field.options = [''];
    }
  };

  $s.removeGroupField = function (idx) {
    $s.groupFields.splice(idx, 1);
  };

  $s.addGroupOption = function (fieldIdx) {
    $s.groupFields[fieldIdx].options.push('');
    setTimeout(function () {
      var inputs = document.querySelectorAll('.group-choice-' + fieldIdx);
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
  };

  $s.removeGroupOption = function (fieldIdx, optIdx) {
    $s.groupFields[fieldIdx].options.splice(optIdx, 1);
  };

  $s.newBallot = function () {
    // Secure ballot requires a vote cutoff
    if ($s.ballot.isSecure && !$s.editTime && !$s.editDate) {
      $s.errors.secureCutoff = 'Secure ballots require a voting cutoff time.';
      return;
    }
    $s.errors.secureCutoff = null;

    const tempReserve = $s.ballot.resultsRelease;

    if (!$s.editTime && !$s.editDate) {
      $s.ballot.sqlResultsRelease = updateTime(new Date());
      $s.ballot.sqlVoteCutoff = updateTime(new Date('2199-12-31T23:59:59'));
    } else {
      $s.ballot.sqlVoteCutoff = updateTime($s.ballot.voteCutoff, $s.ballot.voteTimezone);
      $s.ballot.sqlResultsRelease = $s.ballot.sqlVoteCutoff;
    }

    if ($s.showRelease) {
      $s.ballot.sqlResultsRelease = updateTime(tempReserve, $s.ballot.resultTimezone);
    }

    const postRCV = function (data, textStatus, jqXHR) {
      //      if (!$s.editBallot) {
      if (false) {
        const lessOne = data.length - 1;
        const finalChar = data.charAt(lessOne);
        const jsonStr = finalChar === '}' ? data : data.substr(0, lessOne);
        const respObj = JSON.parse(jsonStr);

        $s.ballot.rcvisId = respObj.id;
        $s.ballot.rcvisSlug = respObj.slug;
      }

      $s.ballot.createdBy = $s.user.id || 'guest';
      $http({
        method: 'POST',
        url: '/api/' + ($s.editBallot ? 'update' : 'new') + '-ballot.php',
        data: $s.ballot,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).success(function (resp) {
        if (resp.errors) {
          $s.errors = resp.errors;
        } else if ($s.editBallot) {
          $s.editBallot = false;
          $s.navigate('profile');
        } else {
          $s.ballot.id = resp;
          $s.entries = [];
          $s.images = [];
          $s.hyperlinks = [];
          $s.entryColors = [];
          setTimeout(function() { document.querySelector('[name="entryInput"]').focus(); });
        }
      });
    };

    //    if ($s.patchRcvis && !$s.editBallot) {
    if (false) {
      $.ajax({
        url: '/api/rcvis_new.php',
        type: 'POST',
        data: dataFromObj($s.ballot.name),
        cache: false,
        processData: false,
        contentType: false,
        success: postRCV
      });
    } else {
      postRCV();
    }
  };

  $s.generateQRCode = function (shortCode) {
    var url = 'https://rankedchoices.com/' + shortCode;
    var el = document.getElementById('qrcode');
    el.innerHTML = '';
    new QRCode(el, url);
  };

  $s.submitEntries = function () {
    if ($s.entries.length < 2) {
      $s.errorEntry = 'Must have at least 2 entries';

      return;
    }

    // If any entry has a color, fill blanks with white instead of null
    var hasAnyColor = $s.entryColors.some(function (c) { return !!c; });
    if (hasAnyColor) {
      $s.entryColors = $s.entryColors.map(function (c) { return c || 'ffffff'; });
    }

    $http({
      method: 'POST',
      url: '/api/add-entries.php',
      data: {
        entries: $s.entries,
        images: $s.images,
        hyperlinks: $s.hyperlinks,
        colors: $s.entryColors,
        entryIds: $s.entryIds || [],
        ballotId: $s.ballot.id
      }
    }).success(function (resp) {
      if (resp.errors) {
        $s.errors = resp.errors;
      } else {
        $s.editBallot = false;
        if ($s.ballot.allowGrouping) {
          $s.showGroupPage = true;
          $s._initialRegister = $s.ballot.register;
          $s._initialHideDetails = $s.ballot.hideDetails;
        } else {
          $s.congrats = true;
          $s.generateQRCode($s.ballot.key);
        }
      }
    });
  };

  $s.submitGroupFields = function () {
    var ballotSettingsChanged =
      $s.ballot.register != $s._initialRegister ||
      !!$s.ballot.hideDetails !== !!$s._initialHideDetails;

    function saveBallotSettingsIfChanged() {
      if (ballotSettingsChanged) {
        $http({
          method: 'POST',
          url: '/api/update-ballot.php',
          data: {
            id: $s.ballot.id,
            name: $s.ballot.name,
            positions: $s.ballot.positions,
            key: $s.ballot.key,
            createdBy: $s.user.id || 'guest',
            register: $s.ballot.register,
            hideDetails: $s.ballot.hideDetails ? 1 : 0
          }
        });
      }
    }

    if ($s.groupFields && $s.groupFields.length) {
      var validFields = $s.groupFields.filter(function (f) {
        return f.title || f.question_text;
      }).map(function (f) {
        var copy = angular.copy(f);
        if (copy.title) {
          copy.title = sanitizeTitle(copy.title);
        }
        return copy;
      });
      if (validFields.length) {
        $http({
          method: 'POST',
          url: '/api/save-group-fields.php',
          data: {
            ballotId: $s.ballot.id,
            createdBy: $s.user.id || 'guest',
            fields: validFields
          }
        }).success(function () {
          saveBallotSettingsIfChanged();
          $s.congrats = true;
          $s.generateQRCode($s.ballot.key);
        });
        return;
      } else {
        // No valid fields — auto-uncheck grouping
        $s.ballot.allowGrouping = false;
        var updateData = {
          id: $s.ballot.id,
          name: $s.ballot.name,
          positions: $s.ballot.positions,
          key: $s.ballot.key,
          createdBy: $s.user.id || 'guest',
          allowGrouping: 0
        };
        if (ballotSettingsChanged) {
          updateData.register = $s.ballot.register;
          updateData.hideDetails = $s.ballot.hideDetails ? 1 : 0;
        }
        $http({
          method: 'POST',
          url: '/api/update-ballot.php',
          data: updateData
        });
      }
    }
    saveBallotSettingsIfChanged();
    $s.congrats = true;
    $s.generateQRCode($s.ballot.key);
  };

  $s.duplicateBallot = function (ballot) {
    $s.dupBallotName = ballot.name;
    $s.dupBallot = _.clone(ballot);
    $s.success.key = null;
    $s.errors.key = $s.dupBallot.key + ' is already in use';
    // For secure ballots, generate the same number of new codes
    if (ballot.isSecure == 1 && $s.manageCodes) {
      $s.dupBallot.codeCount = $s.manageCodes.length;
    }
    $('#dup-ballot-modal').modal('show');
  };

  $s.duplicateBallotSubmit = function () {
    if ($s.dupBallot.key) {
      var tempId = $s.dupBallot.id;
      $http.get('/api/get-key-ballot.php?key=' + $s.dupBallot.key).then(function (resp) {
        if (resp.data.length) {
          alert($s.dupBallot.key + ' is already in use');
        } else {
          $s.dupBallot.sqlVoteCutoff = $s.dupBallot.voteCutoff._i || $s.dupBallot.voteCutoff;
          $s.dupBallot.sqlResultsRelease =
            $s.dupBallot.resultsRelease._i || $s.dupBallot.resultsRelease;
          $http({
            method: 'POST',
            url: '/api/new-ballot.php',
            data: $s.dupBallot
          }).success(function (resp) {
            if (resp.errors) {
              $s.errors = resp.errors;
            } else {
              $http({
                method: 'POST',
                url: '/api/duplicate-ballot.php',
                data: {
                  ballotId: resp,
                  duplicateBallotId: tempId
                }
              }).success(function (resp) {
                console.log(resp);
                window.location.reload();
              });
            }
          });
        }
      });
    }
  };

  $s.transferBallot = function (ballot) {
    $s.transferBallotName = ballot.name;
    $s.transferBallotId = ballot.id;
    $s.transferUsername = '';
    $('#transfer-ballot-modal').modal('show');
  };

  $s.transferBallotSubmit = function () {
    if ($s.transferUsername) {
      $http({
        method: 'POST',
        url: '/api/transfer-ballot.php',
        data: {
          ballotId: $s.transferBallotId,
          currentOwnerId: $s.user.id,
          newOwnerUsername: $s.transferUsername
        }
      }).then(function (resp) {
        if (resp.data.data && resp.data.data.success) {
          $('#transfer-ballot-modal').modal('hide');
          var ballot = _.find($s.allBallots, function (b) {
            return b.id === $s.transferBallotId;
          });
          if (ballot) {
            ballot.transferring = true;
            setTimeout(function () {
              $('#ballot-row-' + ballot.id).fadeOut(2000, function () {
                $s.$apply(function () {
                  _.remove($s.allBallots, ballot);
                });
              });
            }, 0);
          }
        } else if (resp.data.errors) {
          alert(resp.data.errors.ballot || 'Transfer failed.');
        }
      });
    }
  };

  $s.deleteSecureBallot = function () {
    if (!confirm('Delete ' + $s.manageBallot.name + '?\nThis action cannot be undone.')) return;
    deleteThis($s.manageBallot, 'ballot');
    _.remove($s.allBallots, $s.manageBallot);
    $s.navigate('profile');
  };

  $s.deleteBallot = function (ballot) {
    $s.deleteBallotRef = ballot;
    $s.deleteBallotName = ballot.name;
    $('#delete-ballot-modal').modal('show');
  };

  $s.deleteBallotSubmit = function () {
    deleteThis($s.deleteBallotRef, 'ballot');
    _.remove($s.allBallots, $s.deleteBallotRef);
    $('#delete-ballot-modal').modal('hide');
  };

  $s.deleteVotes = function (ballot) {
    $s.resetVotesBallotRef = ballot;
    $s.resetVotesBallotName = ballot.name;
    $('#reset-votes-modal').modal('show');
  };

  $s.resetVotesSubmit = function () {
    deleteThis($s.resetVotesBallotRef, 'votes');
    $s.resetVotesBallotRef.totalVotes = 0;
    $('#reset-votes-modal').modal('hide');
  };

  $s.deleteVote = function (voteId) {
    deleteThis(
      {
        voteId: voteId,
        createdBy: $s.user.id,
        shortcode: $s.shortcode,
        username: $s.user.name
      },
      'vote'
    );
  };

  $s.voteNow = function () {
    $s.congrats = false;
    $s.originalCandidates = $s.entries;
    $s.resetCandidates();
  };

  $s.showResults = function () {
    $s.thanks = true;
    $s.final = true;
    $s.getResults();
  };

  $s.submitShortcode = function () {
    $s.errors.shortcode = null;
    if ($s.patchRcvis) {
      setTimeout($s.getResults, 1);
    } else if ($s.activeLink == 'results') {
      setTimeout($s.getResults, 500);
    } else {
      $s.getCandidates();
    }
  };

  $s.submitCreateGraph = function () {
    if (confirm('Cutoff Voting?\nDo not proceed unless all voting is complete.')) {
      var key = $s.shortcode || $s.ballot.key;
      $http.get('/api/create-graph.php?key=' + key).then(function () {
        var cacheTime = Math.random().toString().slice(-4);
        window.location = '/results?t=' + cacheTime + '#' + key;
      });
    }
  };

  $s.addEntry = function () {
    if (!$s.entryInput.length) {
      if ($s.errorEntry && $s.entries.length >= 2) {
        $s.submitEntries();
        return;
      }
      $s.errorEntry = 'Entries must not be blank.' + ($s.entries.length >= 2 ? ' Press ENTER again to Submit All Entries.' : '');
    } else if ($s.entries.indexOf($s.entryInput) !== -1) {
      $s.errorEntry = 'No duplicate entries allowed';
    } else if ($s.entryInput.indexOf('"') !== -1) {
      $s.errorEntry = 'Entry may not contain the double-quote (") symbol';
    } else {
      $s.errorEntry = '';
      $s.entries.push($s.entryInput);
      $s.images.push('');
      $s.hyperlinks.push('');
      $s.entryColors.push('');
      if ($s.entryIds) $s.entryIds.push(null);
      $s.entryInput = '';
    }
  };
}
