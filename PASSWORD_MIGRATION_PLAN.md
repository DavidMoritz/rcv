# Password Hashing Migration Plan

## Current State

The application currently uses **client-side password hashing** with a custom implementation:
- Password is hashed on the client using `.hashCode()` with a salt: `"My RCV salt"`
- Hash is sent to the server and stored in the database
- Location: `src/js/main.js:472`

## Security Issues with Current Approach

1. **Hash = Password**: The hash effectively becomes the password. If intercepted, it can be replayed to authenticate.
2. **Weak Algorithm**: `hashCode()` is not a cryptographic hash function - it's designed for hash tables, not security.
3. **No Per-User Salt**: All users share the same salt, making rainbow table attacks easier.
4. **Vulnerable to Interception**: Even with HTTPS, if someone gains access to the database, they can authenticate as any user.

## Recommended Target State

**Backend password hashing** using industry-standard algorithms:
- Use **bcrypt** (recommended) or **Argon2** (newer, more secure)
- Hash passwords server-side with automatic per-user salting
- Transport plaintext passwords over HTTPS only
- Store only the secure hash in the database

## Migration Strategy: Gradual Migration

This approach allows users to migrate to secure hashing as they log in, without forcing password resets.

### Phase 1: Add New Password Field

1. **Database Changes**:
   ```sql
   ALTER TABLE users ADD COLUMN password_bcrypt VARCHAR(255) NULL;
   ALTER TABLE users ADD COLUMN migrated BOOLEAN DEFAULT FALSE;
   ```

2. **Add bcrypt to PHP**:
   - Install bcrypt (built into PHP 5.5+)
   - No additional dependencies needed

### Phase 2: Update Login Flow

Modify the login process to detect and migrate users:

**File**: `src/api/login.php` (create or update)

```php
<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$username = $_POST['username'];
$password = $_POST['password'];
$isHashed = $_POST['isHashed'] ?? false;

// Fetch user
$query = "SELECT id, username, password, password_bcrypt, migrated FROM users WHERE username = ?";
$sth = $dbh->prepare($query);
$sth->execute([$username]);
$user = $sth->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// Check if user is migrated to bcrypt
if ($user['migrated']) {
    // Use bcrypt verification
    if (password_verify($password, $user['password_bcrypt'])) {
        echo json_encode(['success' => true, 'id' => $user['id'], 'username' => $user['username']]);
    } else {
        echo json_encode(['error' => 'Invalid credentials']);
    }
} else {
    // Old authentication: compare with legacy hash
    $legacyHash = ($password . "My RCV salt").hashCode(); // Implement hashCode in PHP

    if ($legacyHash == $user['password']) {
        // Successful login - migrate to bcrypt
        $newHash = password_hash($password, PASSWORD_BCRYPT);

        $updateQuery = "UPDATE users SET password_bcrypt = ?, migrated = TRUE WHERE id = ?";
        $updateSth = $dbh->prepare($updateQuery);
        $updateSth->execute([$newHash, $user['id']]);

        echo json_encode(['success' => true, 'id' => $user['id'], 'username' => $user['username'], 'migrated' => true]);
    } else {
        echo json_encode(['error' => 'Invalid credentials']);
    }
}
?>
```

### Phase 3: Update Frontend

**Two-stage frontend update**:

**Stage 1**: Keep sending hashed passwords but mark them
```javascript
// main.js - Update login function
$s.loginForm = function() {
  $http({
    method: 'POST',
    url: '/api/login.php',
    data: {
      username: $s.login.username,
      password: ($s.login.password + "My RCV salt").hashCode(),
      isHashed: true
    }
  }).then(function(response) {
    if (response.data.success) {
      setUser({
        id: response.data.id,
        name: response.data.username
      }, 'login');
    } else {
      alert('Login failed: ' + response.data.error);
    }
  });
}
```

**Stage 2**: After most users migrated, send plaintext
```javascript
// main.js - Updated login function
$s.loginForm = function() {
  $http({
    method: 'POST',
    url: '/api/login.php',
    data: {
      username: $s.login.username,
      password: $s.login.password // Send plaintext over HTTPS
    }
  }).then(function(response) {
    if (response.data.success) {
      setUser({
        id: response.data.id,
        name: response.data.username
      }, 'login');
    } else {
      alert('Login failed: ' + response.data.error);
    }
  });
}
```

### Phase 4: Update Registration

New users should use bcrypt from day one:

**File**: `src/api/add-user.php` (already updated for SQL injection, add this)

```php
// After line 4, add:
$password = $_POST['password'];
$isHashed = $_POST['isHashed'] ?? false;

// If password comes hashed from old clients, store in legacy field
// If plaintext, hash with bcrypt
if ($isHashed) {
    // Old client sending hashed password
    $passwordToStore = $password;
    $bcryptHash = null;
    $migrated = false;
} else {
    // New client sending plaintext - hash with bcrypt
    $bcryptHash = password_hash($password, PASSWORD_BCRYPT);
    $passwordToStore = null; // Don't store legacy hash
    $migrated = true;
}
```

### Phase 5: Cleanup (After 6-12 months)

Once >95% of users have migrated:

1. **Force migration** for remaining users:
   - Require password reset for unmigrated accounts
   - Send email notifications beforehand

2. **Remove legacy code**:
   ```sql
   ALTER TABLE users DROP COLUMN password;
   ALTER TABLE users DROP COLUMN migrated;
   ALTER TABLE users CHANGE password_bcrypt password VARCHAR(255) NOT NULL;
   ```

3. **Remove client-side hashing** from frontend

## Implementation Checklist

- [ ] Add `password_bcrypt` and `migrated` columns to users table
- [ ] Implement PHP `hashCode()` equivalent for legacy verification
- [ ] Create/update `login.php` with dual authentication logic
- [ ] Update `add-user.php` to use bcrypt for new users
- [ ] Test migration flow with test account
- [ ] Deploy backend changes
- [ ] Monitor migration progress
- [ ] Update frontend to send plaintext passwords (Stage 2)
- [ ] Force reset for unmigrated users after grace period
- [ ] Remove legacy authentication code
- [ ] Remove legacy database columns

## Notes

- **HTTPS Required**: Never send plaintext passwords without HTTPS
- **hashCode Implementation**: Need to implement JavaScript's `hashCode()` in PHP for legacy verification
- **Testing**: Test with both migrated and unmigrated accounts
- **Monitoring**: Track migration progress with SQL queries:
  ```sql
  SELECT
    COUNT(*) as total_users,
    SUM(migrated) as migrated_users,
    (SUM(migrated) / COUNT(*)) * 100 as migration_percentage
  FROM users;
  ```

## Alternative: Force Password Reset

If gradual migration is too complex, force all users to reset passwords:

**Pros**:
- Simpler implementation
- Immediate security improvement
- Clean codebase

**Cons**:
- Disruptive to users
- May lose inactive users
- Requires email system for resets

This approach would require implementing a password reset flow with email verification.
