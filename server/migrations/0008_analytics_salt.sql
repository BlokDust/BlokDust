-- Usage analytics (SHARING-0010, SPEC-SHARING-USAGE-ANALYTICS R4): today's random salt for the visitor hash. One row;
-- each day's replaces the last, after which no stored hash can be linked to another day's.
CREATE TABLE IF NOT EXISTS analytics_salt (
  day  TEXT PRIMARY KEY,  -- YYYY-MM-DD (UTC)
  salt TEXT NOT NULL
);
