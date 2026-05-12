import { setCookie } from './utils/cookies.js';
import { trickVote } from './utils/helpers.js';

var $s, $http, $loc, resetNav;

export function initAuth(scope, http, loc, resetNavFn) {
  $s = scope;
  $http = http;
  $loc = loc;
  resetNav = resetNavFn;

  $s.loginForm = function () {
    var payload = angular.copy($s.login);
    payload.password = (payload.password + 'My RCV salt').hashCode();
    $http({
      method: 'POST',
      url: '/api/login.php',
      data: payload
    }).then(
      function (resp) {
        if (typeof resp.data === 'string') {
          $s.loginError = true;
        } else {
          var loggedInUser = {
            id: resp.data[0].id,
            name: resp.data[0].username,
            email: resp.data[0].email,
            image: resp.data[0].image
          };
          if ($s.claimBallotAfterRegister) {
            var ballotId = $s.claimBallotAfterRegister;
            $s.claimBallotAfterRegister = null;
            $http
              .post('/api/claim-ballot.php', {
                ballotId: ballotId,
                userId: loggedInUser.id
              })
              .then(function () {
                setUser(loggedInUser, 'profile');
              });
          } else {
            setUser(loggedInUser, 'profile');
          }
          var cookieDays = $s.login.remember ? 30 : undefined;
          setCookie({ days: cookieDays, name: 'loginId', value: resp.data[0].id });
          setCookie({ days: cookieDays, name: 'loginName', value: resp.data[0].username });
        }
      },
      function () {
        $s.loginError = true;
      }
    );
  };

  $s.createNewAccount = function () {
    $http.get('/api/check-user.php?user=' + $s.newAccount.username).then(function (resp) {
      if (resp.data.length) {
        alert($s.newAccount.username + ' is already taken');
      } else {
        // Hash password on client (will be migrated to backend later)
        $s.newAccount.password = ($s.newAccount.password + 'My RCV salt').hashCode();
        // Don't send ID - server generates it
        $http({
          method: 'POST',
          url: '/api/add-user.php',
          data: $s.newAccount,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
          .then(function (response) {
            // Only log in user if registration succeeded
            if (response.data && response.data.id) {
              var newUser = {
                id: response.data.id,
                name: $s.newAccount.username
              };
              if ($s.claimBallotAfterRegister) {
                var ballotId = $s.claimBallotAfterRegister;
                $s.claimBallotAfterRegister = null;
                $http
                  .post('/api/claim-ballot.php', {
                    ballotId: ballotId,
                    userId: newUser.id
                  })
                  .then(function () {
                    setUser(newUser, 'profile');
                  });
              } else {
                setUser(newUser, 'create');
              }
            } else {
              alert('Registration failed: ' + (response.data.error || 'Unknown error'));
            }
          })
          .catch(function (error) {
            alert('Registration failed: ' + (error.statusText || 'Network error'));
          });
      }
    });
  };

  $s.signOut = function () {
    setCookie({ name: 'loginId', value: '', days: -1 });
    setCookie({ name: 'loginName', value: '', days: -1 });
    $s.user = {};
    resetNav();
    $s.navigate('home');
  };

  $s.validateZip = function () {
    $s.shortcode = $loc.$$search.key;
    $s.errors.zipCode = null;
    $s.ballot.voterName = '';

    if ($s.zipCode.replaceAll(/\D/g, '').length !== 5) {
      $s.errors.zipCode = 'You must enter a valid 5-digit zip code';

      return;
    }

    if (!$s.uniqueCodeValid) {
      $s.validateCode();

      return;
    }

    if ($s.partyAffiliation) {
      $s.ballot.voterName =
        $s.uniqueCode.toLowerCase() + '-' + $s.zipCode + '-' + $s.partyAffiliation;
    }
  };

  $s.validateCode = function () {
    if ($s.uniqueCode.length !== 6) {
      $s.errors.uniqueCode = 'You must enter a valid unique code';

      return;
    }

    if ($s.uniqueCode == trickVote) {
      $s.uniqueCodeValid = true;

      return;
    }

    const t = Date.now();

    $http
      .get('/api/validate-voter-code.php?code=' + $s.uniqueCode.toLowerCase() + '&t=' + t)
      .then(function (resp) {
        if (resp.data.length) {
          $s.uniqueCodeValid = true;

          if ($s.partyAffiliation) {
            $s.validateZip();
          }
        } else {
          $s.errors.uniqueCode = 'You must enter a valid unique code';
        }
      });
  };

  $s.validateSecureCode = function () {
    $s.errors.secureCode = null;
    var code = ($s.secure.voterCode || '')
      .trim()
      .toLowerCase()
      .replace(/0/g, 'o')
      .replace(/1/g, 'i');

    if (code.length < 6) {
      $s.errors.secureCode = 'Please enter a 6-character code';
      return;
    }

    $http
      .get(
        '/api/validate-voter-code.php?code=' +
          code +
          '&ballotId=' +
          $s.ballot.id +
          '&t=' +
          Date.now()
      )
      .then(function (resp) {
        if (resp.data && resp.data.valid) {
          $s.secureCodeValid = true;
          $s.ballot.voterName = code;
        } else {
          $s.errors.secureCode = 'This code is not valid';
        }
      });
  };

  $s.showDeleteAccount = function () {
    $s.deleteAccountConfirmation = '';
    $s.deleteAccountError = null;
    $s.deleteAccountLoading = false;
    $s.deleteAccountOAuthMode = false;
    $('#delete-account-modal').modal('show');
  };

  $s.deleteAccountSubmit = function () {
    $s.deleteAccountLoading = true;
    $s.deleteAccountError = null;

    var confirmation = $s.deleteAccountOAuthMode
      ? $s.deleteAccountConfirmation
      : ($s.deleteAccountConfirmation + 'My RCV salt').hashCode();

    $http({
      method: 'POST',
      url: '/api/delete-users.php',
      data: {
        userId: $s.user.id,
        username: $s.user.name,
        confirmation: String(confirmation)
      }
    }).then(
      function (resp) {
        if (resp.data && resp.data.data && resp.data.data.success) {
          $('#delete-account-modal').modal('hide');
          $s.signOut();
        } else {
          $s.deleteAccountLoading = false;
          var errors = resp.data && resp.data.errors;
          $s.deleteAccountError = (errors && (errors.confirmation || errors.user)) || 'Deletion failed';
        }
      },
      function () {
        $s.deleteAccountLoading = false;
        $s.deleteAccountError = 'An error occurred. Please try again.';
      }
    );
  };

  $s.updateUser = function (user, nav) {
    $s.user = user;
    $s.user.username = $s.user.username || $s.user.name;
    resetNav(true);

    if (nav) {
      $s.navigate(nav);
    } else {
      $http({
        method: 'POST',
        url: '/api/add-user.php',
        data: $s.user,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    }
  };
}
