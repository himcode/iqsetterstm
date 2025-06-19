

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    username VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_user_filter (
    Id SERIAL PRIMARY KEY,
    UserId INTEGER,
    AccountStatus VARCHAR(50),
    UserRole VARCHAR(50),
    JobRole VARCHAR(50),
    Department VARCHAR(50),
    OfficeLocation VARCHAR(50),
    Manager VARCHAR(50),
    Teams VARCHAR(50),
    FOREIGN KEY (UserId) REFERENCES "user"(Id)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);