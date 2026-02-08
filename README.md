# RCV - Ranked Choice Voting
### [RankedChoices.com](https://rankedchoices.com)
This Ranked Choice Voting app is free to use, free to improve, and free to share with the general public!

Here are a few advantages to RCV:
* Better representation
* No “Settling”
* No wasted votes
* Vote by preference
* Great for multi-seat elections
* Easy to use

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

### Prerequisites

- Node.js (for running the development server)
- PHP 7.4+ (for the backend API)
- MySQL 5.6+ (for the database)

If you don't have PHP or MySQL installed, please review the [Ubuntu setup guide](https://github.com/DavidMoritz/rcv/blob/master/UBUNTU.md).

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
   ```bash
   mysql -u your_username -p < Schema.sql
   ```

4. **Start the development servers**

   You need to run two servers simultaneously (use two terminal windows):

   **Terminal 1 - Frontend (Vite dev server):**
   ```bash
   npm run dev
   ```
   This starts the frontend at `http://localhost:3000`

   **Terminal 2 - Backend (PHP server):**
   ```bash
   cd src
   php -S localhost:8000
   ```
   This starts the API backend at `http://localhost:8000`

5. **Open your browser**

   Navigate to `http://localhost:3000`

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

## Docker Development (Alternative)

Docker Compose provides a quick way to get the full stack running without manually installing PHP and MySQL.

1. **Configure the database for Docker**
   ```bash
   cp src/api/config_sample.php src/api/config.php
   ```

   Edit `src/api/config.php` with Docker-specific settings:
   ```php
   <?php
   define('SERVER', 'db:3306');
   define('USERNAME', 'root');
   define('PASSWORD', 'superSecretPassword');
   define('DB', 'rcv_db');

   try {
       $dbh = new PDO('mysql:host=' . SERVER . ';dbname=' . DB, USERNAME, PASSWORD, array(PDO::ATTR_PERSISTENT => true));
   } catch (PDOException $e) {
       die($e->getMessage());
   }
   ?>
   ```

2. **Install Docker and Docker Compose**

   [Follow the installation instructions for your OS](https://docs.docker.com/compose/install/)

3. **Start the application**
   ```bash
   docker-compose up
   ```

4. **Access the application**

   Navigate to `http://localhost:1337`

## Project Structure

```
rcv/
├── src/                    # Source code
│   ├── index.html         # Main single-page application
│   ├── main-entry.js      # Vite entry point
│   ├── js/
│   │   ├── app.js         # Angular module definition
│   │   └── main.js        # Main controller and application logic
│   ├── api/               # PHP backend API endpoints
│   │   ├── config.php     # Database configuration (create from sample)
│   │   └── *.php          # API endpoints
│   ├── css/               # Stylesheets (LESS files)
│   ├── img/               # Images
│   └── fonts/             # Font files
├── dist/                   # Production build output (generated)
├── public_html/           # Legacy production code (reference only)
├── vite.config.js         # Vite build configuration
├── Schema.sql             # Database schema
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

Contributions are welcome and appreciated! Here's how you can help:

- **Report bugs**: Open an issue describing the problem
- **Suggest features**: Share your ideas for improvements
- **Submit pull requests**: Fix bugs or add features
- **Improve documentation**: Help make the setup process clearer

**Note**: Please contact me at [davidmoritz@gmail.com](mailto:davidmoritz@gmail.com) before starting significant work to avoid duplicate efforts.

### Areas for Contribution

- User registration and ballot management features
- Mobile responsiveness improvements
- Accessibility enhancements
- Test coverage
- Modernization of AngularJS code

## Troubleshooting

### Common Issues

**API requests failing with 404**
- Make sure the PHP backend is running on port 8000
- Check that `src/api/config.php` exists and has correct database credentials

**Database connection errors**
- Verify MySQL is running
- Check database credentials in `src/api/config.php`
- Ensure the database exists (run `Schema.sql` to create it)

**Port already in use**
- Change the Vite port in `vite.config.js` (default: 3000)
- Change the PHP port: `php -S localhost:PORT` (default: 8000)

**Build errors**
- Delete `node_modules` and run `npm install` again
- Clear Vite cache: `rm -rf node_modules/.vite`

## Recent Modernizations

This project was recently updated with modern tooling:
- **Migration from Grunt to Vite**: Faster builds and better development experience
- **ES Module support**: Modern JavaScript module system
- **Hot Module Replacement**: Instant updates during development without full page reloads
- **Optimized builds**: Automatic code splitting and dependency optimization

The `src/` directory now represents the active development codebase. The `public_html/` folder contains legacy production code for reference.

## License

This project is open source and free to use. See [LICENSE](LICENSE) file for details.

## Support

If you find this app useful, consider [supporting the project](https://paypal.me/rankedchoices).

For questions or feedback, email [davidmoritz@gmail.com](mailto:davidmoritz@gmail.com).
