# Local Development Database Setup

This guide will help you set up a local MySQL database for the RCV (Ranked Choice Voting) application.

## Prerequisites

- MySQL installed and running on your machine
- Access to MySQL root user (or another admin user)

## Database Credentials

The application uses these credentials (defined in `config_sample.php`):

```
Database: rcv_db
Username: rcv_user
Password: rcv_password
Host:     localhost:3306
```

## Setup Steps

### 1. Connect to MySQL as Root

```bash
mysql -u root -p
```

### 2. Create the Database

```sql
CREATE DATABASE IF NOT EXISTS rcv_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Create the User

```sql
CREATE USER 'rcv_user'@'localhost' IDENTIFIED BY 'rcv_password';
```

### 4. Grant Privileges

```sql
GRANT ALL PRIVILEGES ON rcv_db.* TO 'rcv_user'@'localhost';
FLUSH PRIVILEGES;
```

### 5. Switch to the Database

```sql
USE rcv_db;
```

### 6. Create Tables

#### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  image VARCHAR(500),
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Ballots Table
```sql
CREATE TABLE ballots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  timeCreated DATETIME NOT NULL,
  `key` VARCHAR(50) NOT NULL UNIQUE,
  positions INT NOT NULL DEFAULT 1,
  createdBy INT NOT NULL,
  resultsRelease DATETIME NULL,
  voteCutoff DATETIME NULL,
  requireSignIn TINYINT(1) DEFAULT 0,
  tieBreak VARCHAR(20) DEFAULT 'random',
  register TINYINT(1) DEFAULT 0,
  allowCustom TINYINT(1) DEFAULT 0,
  hideNames TINYINT(1) DEFAULT 0,
  hideDetails TINYINT(1) DEFAULT 0,
  showGraph TINYINT(1) DEFAULT 1,
  maxVotes INT NULL,
  rcvisId VARCHAR(100) NULL,
  rcvisSlug VARCHAR(255) NULL,
  graphUpdated DATETIME NULL,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_key (`key`),
  INDEX idx_createdBy (createdBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Entries Table (Candidates/Options for ballots)
```sql
CREATE TABLE entries (
  entry_id INT AUTO_INCREMENT PRIMARY KEY,
  ballotId INT NOT NULL,
  name VARCHAR(500) NOT NULL,
  image VARCHAR(500),
  hyperlink VARCHAR(500),
  color VARCHAR(7),
  FOREIGN KEY (ballotId) REFERENCES ballots(id) ON DELETE CASCADE,
  INDEX idx_ballotId (ballotId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Votes Table
```sql
CREATE TABLE votes (
  vote_id INT AUTO_INCREMENT PRIMARY KEY,
  ballotId INT NOT NULL,
  date_created DATETIME NOT NULL,
  vote TEXT NOT NULL,
  voteIds TEXT NOT NULL,
  ipAddress VARCHAR(45),
  name VARCHAR(255),
  FOREIGN KEY (ballotId) REFERENCES ballots(id) ON DELETE CASCADE,
  INDEX idx_ballotId (ballotId),
  INDEX idx_date_created (date_created)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Random Codes Table (For voter verification)
```sql
CREATE TABLE random_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Contributions Table (For donations/contributions)
```sql
CREATE TABLE contributions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) DEFAULT NULL,
  message TEXT,
  value FLOAT DEFAULT NULL,
  date DATE DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### 7. Exit MySQL

```sql
EXIT;
```

### 8. Create Local Config File

Copy the sample config and use it as-is (it already has the correct credentials):

```bash
cp config_sample.php config.php
```

The `config.php` file should contain:
```php
<?php
define('SERVER', 'localhost:3306');
define('USERNAME', 'rcv_user');
define('PASSWORD', 'rcv_password');
define('DB', 'rcv_db');

try {
  $dbh = new PDO('mysql:host=' . SERVER . ';dbname=' . DB, USERNAME, PASSWORD, array(PDO::ATTR_PERSISTENT => true));
} catch (PDOException $e) {
  die($e->getMessage());
}
?>
```

## Verify Setup

Test the connection:

```bash
mysql -u rcv_user -p'rcv_password' rcv_db -e "SHOW TABLES;"
```

You should see:
```
+------------------+
| Tables_in_rcv_db |
+------------------+
| ballots          |
| contributions    |
| entries          |
| random_codes     |
| users            |
| votes            |
+------------------+
```

## Test Data (Recommended)

### Load Complete Seed Data

We've provided a comprehensive seed file with realistic test data:

```bash
mysql -u rcv_user -p'rcv_password' rcv_db < seed-data.sql
```

This will populate all tables with:
- **5 users** (admin, alice, bob, charlie, testuser)
- **5 ballots** including:
  - 🍕 "Best Pizza Flavor" (code: `pizza`) - 7 pizza options, 10 votes
  - 💻 "Favorite Programming Language" (code: `codelang`) - 5 languages, 5 votes
  - 🏛️ "City Council Election" (code: `council2024`) - 6 candidates, 4 votes (multi-winner, secure voting)
  - 🎬 "Movie Night Pick" (code: `movie`) - 5 movies, 3 votes
  - ☕ "Best Coffee Shop" (code: `coffee`) - 4 shops, 3 votes (single-choice poll)
- **27 entries** (candidates/options across all ballots)
- **25 votes** (distributed across ballots)
- **10 random codes** (for secure voting verification)
- **8 contributions** (sample donation records)

### Login Credentials

All test users have simple passwords for development:
- **Username:** `admin` / **Password:** `admin123`
- **Username:** `alice` / **Password:** `password123`
- **Username:** `bob` / **Password:** `password123`
- **Username:** `charlie` / **Password:** `password123`
- **Username:** `testuser` / **Password:** `testpass123`

### Quick Test Ballot

The pizza ballot is ready to use:
- Visit: `http://localhost:8000/?key=pizza`
- Vote on your favorite pizza flavors!
- See live results with ranked choice calculation

## Troubleshooting

### "Access denied for user 'rcv_user'"

Make sure you ran the GRANT command and FLUSH PRIVILEGES.

### "Unknown database 'rcv_db'"

Make sure you created the database with CREATE DATABASE.

### Foreign Key Constraint Errors

Make sure you create tables in this order:
1. users (no dependencies)
2. ballots (depends on users)
3. entries (depends on ballots)
4. votes (depends on ballots)
5. random_codes (no dependencies)
6. contributions (no dependencies)

### Connection Issues

Verify MySQL is running:
```bash
mysqladmin -u root -p status
```

## Next Steps

Once the database is set up:

1. Build the project: `npm run build`
2. Start PHP server: `php -S localhost:8000 -t dist/`
3. Visit: http://localhost:8000
4. Create an account and test ballot creation

## Production Notes

**IMPORTANT:** These credentials are for local development only!

For production:
- Use strong, unique passwords
- Create a separate production `config.php` (NOT in version control)
- The `config.php` file is gitignored for security
- Never commit database credentials to git
