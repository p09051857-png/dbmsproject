CREATE DATABASE myproject;
USE myproject;
-- Customer table (parent)
CREATE TABLE Customer (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  phone       VARCHAR(15),
  address     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CreditCard table (child of Customer)
CREATE TABLE CreditCard (
  card_id       INT AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT NOT NULL,
  card_number   VARCHAR(16) UNIQUE NOT NULL,
  card_type     ENUM('VISA','MASTERCARD','AMEX') DEFAULT 'VISA',
  credit_limit  DECIMAL(12,2) NOT NULL,
  current_balance DECIMAL(12,2) DEFAULT 0.00,
  expiry_date   DATE NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- CASCADE: If Customer deleted, all their cards are deleted too
  FOREIGN KEY (customer_id)
    REFERENCES Customer(customer_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Merchant table (independent parent)
CREATE TABLE Merchant (
  merchant_id   INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(50),
  city          VARCHAR(50),
  country       VARCHAR(50) DEFAULT 'India'
);

-- Transaction table (child of CreditCard and Merchant)
CREATE TABLE Transaction (
  txn_id        INT AUTO_INCREMENT PRIMARY KEY,
  card_id       INT NOT NULL,
  merchant_id   INT,
  amount        DECIMAL(12,2) NOT NULL,
  txn_type      ENUM('PURCHASE','REFUND','CASH_ADVANCE') DEFAULT 'PURCHASE',
  status        ENUM('PENDING','APPROVED','DECLINED','FLAGGED') DEFAULT 'PENDING',
  txn_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description   VARCHAR(200),

  -- CASCADE: if card is deleted, transactions are deleted
  FOREIGN KEY (card_id)
    REFERENCES CreditCard(card_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- SET NULL: if merchant is deleted, keep transaction but null merchant
  FOREIGN KEY (merchant_id)
    REFERENCES Merchant(merchant_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- FraudAlert table (1:1 with Transaction)
CREATE TABLE FraudAlert (
  alert_id    INT AUTO_INCREMENT PRIMARY KEY,
  txn_id      INT UNIQUE NOT NULL,   -- UNIQUE enforces 1:1
  alert_type  VARCHAR(100),
  risk_score  DECIMAL(5,2),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved    BOOLEAN DEFAULT FALSE,

  -- SET NULL not used here; restrict to protect fraud records
  FOREIGN KEY (txn_id)
    REFERENCES Transaction(txn_id)
    ON DELETE CASCADE
);

-- AuditLog (auto-filled by triggers)
CREATE TABLE AuditLog (
  log_id      INT AUTO_INCREMENT PRIMARY KEY,
  txn_id      INT,
  action      VARCHAR(50),
  old_status  VARCHAR(20),
  new_status  VARCHAR(20),
  changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (txn_id)
    REFERENCES Transaction(txn_id)
    ON DELETE SET NULL   -- Keep log even if transaction deleted
);