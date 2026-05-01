-- SQLite-compatible schema adapted from src/api/setup-database-prod.sql

CREATE TABLE ballots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name varchar(64) NOT NULL,
  key varchar(255) NOT NULL DEFAULT '',
  positions varchar(10) NOT NULL,
  rcvisSlug varchar(255) DEFAULT NULL,
  rcvisId int DEFAULT NULL,
  createdBy varchar(64) NOT NULL,
  requireSignIn tinyint NOT NULL,
  maxVotes smallint DEFAULT 0,
  hideNames tinyint NOT NULL DEFAULT 0,
  hideDetails tinyint DEFAULT 0,
  tieBreak varchar(24) NOT NULL DEFAULT 'weighted',
  voteCutoff datetime NOT NULL,
  resultsRelease datetime NOT NULL,
  timeCreated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  register int DEFAULT 0,
  allowCustom tinyint NOT NULL DEFAULT 0,
  showGraph tinyint NOT NULL DEFAULT 0,
  graphUpdated datetime DEFAULT NULL,
  kickbackUrl varchar(2048) DEFAULT NULL,
  iframeUrl varchar(2048) DEFAULT NULL,
  oneDeviceOneVote tinyint NOT NULL DEFAULT 0,
  isSecure tinyint NOT NULL DEFAULT 0,
  UNIQUE (key)
);

CREATE TABLE contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name varchar(255) DEFAULT NULL,
  message text,
  value float DEFAULT NULL,
  date date DEFAULT NULL
);

CREATE TABLE entries (
  entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ballotId int NOT NULL,
  name varchar(256) NOT NULL DEFAULT '',
  image varchar(15600) NOT NULL DEFAULT '',
  color varchar(6) DEFAULT NULL,
  hyperlink varchar(1024) NOT NULL DEFAULT ''
);
CREATE INDEX ballotId_on_entries ON entries (ballotId);

CREATE TABLE random_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code varchar(6) DEFAULT NULL,
  UNIQUE (code)
);

CREATE TABLE ballot_codes (
  ballot_id int NOT NULL,
  random_code_id int NOT NULL,
  label varchar(256) DEFAULT '',
  PRIMARY KEY (ballot_id, random_code_id)
);
CREATE INDEX random_code_idx ON ballot_codes (random_code_id);

CREATE TABLE users (
  id bigint NOT NULL,
  username varchar(64) NOT NULL,
  email varchar(64) DEFAULT NULL,
  image varchar(256) DEFAULT NULL,
  role varchar(64) DEFAULT NULL,
  clearance smallint NOT NULL DEFAULT 0,
  password varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE (username)
);

CREATE TABLE votes (
  vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ballotId int NOT NULL,
  vote text NOT NULL,
  voteIds text,
  ipAddress varchar(64) NOT NULL,
  name varchar(40) NOT NULL DEFAULT '',
  date_created timestamp DEFAULT CURRENT_TIMESTAMP,
  fingerprint varchar(64) NOT NULL DEFAULT ''
);
CREATE INDEX idx_ballot_fingerprint ON votes (ballotId, fingerprint);
