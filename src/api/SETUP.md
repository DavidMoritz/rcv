# Local Development Database Setup

This guide will help you set up a local MySQL database for the RCV (Ranked Choice Voting) application.

## Prerequisites

- MySQL installed and running on your machine
- Access to MySQL root user (or another admin user)

## Quick Setup

The fastest way to set up your database is to run the production schema script:

```bash
mysql -u root -p < src/api/setup-database-prod.sql
```

This will:
- Create the `rcv_db` database
- Create the `rcv_user` with password `rcv_password`
- Grant necessary privileges
- Create all tables matching the production schema

**That's it!** Skip to the [Verify Setup](#verify-setup) section below.

## Manual Setup (Alternative)

If you prefer to set up step-by-step or need to customize the process:

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

### 5. Create Tables

```sql
USE rcv_db;
SOURCE src/api/setup-database-prod.sql;
```

Or manually run the table creation commands from `setup-database-prod.sql`.

### 6. Exit MySQL

```sql
EXIT;
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

## Create Config File

Copy the sample config and use it as-is (it already has the correct credentials):

```bash
cp src/api/config_sample.php src/api/config.php
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

## Test Data (Optional but Recommended)

Load seed data for testing:

```bash
mysql -u rcv_user -p'rcv_password' rcv_db < src/api/seed-data.sql
```

This will populate the database with:
- **5 users** (admin, alice, bob, charlie, testuser)
- **5 ballots** including pizza, programming languages, city council, movies, and coffee
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

### Quick Test Ballots

Try these ballot keys to see the app in action:

- Visit: `http://localhost:3000/?key=pizza` - 🍕 Best Pizza Flavor
- Visit: `http://localhost:3000/?key=codelang` - 💻 Programming Languages
- Visit: `http://localhost:3000/?key=council2024` - 🏛️ City Council Election

## Troubleshooting

### "Access denied for user 'rcv_user'"

Make sure you ran the GRANT command and FLUSH PRIVILEGES.

### "Unknown database 'rcv_db'"

Make sure you created the database with CREATE DATABASE.

### "Table doesn't exist" errors

Make sure you ran the `setup-database-prod.sql` script to create all tables.

### Connection Issues

Verify MySQL is running:

```bash
mysqladmin -u root -p status
```

Or check service status:

```bash
# macOS
brew services list | grep mysql

# Linux
systemctl status mysql
```

## Database Schema Reference

The complete schema is maintained in `setup-database-prod.sql`, which is synchronized with production. Key tables:

- **ballots** - Ballot metadata, configuration, and settings
- **entries** - Candidates/choices for each ballot
- **votes** - Individual votes with rankings
- **users** - User accounts (supports OAuth and local auth)
- **random_codes** - Voter verification codes
- **contributions** - Donation/contribution records

## Production Notes

**IMPORTANT:** These credentials are for local development only!

For production:
- Use strong, unique passwords
- Create a separate production `config.php` (NOT in version control)
- The `config.php` file is gitignored for security
- Never commit database credentials to git

## Next Steps

Once the database is set up:

1. Run `npm install` to install dependencies
2. Run `npm run dev` to start the Vite dev server
3. In another terminal, run `cd src && php -S localhost:8000` for the PHP backend
4. Visit `http://localhost:3000`
5. Create an account and test ballot creation
