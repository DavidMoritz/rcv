-- RCV Test Data Seeds
-- Run after setup-database.sql: mysql -u rcv_user -p'rcv_password' rcv_db < seed-data.sql

USE rcv_db;

-- Clear existing data (careful - this deletes everything!)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE votes;
TRUNCATE TABLE entries;
TRUNCATE TABLE ballots;
TRUNCATE TABLE users;
TRUNCATE TABLE random_codes;
TRUNCATE TABLE contributions;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert Users
INSERT INTO users (id, username, email, password, created_at) VALUES
(1, 'admin', 'admin@rcv.local', 'admin123', NOW()),
(2, 'alice', 'alice@rcv.local', 'password123', NOW()),
(3, 'bob', 'bob@rcv.local', 'password123', NOW()),
(4, 'charlie', 'charlie@rcv.local', 'password123', NOW()),
(5, 'testuser', 'test@example.com', 'testpass123', NOW());

-- Insert Ballots
INSERT INTO ballots (id, name, timeCreated, `key`, positions, createdBy, resultsRelease, voteCutoff, requireSignIn, tieBreak, register, allowCustom, hideNames, hideDetails, showGraph, maxVotes) VALUES
(1, 'Best Pizza Flavor', NOW(), 'pizza', 1, 1, NULL, NULL, 0, 'random', 0, 0, 0, 0, 1, NULL),
(2, 'Favorite Programming Language', NOW(), 'codelang', 1, 2, NULL, NULL, 0, 'random', 0, 1, 0, 0, 1, NULL),
(3, 'City Council Election', NOW(), 'council2024', 3, 1, NULL, DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 'weighted', 1, 0, 1, 0, 1, NULL),
(4, 'Movie Night Pick', NOW(), 'movie', 1, 3, NULL, NULL, 0, 'random', 0, 0, 0, 0, 1, NULL),
(5, 'Best Coffee Shop', NOW(), 'coffee', 1, 2, DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 0, 'random', 0, 1, 0, 1, 1, 1);

-- Insert Entries (Candidates/Options)

-- Pizza ballot entries
INSERT INTO entries (ballotId, name, image, hyperlink) VALUES
(1, 'Pepperoni', '', ''),
(1, 'Margherita', '', ''),
(1, 'Hawaiian', '', ''),
(1, 'Meat Lovers', '', ''),
(1, 'Vegetarian', '', ''),
(1, 'BBQ Chicken', '', ''),
(1, 'Four Cheese', '', '');

-- Programming language entries
INSERT INTO entries (ballotId, name, image, hyperlink) VALUES
(2, 'JavaScript', '', 'https://javascript.com'),
(2, 'Python', '', 'https://python.org'),
(2, 'TypeScript', '', 'https://typescriptlang.org'),
(2, 'Ruby', '', 'https://ruby-lang.org'),
(2, 'Go', '', 'https://golang.org');

-- City council entries
INSERT INTO entries (ballotId, name, image, hyperlink) VALUES
(3, 'Jane Smith', 'https://via.placeholder.com/150', ''),
(3, 'John Davis', 'https://via.placeholder.com/150', ''),
(3, 'Maria Garcia', 'https://via.placeholder.com/150', ''),
(3, 'Robert Johnson', 'https://via.placeholder.com/150', ''),
(3, 'Lisa Chen', 'https://via.placeholder.com/150', ''),
(3, 'Michael Brown', 'https://via.placeholder.com/150', '');

-- Movie entries
INSERT INTO entries (ballotId, name, image, hyperlink) VALUES
(4, 'The Shawshank Redemption', '', ''),
(4, 'Inception', '', ''),
(4, 'Pulp Fiction', '', ''),
(4, 'The Matrix', '', ''),
(4, 'Forrest Gump', '', '');

-- Coffee shop entries
INSERT INTO entries (ballotId, name, image, hyperlink) VALUES
(5, 'Starbucks', '', ''),
(5, 'Peet\'s Coffee', '', ''),
(5, 'Blue Bottle', '', ''),
(5, 'Philz Coffee', '', '');

-- Insert Votes

-- Pizza votes (ballot 1)
INSERT INTO votes (ballotId, date_created, vote, voteIds, ipAddress, name) VALUES
(1, NOW(), 'Pepperoni,Margherita,Hawaiian,BBQ Chicken,Meat Lovers,Vegetarian,Four Cheese', '1,2,3,6,4,5,7', '192.168.1.100', 'voter001'),
(1, NOW(), 'Margherita,Vegetarian,Four Cheese,Pepperoni,Hawaiian', '2,5,7,1,3', '192.168.1.101', 'voter002'),
(1, NOW(), 'Meat Lovers,Pepperoni,BBQ Chicken,Margherita', '4,1,6,2', '192.168.1.102', 'voter003'),
(1, NOW(), 'Hawaiian,BBQ Chicken,Pepperoni', '3,6,1', '192.168.1.103', 'voter004'),
(1, NOW(), 'Pepperoni,Meat Lovers,Four Cheese,Margherita', '1,4,7,2', '192.168.1.104', 'voter005'),
(1, NOW(), 'Vegetarian,Margherita,Four Cheese,Hawaiian', '5,2,7,3', '192.168.1.105', 'voter006'),
(1, NOW(), 'BBQ Chicken,Pepperoni,Meat Lovers', '6,1,4', '192.168.1.106', 'voter007'),
(1, NOW(), 'Pepperoni,BBQ Chicken,Hawaiian,Margherita', '1,6,3,2', '192.168.1.107', 'voter008'),
(1, NOW(), 'Margherita,Pepperoni,Vegetarian', '2,1,5', '192.168.1.108', 'voter009'),
(1, NOW(), 'Four Cheese,Margherita,Pepperoni,Hawaiian', '7,2,1,3', '192.168.1.109', 'voter010');

