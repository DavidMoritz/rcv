<?php
/**
 * auto_prepend_file for PHPUnit subprocess API calls.
 *
 * Sets up:
 * - SQLite $dbh connection (from env RCV_TEST_DB)
 * - Custom SQLite functions (NOW, RAND)
 * - php://input stream wrapper (so endpoints can read POST data from stdin)
 * - $_GET from env TEST_GET_PARAMS
 * - PHPUNIT_RUNNING constant
 */

// Suppress deprecation warnings (PHP 8.5 PDO changes, etc.)
error_reporting(E_ALL & ~E_DEPRECATED);

define('PHPUNIT_RUNNING', true);

require_once __DIR__ . '/TestPDO.php';

// Connect to the shared SQLite database file
$dbPath = getenv('RCV_TEST_DB');
if (!$dbPath) {
    fwrite(STDERR, "RCV_TEST_DB environment variable not set\n");
    exit(1);
}

$innerPdo = new PDO("sqlite:$dbPath");
$innerPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Register SQLite functions for MySQL compatibility
// Use modern Pdo\Sqlite API if available (PHP 8.4+), otherwise fall back
if ($innerPdo instanceof Pdo\Sqlite) {
    $innerPdo->createFunction('NOW', function () {
        return date('Y-m-d H:i:s');
    }, 0);
    $innerPdo->createFunction('UTC_TIMESTAMP', function () {
        return gmdate('Y-m-d H:i:s');
    }, 0);
    $innerPdo->createFunction('RAND', function () {
        return mt_rand() / mt_getrandmax();
    }, 0);
} else {
    $innerPdo->sqliteCreateFunction('NOW', function () {
        return date('Y-m-d H:i:s');
    }, 0);
    $innerPdo->sqliteCreateFunction('UTC_TIMESTAMP', function () {
        return gmdate('Y-m-d H:i:s');
    }, 0);
    $innerPdo->sqliteCreateFunction('RAND', function () {
        return mt_rand() / mt_getrandmax();
    }, 0);
}

// Wrap in TestPDO to intercept SET statements and DATE_SUB
$dbh = new TestPDO($innerPdo);

// ── Make php://input available for endpoints ──
// In CLI mode, php://input is empty. Endpoints read POST data via
// file_get_contents('php://input'). We read stdin once and register
// a custom stream wrapper so php://input returns the saved data.
$_rcvTestInput = file_get_contents('php://stdin');

class RcvTestPhpStream {
    private static string $inputData = '';
    private int $position = 0;
    private bool $isInput = false;
    /** @var resource|null */
    private $innerHandle = null;
    /** @var resource|null */
    public $context;

    public static function setInput(string $data): void {
        self::$inputData = $data;
    }

    public function stream_open(string $path, string $mode, int $options, ?string &$opened_path): bool {
        $type = substr($path, strlen('php://'));

        if ($type === 'input') {
            $this->isInput = true;
            $this->position = 0;
            return true;
        }

        // For all other php:// streams, delegate to the built-in wrapper
        stream_wrapper_restore('php');
        $this->innerHandle = @fopen($path, $mode);
        stream_wrapper_unregister('php');
        stream_wrapper_register('php', self::class);

        return $this->innerHandle !== false;
    }

    public function stream_read(int $count): string|false {
        if ($this->isInput) {
            $ret = substr(self::$inputData, $this->position, $count);
            $this->position += strlen($ret);
            return $ret;
        }
        return fread($this->innerHandle, $count);
    }

    public function stream_write(string $data): int {
        if ($this->isInput) {
            return 0;
        }
        return fwrite($this->innerHandle, $data);
    }

    public function stream_eof(): bool {
        if ($this->isInput) {
            return $this->position >= strlen(self::$inputData);
        }
        return feof($this->innerHandle);
    }

    public function stream_stat(): array|false {
        if ($this->isInput) {
            return [
                'size' => strlen(self::$inputData),
            ];
        }
        if ($this->innerHandle) {
            return fstat($this->innerHandle);
        }
        return false;
    }

    public function stream_close(): void {
        if (!$this->isInput && $this->innerHandle) {
            fclose($this->innerHandle);
        }
    }

    public function stream_flush(): bool {
        if ($this->isInput) {
            return true;
        }
        if ($this->innerHandle) {
            return fflush($this->innerHandle);
        }
        return true;
    }

    public function stream_set_option(int $option, int $arg1, int $arg2): bool {
        return false;
    }
}

RcvTestPhpStream::setInput($_rcvTestInput);
stream_wrapper_unregister('php');
stream_wrapper_register('php', 'RcvTestPhpStream');

// Parse env → $_GET
$getParams = getenv('TEST_GET_PARAMS');
if ($getParams) {
    parse_str($getParams, $_GET);
}

// Set a fake IP address
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
