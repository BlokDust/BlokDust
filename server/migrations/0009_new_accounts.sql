-- SPEC-SHARING-ACCOUNTS R1b (CHG-0035): new accounts per network per UTC day. The key is a hash of the network
-- address with the day's random salt (analytics_salt), so it can't be read back to an address, and a day's rows are
-- deleted the next day.
CREATE TABLE IF NOT EXISTS new_accounts (
  key TEXT PRIMARY KEY,
  day TEXT NOT NULL,  -- YYYY-MM-DD (UTC)
  n   INTEGER NOT NULL
);
