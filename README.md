# High Lander - Navigation Game

A web-based interactive navigation game where players race to reach randomly generated goal locations. Features real-time GPS tracking, shortest path routing, and multiplayer support.

## Features

- **Real-time GPS tracking** - Uses browser geolocation API
- **Dynamic goal generation** - Random goals within 1-2km radius
- **Shortest path routing** - OSRM-powered walking directions
- **Multiplayer support** - Compete with friends in real-time
- **Winner detection** - First to reach the goal wins

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Leaflet
- **Backend**: Node.js + Express + Socket.io
- **Database**: MongoDB + Redis
- **Routing**: OSRM (Open Source Routing Machine)
- **Containerization**: Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- ~3GB disk space for OSRM data

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd High-lander-task
   npm install
   ```

2. **Start infrastructure services**
   ```bash
   # Start MongoDB, Redis, and OSRM
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Setup OSRM data** (first time only, takes ~10 minutes)
   ```bash
   chmod +x scripts/setup-osrm.sh
   ./scripts/setup-osrm.sh
   ```

4. **Create environment file**
   ```bash
   cp server/.env.example server/.env
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Start server
   npm run dev:server

   # Terminal 2 - Start client
   npm run dev:client
   ```

6. **Open the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Production Deployment

```bash
# Build and run all services
docker-compose up --build -d
```

## Project Structure

```
High-lander-task/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Page components
│   │   └── services/    # API services
│   └── package.json
├── server/              # Node.js backend
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── middleware/  # Express middleware
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── socket/      # Socket.io handlers
│   └── package.json
├── shared/              # Shared types & constants
│   ├── types/
│   └── constants/
├── docker/              # Dockerfiles
├── .github/workflows/   # CI/CD
└── docker-compose.yml   # Docker services
```

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/games | List available games |
| POST | /api/players | Create/get player |
| POST | /api/games/route | Get route between points |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| game:create | Client→Server | Create new game |
| game:join | Client→Server | Join game by code |
| game:start | Client→Server | Start the game |
| location:update | Client→Server | Update player position |
| goal:reached | Client→Server | Player reached goal |
| players:positions | Server→Client | All player positions |
| game:winner | Server→Client | Winner announcement |

## Game Flow

1. Enter username on home page
2. Create or join a game in lobby
3. Wait for all players to be ready
4. Host starts the game
5. Navigate to the goal marker
6. First player to reach the goal wins!

## Configuration

### Environment Variables (Server)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| MONGODB_URI | mongodb://localhost:27017/navigation-game | MongoDB connection |
| REDIS_URL | redis://localhost:6379 | Redis connection |
| OSRM_URL | http://localhost:5000 | OSRM routing server |
| CORS_ORIGIN | http://localhost:5173 | Allowed CORS origin |

### Game Settings

- Goal distance: 1000-2000 meters
- Proximity threshold: 30 meters
- Max players per game: 10

## License

MIT
