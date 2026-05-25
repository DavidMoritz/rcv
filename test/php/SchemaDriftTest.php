<?php

/**
 * Schema-drift guard.
 *
 * Asserts that `test/php/schema-sqlite.sql` (the PHPUnit fixture) stays
 * structurally in sync with `src/api/setup-database-prod.sql` (the production
 * MySQL schema) at the table-and-column-name level.
 *
 * Policy (v1):
 *   - The SQLite fixture MAY omit tables that exist in prod (subset OK — the
 *     fixture only needs tables the tests exercise).
 *   - The SQLite fixture MUST NOT contain tables that don't exist in prod.
 *   - For every table present in BOTH files, the set of column names must
 *     match exactly. No extras on either side.
 *   - Column TYPES are intentionally not compared in v1. `TestPDO` rewrites
 *     MySQL-isms at the query level, so type parity isn't required; only
 *     structural (name) parity is. Type-mapping can be a follow-up.
 *
 * Why this exists: schema drift between these two files can cause 
 * "passes in tests, breaks in prod" bugs. The two were maintained by
 * convention only until this test landed.
 */

use PHPUnit\Framework\TestCase;

class SchemaDriftTest extends TestCase
{
    private const PROD_SCHEMA_PATH = __DIR__ . '/../../src/api/setup-database-prod.sql';
    private const SQLITE_SCHEMA_PATH = __DIR__ . '/schema-sqlite.sql';

    /**
     * Tokens that introduce a table-level constraint or index rather than a
     * column. Lines inside `CREATE TABLE (...)` starting with one of these
     * (case-insensitive) are skipped when extracting column names.
     */
    private const CONSTRAINT_KEYWORDS = [
        'PRIMARY',
        'UNIQUE',
        'KEY',
        'INDEX',
        'FOREIGN',
        'CONSTRAINT',
        'CHECK',
        'FULLTEXT',
        'SPATIAL',
    ];

    public function testSqliteFixtureHasNoTablesMissingFromProd(): void
    {
        $prod = $this->parseSchema(self::PROD_SCHEMA_PATH);
        $sqlite = $this->parseSchema(self::SQLITE_SCHEMA_PATH);

        $extra = array_diff(array_keys($sqlite), array_keys($prod));

        $this->assertSame(
            [],
            array_values($extra),
            "SQLite fixture defines tables that don't exist in production schema: "
                . implode(', ', $extra)
                . ". Either remove from schema-sqlite.sql or add to setup-database-prod.sql."
        );
    }

    public function testColumnNamesMatchForSharedTables(): void
    {
        $prod = $this->parseSchema(self::PROD_SCHEMA_PATH);
        $sqlite = $this->parseSchema(self::SQLITE_SCHEMA_PATH);

        $mismatches = [];

        foreach ($sqlite as $table => $sqliteCols) {
            if (!isset($prod[$table])) {
                // Reported by the other test; skip here to keep messages focused.
                continue;
            }

            $prodCols = $prod[$table];

            $missingInSqlite = array_values(array_diff($prodCols, $sqliteCols));
            $extraInSqlite = array_values(array_diff($sqliteCols, $prodCols));

            if ($missingInSqlite || $extraInSqlite) {
                $parts = [];
                if ($missingInSqlite) {
                    $parts[] = 'missing in schema-sqlite.sql: ' . implode(', ', $missingInSqlite);
                }
                if ($extraInSqlite) {
                    $parts[] = 'extra in schema-sqlite.sql (not in prod): ' . implode(', ', $extraInSqlite);
                }
                $mismatches[] = "  Table `$table`: " . implode('; ', $parts);
            }
        }

        $this->assertSame(
            [],
            $mismatches,
            "Schema drift detected between src/api/setup-database-prod.sql and "
                . "test/php/schema-sqlite.sql:\n"
                . implode("\n", $mismatches)
                . "\nKeep both files in sync: when a column is added to one, add it to the other."
        );
    }

    /**
     * Tables we know exist in production today. Locked in so a parser bug
     * that silently drops a table (e.g. a CREATE TABLE form the regex doesn't
     * match) shows up as a loud failure here, instead of a quiet absence in
     * the drift check above. Update this list whenever a table is legitimately
     * added or removed in setup-database-prod.sql.
     */
    private const EXPECTED_PROD_TABLES = [
        'ballots',
        'contributions',
        'entries',
        'random_codes',
        'ballot_codes',
        'users',
        'votes',
        'voter_group_fields',
        'voter_group_options',
    ];

    public function testParserFindsExactExpectedProdTables(): void
    {
        $prod = $this->parseSchema(self::PROD_SCHEMA_PATH);

        $found = array_keys($prod);
        sort($found);
        $expected = self::EXPECTED_PROD_TABLES;
        sort($expected);

        $this->assertSame(
            $expected,
            $found,
            'Parser table list for production schema does not match the locked-in '
                . 'expected set. If a table was intentionally added or removed, update '
                . 'EXPECTED_PROD_TABLES. Otherwise, the parser regex is silently '
                . 'dropping or hallucinating a table.'
        );

        $this->assertNotEmpty(
            $this->parseSchema(self::SQLITE_SCHEMA_PATH),
            'Parser returned no tables for SQLite fixture — parser is broken.'
        );
    }

