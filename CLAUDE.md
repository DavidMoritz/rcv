# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Ranked Choice Voting (RCV) calculator web application hosted at rankedchoices.com. It allows users to create ballots, vote using ranked choice methods, and view results calculated using RCV algorithms. The project is free to use and open source.

## Tech Stack

- **Frontend**: AngularJS 1.5 (single-page application)
- **Backend**: PHP with MySQL database
- **Build System**: Vite (recently modernized from Grunt)
- **UI Framework**: Bootstrap 3 with Angular UI Bootstrap
- **Key Libraries**: jQuery, lodash, moment.js, jQuery UI (for drag-and-drop voting)

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (frontend only, port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview

# Start PHP backend (required for API calls during development)
cd src && php -S localhost:8000

# Alternative: Use Docker Compose for full stack
docker-compose up
```

## Architecture

### Frontend Architecture

The app is a **single-page AngularJS application** with client-side routing (HTML5 mode enabled). The entire UI is contained in `src/index.html` with conditional `ng-show` directives for different views:
- `/home` - Landing page
- `/create` - Ballot creation
- `/vote` - Voting interface
- `/results` - Results display
- `/register` - User registration/login
- `/profile` - User's ballot management

**Key characteristic**: All UI is inline HTML in index.html, not separate templates. The main controller (`MainCtrl`) in `src/js/main.js` manages all application state and view logic.

### Build System (Vite)

The project uses a **hybrid loading strategy**:
- **CDN-loaded** (in index.html): jQuery, Angular, lodash, moment, Bootstrap - loaded as script tags to make them available on `window` before the app initializes
- **Bundled** (via Vite): Application code (`js/app.js`, `js/main.js`), Angular plugins (ui-sortable, ng-pattern-restrict)
- **Static copied**: PHP API files, fonts, images, timezone-picker.js

Build output goes to `dist/` directory. The vite config (`vite.config.js`) uses `viteStaticCopy` plugin to copy non-bundled assets.

### Backend Architecture

PHP backend in `src/api/` directory. All API endpoints:
- Accept JSON POST data via `php://input`
- Return JSON responses with `$data` and `$errors` keys
- Use PDO for database access
- No authentication framework - uses simple cookie-based sessions

**Database connection**: Configure in `src/api/config.php` (copy from `config_sample.php`). For Docker, set SERVER to `'db:3306'`.

### Database Schema

MySQL database with 4 main tables:
- `ballots` - Ballot metadata (name, key/shortcode, positions, settings, timestamps)
- `entries` - Candidates/choices for each ballot
- `votes` - Individual votes (stores serialized ranking data)
- `users` - User accounts (supports Google/Facebook OAuth and local accounts)

Schema in `Schema.sql`. Important: Production database (`public_html/` folder) may have different schema than `Schema.sql` - see seed data scripts for current production structure.

## Development Workflow

### Local Development Setup

1. Create `src/api/config.php` from `src/api/config_sample.php`
2. Set up MySQL database using `Schema.sql`
3. Run `npm install`
4. Start two terminals:
   - Terminal 1: `npm run dev` (frontend dev server on port 3000)
   - Terminal 2: `cd src && php -S localhost:8000` (PHP backend)
5. The Vite dev server proxies `/api` requests to `localhost:8000`

### Docker Development

Alternatively, use Docker Compose which sets up both frontend and MySQL:
- Ensure `src/api/config.php` has SERVER set to `'db:3306'`
- Run `docker-compose up`
- Access at `localhost:1337`

### Production vs Development Code Split

**Important context**: This repo was historically far removed from production. The `public_html/` folder contains what's currently in production and may have features/fixes not in `src/`. Recent work has modernized the build system to bridge this gap.

## Key Files

- `src/index.html` - Entire single-page app UI
- `src/js/main.js` - Main AngularJS controller with all application logic (~2000+ lines)
- `src/js/app.js` - Angular module definition and configuration
- `src/main-entry.js` - Vite entry point (imports app code and bundled dependencies)
- `vite.config.js` - Build configuration with proxy setup
- `src/api/config.php` - Database credentials (gitignored, copy from sample)
- `Schema.sql` - Database schema

## API Patterns

PHP API files follow this pattern:
```php
<?php
require_once("config.php");
$_POST = json_decode(file_get_contents('php://input'), true);

// Validate inputs, populate $errors array
if (empty($_POST['field'])) {
    $errors['field'] = 'Error message';
}

// If no errors, execute database operations
if (empty($errors)) {
    // PDO queries using $dbh from config.php
    $data['success'] = true;
}

echo json_encode(['data' => $data, 'errors' => $errors]);
```

## Special Features

- **RCVis Integration**: Optional visual results display from rcvis.com (requires voting cutoff time)
- **Voter Registration Modes**: Optional, Required, Anonymous, or Code-based
- **Multi-seat Elections**: Supports electing multiple positions with vote transfer logic
- **Tie-Breaking**: Random (official) or Weighted (considers subsequent choices)
- **Secure Elections**: Support for voter code validation (see `secure-elections-instructions.html`)

## Notes for AI Assistants

- The AngularJS controller uses older patterns (not components) - all logic is in `MainCtrl` controller function
- Database queries use prepared statements via PDO, not raw SQL
- Frontend state management is via AngularJS scope, no Redux/state library
- The app uses HTML5 pushState routing but serves everything from index.html
- QR code generation uses qrcodejs library loaded from CDN
