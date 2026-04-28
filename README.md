# Home Safe

Home Safe is a safety-aware walking route planner that compares fastest, safest, and balanced routes using Google Maps, PostgreSQL safety data, and a deployed Zerve scoring API.

## Live Demo

Frontend: https://home-safe-beryl.vercel.app  
Backend health: https://home-safe.onrender.com/health  

---

## Quick Test (Recommended)

1. Open: https://home-safe-beryl.vercel.app  
2. Wait ~30–60 seconds if the backend is waking up  
3. Enter:
   - Origin: Trinity Bellwoods Park, Toronto  
   - Destination: Allan Gardens, Toronto  
4. Generate routes and compare results  

No login or setup required.

---

## What It Does

- Computes walking routes between two locations  
- Displays:
  - Fastest route  
  - Safest route  
  - Best-mix route  
- Samples route paths into geographic cells  
- Scores safety using:
  - Stored PostgreSQL data  
  - Zerve AI scoring API  
- Visualizes safety on a map  

---

## Tech Stack

- React + Vite  
- Express.js  
- PostgreSQL  
- Docker Compose  
- Google Maps (Routes, Places APIs)  
- Zerve API  
- Vercel (frontend hosting)  
- Render (backend + database)  

---

## Judge Testing Instructions

1. Open the app:  
   https://home-safe-beryl.vercel.app  

2. If slow at first, wait ~30–60 seconds (Render free tier wake-up)

3. Test route:
   - Origin: Trinity Bellwoods Park  
   - Destination: Allan Gardens  

4. Generate routes and compare safety levels  

5. Optional backend check:  
   https://home-safe.onrender.com/health  

---

## Zerve Dependency

This project uses a deployed Zerve API for route safety scoring:

https://homesafe.hub.zerve.cloud/score-cells  

The Zerve deployment must be active for full safety scoring.

### Fallback Behavior

If the Zerve API is unavailable:
- Routes will still compute  
- Safety scoring falls back to stored database values  

---

## Local Fallback (Docker)

If the live deployment is inactive, the project can run locally.

### Requirements

- Docker Desktop  
- Google Maps API key  
- Zerve API endpoint  

---

### Setup

1. Clone the repo:

```bash
git clone https://github.com/StephenShao90/Home-Safe.git
cd Home-Safe