# Node.js JWT Auth Backend

This project is a Node.js backend service for a login system using JWT and refresh tokens. It includes endpoints for user registration, login, token refresh, and logout. Passwords are securely hashed, and refresh tokens are managed securely.

## Features
- User registration and login
- JWT access and refresh token generation
- Token refresh endpoint
- Secure password hashing with bcrypt
- Express.js REST API

## Getting Started
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the server:
   ```sh
   npm start
   ```

## Endpoints
- `POST /register` - Register a new user
- `POST /login` - Login and receive tokens
- `POST /token` - Refresh access token
- `POST /logout` - Logout and invalidate refresh token

## Environment Variables
- `JWT_SECRET` - Secret for signing JWTs
- `REFRESH_TOKEN_SECRET` - Secret for signing refresh tokens

## License
MIT
