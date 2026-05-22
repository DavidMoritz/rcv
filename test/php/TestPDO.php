<?php
/**
 * PDO wrapper that intercepts MySQL-specific statements for SQLite compatibility.
 *
 * Handles:
 * - SET time_zone / SET NAMES / etc → no-op
 * - DATE_SUB(...) → returns no results (safe fallback)
 */
class TestPDO extends PDO
{
    private PDO $inner;

    public function __construct(PDO $inner)
    {
        $this->inner = $inner;
    }

    public function prepare(string $query, array $options = []): PDOStatement|false
    {
        // Intercept SET statements (SET time_zone, SET NAMES, etc.)
        if (preg_match('/^\s*SET\s+/i', $query)) {
            return new NoopStatement();
        }

        // Rewrite ON DUPLICATE KEY UPDATE col=col (no-op upsert) → INSERT OR IGNORE.
        // Only fires when the no-op self-assignment form is present, so unrelated
        // INSERT statements still surface unique/PK violations as exceptions.
        if (preg_match('/\bON\s+DUPLICATE\s+KEY\s+UPDATE\s+(\w+)\s*=\s*\1\b/i', $query)) {
            $query = preg_replace('/\bINSERT\b/i', 'INSERT OR IGNORE', $query, 1);
            $query = preg_replace('/\s+ON\s+DUPLICATE\s+KEY\s+UPDATE\s+\w+\s*=\s*\w+/i', '', $query);
        }

        // Rewrite DATE_SUB(NOW()|UTC_TIMESTAMP(), INTERVAL ...) → datetime('now', '-...')
        $query = preg_replace_callback(
            '/DATE_SUB\s*\(\s*(?:NOW|UTC_TIMESTAMP)\(\)\s*,\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/i',
            function ($m) {
                $n = $m[1];
                $unit = strtolower($m[2]);
                // SQLite datetime modifier format
                $map = ['month' => 'months', 'day' => 'days', 'year' => 'years',
                        'hour' => 'hours', 'minute' => 'minutes', 'second' => 'seconds'];
                $u = $map[$unit] ?? $unit . 's';
                return "datetime('now', '-$n $u')";
            },
            $query
        );

        return $this->inner->prepare($query, $options);
    }

    public function exec(string $statement): int|false
    {
        if (preg_match('/^\s*SET\s+/i', $statement)) {
            return 0;
        }
        return $this->inner->exec($statement);
    }

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        return $this->inner->query($query, $fetchMode, ...$fetchModeArgs);
    }

    public function lastInsertId(?string $name = null): string|false
    {
        return $this->inner->lastInsertId($name);
    }

    public function beginTransaction(): bool
    {
        return $this->inner->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->inner->commit();
    }

    public function rollBack(): bool
    {
        return $this->inner->rollBack();
    }

    public function inTransaction(): bool
    {
        return $this->inner->inTransaction();
    }

    public function setAttribute(int $attribute, mixed $value): bool
    {
        return $this->inner->setAttribute($attribute, $value);
    }

    public function getAttribute(int $attribute): mixed
    {
        return $this->inner->getAttribute($attribute);
    }

    public function errorCode(): ?string
    {
        return $this->inner->errorCode();
    }

    public function errorInfo(): array
    {
        return $this->inner->errorInfo();
    }

    public function quote(string $string, int $type = PDO::PARAM_STR): string|false
    {
        return $this->inner->quote($string, $type);
    }

    /** Provide access to the raw SQLite PDO for direct test operations */
    public function getInner(): PDO
    {
        return $this->inner;
    }
}

/**
 * A no-op PDOStatement for intercepted queries (SET, etc.)
 */
class NoopStatement extends PDOStatement
{
    public function __construct()
    {
        // Intentionally empty — cannot call parent constructor
    }

    public function execute(?array $params = null): bool
    {
        return true;
    }

    public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed
    {
        return false;
    }

    public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array
    {
        return [];
    }

    public function bindValue(string|int $param, mixed $value, int $type = PDO::PARAM_STR): bool
    {
        return true;
    }

    public function bindParam(string|int $param, mixed &$var, int $type = PDO::PARAM_STR, int $maxLength = 0, mixed $driverOptions = null): bool
    {
        return true;
    }

    public function rowCount(): int
    {
        return 0;
    }

    public function closeCursor(): bool
    {
        return true;
    }
}