    public function testKnownConstraintKeywordColumnIsRecognised(): void
    {
        // Regression guard for a real bug: `ballots` has a column literally
        // named `key`, which collides with the `KEY` table-constraint
        // keyword. The parser must distinguish the two via backtick-quoting
        // so a future rename of this column is actually compared between
        // the two schemas instead of being silently dropped from both.
        $prod = $this->parseSchema(self::PROD_SCHEMA_PATH);
        $sqlite = $this->parseSchema(self::SQLITE_SCHEMA_PATH);

        $this->assertContains('key', $prod['ballots'] ?? [], 'Parser dropped `key` column from prod ballots table.');
        $this->assertContains('key', $sqlite['ballots'] ?? [], 'Parser dropped `key` column from sqlite ballots table.');
    }

    /**
     * Parse a SQL file and return ['table_name' => ['col1', 'col2', ...], ...].
     *
     * Deliberately minimal: both target files use a constrained `CREATE TABLE`
     * subset (one column per line, backtick-quoted or bare identifiers), so we
     * don't need a full SQL parser. If either file ever uses more exotic
     * syntax, `testParserFindsExactExpectedProdTables` should fail loudly.
     */
    private function parseSchema(string $path): array
    {
        $this->assertFileExists($path, "Schema file not found: $path");
        $sql = file_get_contents($path);

        // Strip single-line comments (-- and #) and /* ... */ block comments so
        // they can't confuse the parser. Both forms appear in the prod dump.
        $sql = preg_replace('!/\*.*?\*/!s', '', $sql);
        $sql = preg_replace('/^\s*(--|#).*$/m', '', $sql);

        $tables = [];

        // Match `CREATE TABLE [IF NOT EXISTS] <name> ( <body> )` with a
        // non-greedy body capture. The closing `)` must be followed by a
        // trailing clause that contains NO further parens and no semicolons
        // before the terminating `;` — this distinguishes the outer table
        // close from inner type parens like `varchar(64)`, since the inner
        // body always has more `(` (e.g. another `varchar(...)` or
        // `KEY name (...)`) before the next `;`. Trailing clauses like
        // `ENGINE=... DEFAULT CHARSET=... COLLATE=... COMMENT='...'` contain
        // no parens, so they match cleanly.
        if (!preg_match_all(
            '/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\((.*?)\)\s*[^();]*;/is',
            $sql,
            $matches,
            PREG_SET_ORDER
        )) {
            return $tables;
        }

        foreach ($matches as $m) {
            $tableName = $m[1];
            $body = $m[2];
            $tables[$tableName] = $this->extractColumns($body);
        }

        return $tables;
    }

    /**
     * Pull column names out of a `CREATE TABLE` body. Splits on top-level
     * commas (paren-aware), then skips lines that are table-level constraints.
     */
    private function extractColumns(string $body): array
    {
        $items = $this->splitTopLevel($body);
        $columns = [];

        foreach ($items as $item) {
            $item = trim($item);
            if ($item === '') {
                continue;
            }

            // A backticked first token is unambiguously a column name, even
            // if the identifier collides with a constraint keyword (e.g. the
            // real column `key` on `ballots`). Only unbacktick-quoted leading
            // tokens can be table-level constraints like `KEY name (...)` or
            // `UNIQUE KEY ...`.
            if (preg_match('/^`(\w+)`/', $item, $tok)) {
                $columns[] = $tok[1];
                continue;
            }

            if (!preg_match('/^(\w+)/', $item, $tok)) {
                continue;
            }
            $first = strtoupper($tok[1]);

            if (in_array($first, self::CONSTRAINT_KEYWORDS, true)) {
                continue;
            }

            $columns[] = $tok[1];
        }

        return $columns;
    }

    /**
     * Split a string on commas that are at paren-depth 0. Necessary because
     * column definitions can contain commas inside `(...)`, e.g. `decimal(10,2)`
     * or `UNIQUE KEY (a, b)`.
     */
    private function splitTopLevel(string $s): array
    {
        $parts = [];
        $depth = 0;
        $buf = '';
        $len = strlen($s);

        for ($i = 0; $i < $len; $i++) {
            $c = $s[$i];
            if ($c === '(') {
                $depth++;
            } elseif ($c === ')') {
                $depth--;
            }
            if ($c === ',' && $depth === 0) {
                $parts[] = $buf;
                $buf = '';
                continue;
            }
            $buf .= $c;
        }
        if ($buf !== '') {
            $parts[] = $buf;
        }

        return $parts;
    }
}
