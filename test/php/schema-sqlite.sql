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
  voteCutoff datetime DEFAULT NULL,
  resultsRelease datetime DEFAULT NULL,
  timeCreated datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  register int DEFAULT 0,
  allowCustom tinyint NOT NULL DEFAULT 0,
  showGraph tinyint NOT NULL DEFAULT 0,
  graphUpdated datetime DEFAULT NULL,
  kickbackUrl varchar(2048) DEFAULT NULL,
  iframeUrl varchar(2048) DEFAULT NULL,
  oneDeviceOneVote tinyint NOT NULL DEFAULT 0,
  isSecure tinyint NOT NULL DEFAULT 0,
  orderedEntries tinyint NOT NULL DEFAULT 0,
  allowGrouping tinyint NOT NULL DEFAULT 0,
  customHtml text DEFAULT NULL,
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
  rcvisInfo text DEFAULT NULL,
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
  date_created datetime DEFAULT CURRENT_TIMESTAMP,
  fingerprint varchar(64) NOT NULL DEFAULT '',
  group_answers text DEFAULT NULL
);
CREATE INDEX idx_ballot_fingerprint ON votes (ballotId, fingerprint);

CREATE TABLE voter_group_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ballot_id int NOT NULL,
  title varchar(64) NOT NULL,
  question_text varchar(256) NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'select',
  required tinyint NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX idx_vgf_ballot ON voter_group_fields (ballot_id);

CREATE TABLE voter_group_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field_id int NOT NULL,
  label varchar(128) NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX idx_vgo_field ON voter_group_options (field_id);