-- Programming language votes (ballot 2)
INSERT INTO votes (ballotId, date_created, vote, voteIds, ipAddress, name) VALUES
(2, NOW(), 'Python,JavaScript,TypeScript,Go', '9,8,10,12', '192.168.1.110', 'coder001'),
(2, NOW(), 'TypeScript,JavaScript,Python', '10,8,9', '192.168.1.111', 'coder002'),
(2, NOW(), 'JavaScript,TypeScript,Ruby,Python', '8,10,11,9', '192.168.1.112', 'coder003'),
(2, NOW(), 'Go,Python,TypeScript', '12,9,10', '192.168.1.113', 'coder004'),
(2, NOW(), 'Python,Go,JavaScript', '9,12,8', '192.168.1.114', 'coder005');

-- City council votes (ballot 3) - with voter names for secure election
INSERT INTO votes (ballotId, date_created, vote, voteIds, ipAddress, name) VALUES
(3, NOW(), 'Jane Smith,Maria Garcia,Lisa Chen,Robert Johnson', '13,15,17,16', '192.168.1.120', 'ABC123'),
(3, NOW(), 'Maria Garcia,Jane Smith,Lisa Chen,John Davis', '15,13,17,14', '192.168.1.121', 'DEF456'),
(3, NOW(), 'Lisa Chen,Maria Garcia,Jane Smith', '17,15,13', '192.168.1.122', 'GHI789'),
(3, NOW(), 'Jane Smith,Lisa Chen,Maria Garcia,Michael Brown', '13,17,15,18', '192.168.1.123', 'JKL012');

-- Movie votes (ballot 4)
INSERT INTO votes (ballotId, date_created, vote, voteIds, ipAddress, name) VALUES
(4, NOW(), 'The Matrix,Inception,Pulp Fiction', '22,20,21', '192.168.1.130', 'movie_fan1'),
(4, NOW(), 'Inception,The Matrix,The Shawshank Redemption', '20,22,19', '192.168.1.131', 'movie_fan2'),
(4, NOW(), 'The Shawshank Redemption,Forrest Gump,Inception', '19,23,20', '192.168.1.132', 'movie_fan3');

-- Coffee votes (ballot 5) - maxVotes=1 (only one choice)
INSERT INTO votes (ballotId, date_created, vote, voteIds, ipAddress, name) VALUES
(5, NOW(), 'Blue Bottle', '26', '192.168.1.140', ''),
(5, NOW(), 'Philz Coffee', '27', '192.168.1.141', ''),
(5, NOW(), 'Blue Bottle', '26', '192.168.1.142', '');

-- Insert Random Codes (for secure voting)
INSERT INTO random_codes (code, created_at) VALUES
('ABC123', NOW()),
('DEF456', NOW()),
('GHI789', NOW()),
('JKL012', NOW()),
('MNO345', NOW()),
('PQR678', NOW()),
('STU901', NOW()),
('VWX234', NOW()),
('YZA567', NOW()),
('BCD890', NOW());

-- Insert Contributions (donations)
INSERT INTO contributions (name, message, value, date) VALUES
('Alice Johnson', 'Great tool! Keep up the good work!', 25.00, '2025-12-01'),
('Bob Smith', 'Thanks for making voting easy', 50.00, '2025-12-15'),
('Anonymous', NULL, 10.00, '2026-01-05'),
('Charlie Davis', 'Love the ranked choice feature!', 100.00, '2026-01-12'),
('Diana Lee', 'Supporting open democracy', 75.00, '2026-01-20'),
('Ethan Martinez', NULL, 15.00, '2026-01-28'),
('Fiona O\'Brien', 'This made our election so much better', 30.00, '2026-02-01'),
('Greg Thompson', NULL, 20.00, '2026-02-03');

-- Success message
SELECT 'Seed data inserted successfully!' AS message;
SELECT '---' AS separator;
SELECT 'Users: 5' AS summary UNION ALL
SELECT 'Ballots: 5' UNION ALL
SELECT 'Entries: 27' UNION ALL
SELECT 'Votes: 25' UNION ALL
SELECT 'Random Codes: 10' UNION ALL
SELECT 'Contributions: 8';
