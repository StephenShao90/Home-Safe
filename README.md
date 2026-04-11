Home Safe

    Safety-focused navigation web application for walking routes
    Provides routes optimized for both safety and efficiency
    Designed for use in unfamiliar areas or late-night travel

Overview

    Traditional maps prioritize fastest routes only
    Home Safe introduces safety-aware routing
    Compares multiple routes based on safety conditions
    Helps users make informed decisions when traveling

Features

    Quickest route (fastest ETA)
    Safest route (maximizes safe areas)
    Best mix route (balance between safety and time)
    Safety scoring system (0–10 scale)
    Heatmap visualization (green to red zones)
    Smart location search with autocomplete
    Clean route display using place names
    AI integration with Zerve

Tech Stack

    React (Vite)
    Google Maps JavaScript API
    Node.js
    Express.js
    PostgreSQL

Project Structure

    client (frontend)
    server (backend)
    database (schema)

Setup

    Clone repository
    git clone https://github.com/StephenShao90/Home-Safe.git

    cd Home-Safe

    Install dependencies
    cd client
    npm install
    cd ../server
    npm install

    Create server/.env with required variables
    Set up database using schema.sql

    Run backend
    cd server
    npm run dev

    Run frontend
    cd client
    npm run dev

    Open http://localhost:5173

API Endpoints

    POST /api/routes
    GET /api/safety/cells
    POST /api/ratings
    GET /api/ratings

Safety Algorithm

    Evaluates routes based on safety coverage
    Uses gradient scoring from green to red
    Penalizes unsafe segments
    Balances safety and travel time for best mix

Known Issues

    Autocomplete may prioritize distant locations
    Safety data may be sparse in some areas
    Best mix routing still being refined

Future Improvements

    Real-time safety data
    User accounts and preferences
    Notifications for unsafe areas
    Mobile app version
    Improved AI routing

License

    Educational and development use only