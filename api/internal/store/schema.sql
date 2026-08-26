-- MySQL 8 schema. Applied on every boot; every statement is idempotent.
--
-- Two conventions worth knowing before reading further:
--
--   * Identifiers are VARCHAR, not TEXT. MySQL cannot index a TEXT column
--     without a prefix length, and every id here is a key or a foreign key.
--   * Timestamps are stored as RFC3339 strings rather than DATETIME. They sort
--     and compare lexicographically in exactly the order they compare
--     chronologically, which is what lets the analytics queries do range
--     comparisons and SUBSTR(created_at, 1, 10) to bucket by day.
--
-- utf8mb4 throughout: Amharic in a merchant name or a recovery answer has to
-- survive the round trip. The _ai_ci collation is accent- and case-insensitive,
-- which makes username lookups case-insensitive without a COLLATE on every
-- query.

CREATE TABLE IF NOT EXISTS merchants (
  id               VARCHAR(64)  NOT NULL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  category         VARCHAR(120) NOT NULL DEFAULT '',
  status           VARCHAR(32)  NOT NULL DEFAULT 'Active',
  contact_email    VARCHAR(255) NOT NULL DEFAULT '',
  default_currency VARCHAR(3)   NOT NULL DEFAULT 'USD',
  created_at       VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS branches (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  merchant_id   VARCHAR(64)  NOT NULL,
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(64)  NOT NULL DEFAULT '',
  city          VARCHAR(120) NOT NULL DEFAULT '',
  area          VARCHAR(120) NOT NULL DEFAULT '',
  manager_name  VARCHAR(255) NOT NULL DEFAULT '',
  manager_email VARCHAR(255) NOT NULL DEFAULT '',
  manager_phone VARCHAR(64)  NOT NULL DEFAULT '',
  created_at    VARCHAR(40)  NOT NULL,
  KEY idx_branches_merchant (merchant_id),
  CONSTRAINT fk_branches_merchant FOREIGN KEY (merchant_id)
    REFERENCES merchants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The register of merchant numbers, kept by merchant management. An operator
-- registers against a number here, which is how a payment knows the name it was
-- made to without anyone typing it twice.
CREATE TABLE IF NOT EXISTS mpgs_merchants (
  number      VARCHAR(64)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  live_number VARCHAR(64)  NOT NULL DEFAULT '',
  created_by  VARCHAR(64)  NOT NULL DEFAULT '',
  created_at  VARCHAR(40)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- username is the login identifier; email is optional profile data and is
-- deliberately not unique, because a self-registered operator supplies neither.
CREATE TABLE IF NOT EXISTS users (
  id                   VARCHAR(64)  NOT NULL PRIMARY KEY,
  merchant_id          VARCHAR(64)  NULL,
  branch_id            VARCHAR(64)  NULL,
  username             VARCHAR(64)  NOT NULL,
  email                VARCHAR(255) NOT NULL DEFAULT '',
  mpgs_merchant_number VARCHAR(64)  NOT NULL DEFAULT '',
  full_name            VARCHAR(255) NOT NULL,
  phone                VARCHAR(64)  NOT NULL DEFAULT '',
  role                 VARCHAR(32)  NOT NULL,
  title                VARCHAR(120) NOT NULL DEFAULT '',
  status               VARCHAR(32)  NOT NULL DEFAULT 'invited',
  password_hash        VARCHAR(255) NOT NULL DEFAULT '',
  invite_token         VARCHAR(64)  NOT NULL DEFAULT '',
  created_at           VARCHAR(40)  NOT NULL,
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_merchant (merchant_id),
  KEY idx_users_invite (invite_token),
  KEY idx_users_mpgs (mpgs_merchant_number),
  CONSTRAINT fk_users_merchant FOREIGN KEY (merchant_id)
    REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Recovery answers, hashed exactly like passwords: a breach of this table must
-- not hand over answers that people reuse on other services.
CREATE TABLE IF NOT EXISTS security_questions (
  user_id     VARCHAR(64)  NOT NULL,
  position    INT          NOT NULL,
  prompt      VARCHAR(255) NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at  VARCHAR(40)  NOT NULL,
  PRIMARY KEY (user_id, position),
  CONSTRAINT fk_questions_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- One MPGS identity per operator per environment: test and live are separate
-- gateways with separate merchant profiles, and an operator piloting in
-- production still needs the test one. api_password_sealed is AES-GCM
-- ciphertext. is_active marks which of the two the operator is working in.
CREATE TABLE IF NOT EXISTS gateway_credentials (
  user_id             VARCHAR(64)    NOT NULL,
  environment         VARCHAR(16)    NOT NULL DEFAULT 'test',
  gateway_host        VARCHAR(255)   NOT NULL,
  mpgs_merchant_id    VARCHAR(64)    NOT NULL,
  merchant_name       VARCHAR(255)   NOT NULL DEFAULT '',
  api_version         VARCHAR(8)     NOT NULL DEFAULT '100',
  api_password_sealed VARBINARY(512) NOT NULL,
  is_active           TINYINT(1)     NOT NULL DEFAULT 1,
  verified_at         VARCHAR(40)    NULL,
  created_at          VARCHAR(40)    NOT NULL,
  updated_at          VARCHAR(40)    NOT NULL,
  PRIMARY KEY (user_id, environment),
  CONSTRAINT fk_credentials_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS pay_links (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  slug          VARCHAR(64)  NOT NULL,
  merchant_id   VARCHAR(64)  NOT NULL,
  created_by_id VARCHAR(64)  NOT NULL,
  branch_id     VARCHAR(64)  NULL,
  title         VARCHAR(255) NOT NULL,
  description   VARCHAR(512) NOT NULL DEFAULT '',
  reference     VARCHAR(255) NOT NULL DEFAULT '',
  type          VARCHAR(16)  NOT NULL DEFAULT 'static',
  payment_mode  VARCHAR(16)  NOT NULL DEFAULT 'purchase',
  environment   VARCHAR(16)  NOT NULL DEFAULT 'test',
  amount_minor  BIGINT       NOT NULL DEFAULT 0,
  target_minor  BIGINT       NOT NULL DEFAULT 0,
  currency      VARCHAR(3)   NOT NULL,
  min_minor     BIGINT       NOT NULL DEFAULT 0,
  max_minor     BIGINT       NOT NULL DEFAULT 0,
  max_uses      INT          NULL,
  used_count    INT          NOT NULL DEFAULT 0,
  paid_count    INT          NOT NULL DEFAULT 0,
  paid_minor    BIGINT       NOT NULL DEFAULT 0,
  expires_at    VARCHAR(40)  NULL,
  status        VARCHAR(24)  NOT NULL DEFAULT 'active',
  created_at    VARCHAR(40)  NOT NULL,
  UNIQUE KEY uq_links_slug (slug),
  KEY idx_links_merchant (merchant_id),
  KEY idx_links_creator (created_by_id),
  CONSTRAINT fk_links_merchant FOREIGN KEY (merchant_id)
    REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_links_creator FOREIGN KEY (created_by_id)
    REFERENCES users(id),
  CONSTRAINT fk_links_branch FOREIGN KEY (branch_id)
    REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS payments (
  id                 VARCHAR(64)  NOT NULL PRIMARY KEY,
  pay_link_id        VARCHAR(64)  NOT NULL,
  merchant_id        VARCHAR(64)  NOT NULL,
  order_id           VARCHAR(64)  NOT NULL,
  session_id         VARCHAR(128) NOT NULL DEFAULT '',
  success_indicator  VARCHAR(128) NOT NULL DEFAULT '',
  environment        VARCHAR(16)  NOT NULL DEFAULT 'test',
  amount_minor       BIGINT       NOT NULL,
  currency           VARCHAR(3)   NOT NULL,
  authorized_minor   BIGINT       NOT NULL DEFAULT 0,
  captured_minor     BIGINT       NOT NULL DEFAULT 0,
  refunded_minor     BIGINT       NOT NULL DEFAULT 0,
  status             VARCHAR(24)  NOT NULL DEFAULT 'initiated',
  gateway_result     VARCHAR(64)  NOT NULL DEFAULT '',
  gateway_status     VARCHAR(64)  NOT NULL DEFAULT '',
  gateway_receipt    VARCHAR(64)  NOT NULL DEFAULT '',
  authorization_code VARCHAR(32)  NOT NULL DEFAULT '',
  acquirer_reference VARCHAR(64)  NOT NULL DEFAULT '',
  settlement_date    VARCHAR(32)  NOT NULL DEFAULT '',
  customer_name      VARCHAR(255) NOT NULL DEFAULT '',
  customer_email     VARCHAR(255) NOT NULL DEFAULT '',
  card_brand         VARCHAR(32)  NOT NULL DEFAULT '',
  card_last4         VARCHAR(8)   NOT NULL DEFAULT '',
  created_at         VARCHAR(40)  NOT NULL,
  completed_at       VARCHAR(40)  NULL,
  last_checked_at    VARCHAR(40)  NULL,
  UNIQUE KEY uq_payments_order (order_id),
  KEY idx_payments_link (pay_link_id),
  KEY idx_payments_merchant (merchant_id),
  -- Analytics reads by date within one environment; this is what keeps the
  -- My Payments screen off a full scan as history builds up.
  KEY idx_payments_reporting (environment, created_at),
  CONSTRAINT fk_payments_link FOREIGN KEY (pay_link_id)
    REFERENCES pay_links(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_merchant FOREIGN KEY (merchant_id)
    REFERENCES merchants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS link_shares (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  pay_link_id  VARCHAR(64)  NOT NULL,
  channel      VARCHAR(24)  NOT NULL,
  destination  VARCHAR(255) NOT NULL DEFAULT '',
  shared_by_id VARCHAR(64)  NOT NULL,
  created_at   VARCHAR(40)  NOT NULL,
  KEY idx_shares_link (pay_link_id),
  CONSTRAINT fk_shares_link FOREIGN KEY (pay_link_id)
    REFERENCES pay_links(id) ON DELETE CASCADE,
  CONSTRAINT fk_shares_user FOREIGN KEY (shared_by_id)
    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Every capture, refund and void performed against a payment, in order. This is
-- the audit trail: who moved money, how much, and what the gateway said.
CREATE TABLE IF NOT EXISTS payment_operations (
  id             VARCHAR(64)  NOT NULL PRIMARY KEY,
  payment_id     VARCHAR(64)  NOT NULL,
  transaction_id VARCHAR(64)  NOT NULL,
  type           VARCHAR(16)  NOT NULL,
  amount_minor   BIGINT       NOT NULL DEFAULT 0,
  currency       VARCHAR(3)   NOT NULL,
  status         VARCHAR(16)  NOT NULL,
  gateway_code   VARCHAR(64)  NOT NULL DEFAULT '',
  detail         VARCHAR(512) NOT NULL DEFAULT '',
  performed_by   VARCHAR(255) NOT NULL DEFAULT '',
  created_at     VARCHAR(40)  NOT NULL,
  KEY idx_ops_payment (payment_id),
  -- One row per gateway transaction id: the guard against a retry being
  -- recorded twice as two separate movements of money.
  UNIQUE KEY uq_ops_txn (payment_id, transaction_id),
  CONSTRAINT fk_ops_payment FOREIGN KEY (payment_id)
    REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
