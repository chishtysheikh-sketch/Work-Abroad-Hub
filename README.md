# Work Abroad Hub: Server

Backend for **Work Abroad Hub**, a site where international students in Korea find part-time jobs.
It serves the website (in `public/`) and replaces Firebase with our own server.

**Stack:** Node.js + Express 5 (ES modules), MongoDB (Mongoose), Socket.IO for live updates and chat.

## Start it

1. Create `.env` from the example and fill in real values:
   ```
   cp .env.example .env
   ```
2. Make sure MongoDB is running (`brew services start mongodb-community`).
3. Install and run:
   ```
   cd ~/Documents/work-abroad-hub-server && npm install && npm run dev
   ```
4. Open http://localhost:4000

Never commit `.env`. It holds the real database address and secret key.
