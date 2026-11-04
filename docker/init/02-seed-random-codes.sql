-- Seed the random_codes table with 30,000 unique 6-character codes.
-- Character set: uppercase letters + digits, excluding ambiguous chars (0, 1, I, O).
-- This runs automatically on fresh Docker installs after 01-schema.sql.

USE rcv_db;

DELIMITER $$

CREATE PROCEDURE seed_random_codes()
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE new_code VARCHAR(6);
    DECLARE j INT;
    DECLARE chars VARCHAR(31) DEFAULT 'ABCDEFGHJKLMNPQRSTUVWXYZ2345679';

    WHILE i < 30000 DO
        SET new_code = '';
        SET j = 0;
        WHILE j < 6 DO
            SET new_code = CONCAT(new_code, SUBSTRING(chars, FLOOR(1 + RAND() * 31), 1));
            SET j = j + 1;
        END WHILE;

        INSERT IGNORE INTO random_codes (code) VALUES (new_code);

        IF ROW_COUNT() > 0 THEN
            SET i = i + 1;
        END IF;
    END WHILE;
END$$

DELIMITER ;

CALL seed_random_codes();
DROP PROCEDURE seed_random_codes;

SELECT COUNT(*) AS codes_seeded FROM random_codes;
