# RCV - Ranked Choice Voting

### [RankedChoices.com](https://rankedchoices.com)

This Ranked Choice Voting app is free to use, free to improve, and free to share with the general public!

Here are a few advantages to RCV:

- Better representation
- No “Settling”
- No wasted votes
- Vote by preference
- Great for multi-seat elections
- Easy to use

For a short, 1-minute explanation of RCV; check out this video: <https://youtu.be/oHRPMJmzBBw>

[![RCV video](https://img.youtube.com/vi/oHRPMJmzBBw/0.jpg)](https://youtu.be/oHRPMJmzBBw)

Ranked Choice voting is about representing the people in the best way possible. The key is allowing the voter to choose more than just their favorite candidate. The problem with only voting for one choice, is that if that choice does not come in first or second, it could be considered a “wasted vote.” Therefore, people are more likely to vote for their second or third choice on the idea that it has a higher chance of winning and it’s better than their last choice.

With Ranked Choice Voting, there is no issue with voting for your first choice first, second choice second, and third choice third. Because if your first choice doesn’t win, then your vote automatically gets transferred to your second choice! And that is the beauty of the system.

Another thing it works really well for voting for more than one position. Everyone’s vote is still counted as one vote, but if their first choice is elected, then a portion of their vote goes to second place. To better illustrate this point, there is a video that describes the use of ranked choice voting in the Animal Kingdom:

Click here to watch <https://youtu.be/l8XOZJkozfI>

[![STV animal video](https://img.youtube.com/vi/l8XOZJkozfI/0.jpg)](https://youtu.be/l8XOZJkozfI)

## Tech Stack

This project uses:

- **Frontend**: AngularJS 1.5, Bootstrap 3, jQuery
- **Backend**: PHP with MySQL database
- **Build Tool**: Vite (modern ES modules bundler)
- **Package Manager**: npm

## Development Setup

### Quick Start: Verify Your Environment

**Before starting**, run the verification script to check your environment:

```bash
bash verify-setup.sh
```

This will automatically check:

- ✓ Required tools (Node.js, npm, PHP, MySQL)
- ✓ Service status (MySQL running)
- ✓ Port availability (3000, 2461)
- ✓ Project files (config.php, node_modules)
- ✓ Database connection

The script will tell you exactly what's missing and how to fix it.

### Prerequisites

- Node.js 18+ (for running the development server)
- PHP 7.4+ (for the backend API)
- MySQL 5.6+ (for the database)

#### Installing Prerequisites

**macOS:**

```bash
brew install node php mysql
brew services start mysql
```

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install nodejs npm php php-mysql mysql-server
sudo systemctl start mysql
```

**Windows:**

- Node.js: [nodejs.org/download](https://nodejs.org/en/download/)
- PHP: [windows.php.net](https://windows.php.net/download/)
- MySQL: [dev.mysql.com/downloads/installer](https://dev.mysql.com/downloads/installer/)

**Other systems:** See [Node.js](https://nodejs.org/), [PHP](https://www.php.net/manual/en/install.php), and [MySQL](https://dev.mysql.com/doc/mysql-installation-excerpt/en/) official installation guides.

### Local Development (Recommended)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the database**

   ```bash
   cp src/api/config_sample.php src/api/config.php
   ```

   Then edit `src/api/config.php` and input your MySQL credentials:

   ```php
   define('SERVER', 'localhost:3306');
   define('USERNAME', 'your_username');
   define('PASSWORD', 'your_password');
   define('DB', 'rcv_db');
   ```

3. **Set up the database**

   Run the production schema script (creates database, user, and tables):

   ```bash
   mysql -u root -p < src/api/setup-database-prod.sql
   ```

   For detailed setup instructions and test data, see [src/api/SETUP.md](src/api/SETUP.md)

4. **Start the development servers**

   You need to run two servers simultaneously (use two terminal windows):

   **Terminal 1 - Frontend (Vite dev server):**

   ```bash
   npm run dev
   ```

   This starts the frontend at `http://localhost:2460`

   **Terminal 2 - Backend (PHP server):**

   ```bash
   cd src
   php -S localhost:2461
   ```

   This starts the API backend at `http://localhost:2461`

5. **Open your browser**

   Navigate to `http://localhost:2460`

   The Vite dev server automatically proxies API requests from `/api` to the PHP backend.

### Production Build

To build the project for production:

```bash
npm run build
```

This creates a `dist/` folder with all compiled assets. To test the production build locally:

```bash
npm run preview
```

Or serve the `dist/` folder with PHP:

```bash
cd dist
php -S localhost:8080
```

### Deployment

The `dist/` folder is production-ready. There are two ways to deploy:

**Automated (recommended):**

```bash
./deploy.sh
```

This builds the project and rsyncs `dist/` to the production server over SSH. Requires `.deploy-config` (gitignored) with your SFTP/SSH credentials — copy from the template and fill in host, username, SSH key path, and port.

**Manual:**

Upload the contents of `dist/` directly to your web host's document root (e.g. `public_html/`). It includes the compiled frontend assets, PHP API files, fonts, images, and static pages — everything needed to run the site.

## Project Structure

```
rcv/
├── src/                    # Source code
│   ├── index.html         # Main single-page application
│   ├── main-entry.js      # Vite entry point
│   ├── js/
│   │   ├── app.js         # Angular module definition
│   │   ├── main.js        # Main controller and view logic
│   │   ├── auth.js        # Authentication (login, registration, OAuth)
│   │   └── ballot.js      # Ballot CRUD, voting, results
│   ├── pages/             # HTML partials (vote, create, results, etc.)
│   ├── api/               # PHP backend API endpoints
│   │   ├── config.php     # Database configuration (create from sample)
│   │   └── *.php          # API endpoints (40+)
│   ├── inc/               # Stylesheets and static JS
│   ├── img/               # Images
│   └── fonts/             # Font files
├── test/                   # Test suites
│   ├── *.test.js          # Frontend unit tests (Vitest)
│   └── php/               # PHP API tests (PHPUnit + SQLite)
├── dist/                   # Production build output
├── vite.config.js         # Vite build configuration
└── package.json           # Dependencies and scripts
```

## Key Features

- **Ballot Creation**: Create custom RCV ballots with multiple candidates
- **Flexible Voting**: Drag-and-drop interface for ranking candidates
- **Multiple Election Types**: Single or multi-seat elections
- **Result Visualization**: Integration with [RCVis](https://rcvis.com/) for visual results
- **Voter Privacy Options**: Anonymous, optional, or required voter names
- **Secure Elections**: Support for voter code validation
- **User Accounts**: Manage multiple ballots with registration

## Contributing

Contributions are welcome and encouraged! This project is fully open source and the codebase matches what's running in production. Jump in — report a bug, open a PR, or propose something new.

Before submitting a PR, please run the test suite:

```bash
npm test
```

This runs 115 automated tests (83 frontend via Vitest + 32 PHP API via PHPUnit) to make sure nothing breaks.

### Ideas for Contribution

- **Native mobile app** — A React Native, Flutter, or Swift/Kotlin app that uses the existing PHP API would be a huge win. Over half of all traffic is mobile, and a native app with the same backend would provide cross-platform compatibility out of the box.
- **Accessibility enhancements** — Screen reader support, keyboard navigation, ARIA labels
- **Additional voting methods** — STAR voting, Condorcet, etc. (see [#26](https://github.com/DavidMoritz/rcv/issues/26), [#18](https://github.com/DavidMoritz/rcv/issues/18))

For questions, reach out at [davidmoritz@gmail.com](mailto:davidmoritz@gmail.com).

## Troubleshooting

### First Step: Run the Verification Script

When encountering any issues, always start here:

```bash
bash verify-setup.sh
```

This will diagnose common problems and provide specific fix commands.

### Common Issues

**API requests failing with 404**

- Make sure the PHP backend is running on port 2461
- Check that `src/api/config.php` exists and has correct database credentials

**Database connection errors**

- Verify MySQL is running
- Check database credentials in `src/api/config.php`
- Follow the database setup guide: [src/api/SETUP.md](src/api/SETUP.md)

**Port already in use**

- Change the Vite port in `vite.config.js` (default: 3000)
- Change the PHP port: `php -S localhost:PORT` (default: 2461)

**Build errors**

- Delete `node_modules` and run `npm install` again
- Clear Vite cache: `rm -rf node_modules/.vite`

## Recent Modernizations

- **Grunt → Vite**: Modern build system with hot module replacement and optimized production builds
- **Modular codebase**: JS split into focused modules (auth, ballot, factories, utils)
- **HTML partials**: UI split from a single index.html into page-level partials
- **115 automated tests**: Frontend unit tests (Vitest) and PHP API integration tests (PHPUnit with SQLite)
- **Automated environment verification**: `verify-setup.sh` script for easier onboarding

## License

This project is open source and free to use. See [LICENSE](LICENSE) file for details.

## Support

If you find this app useful, consider [supporting the project](https://paypal.me/rankedchoices).

For questions or feedback, email [davidmoritz@gmail.com](mailto:davidmoritz@gmail.com).
