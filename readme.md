# MentorSpace
A real-time 1-on-1 technical mentorship platform with collaborative code editing, WebRTC video calling, and live session chat.

## Features
- **Authentication** — JWT-based login and registration with Mentor / Student roles
- **Session Management** — Create, schedule, join and end 1-on-1 sessions via invite token
- **Collaborative Code Editor** — Real-time code sync powered by Monaco Editor and WebSockets, with remote cursor indicator and language switching (JavaScript, TypeScript, Python, Go, Rust)
- **Video Calling** — Peer-to-peer WebRTC video with mute, camera toggle, and screen sharing. The FastAPI backend handles SDP and ICE candidate signaling only — no media passes through the server
- **Live Chat** — Session-scoped chat with message persistence to PostgreSQL
- **Code Snapshots** — Save point-in-time snapshots of the editor contents during a session
- **Dashboard** — Overview of live, upcoming, and completed sessions with stats

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.3 | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.1 | Styling |
| Zustand | 4.5.2 | Global state (auth, sessions, chat) |
| Monaco Editor | 4.6.0 | Code editor with syntax highlighting |
| Axios | 1.7.2 | HTTP API client |
| Lucide React | 0.400.0 | Icons |
| date-fns | 3.6.0 | Date formatting |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.111.0 | REST API + WebSocket server |
| Uvicorn | 0.29.0 | ASGI server |
| SQLAlchemy | 2.0.30 | ORM |
| PostgreSQL | 16+ | Primary database |
| psycopg2 | 2.9.9 | PostgreSQL driver |
| python-jose | 3.3.0 | JWT tokens |
| passlib + bcrypt | 1.7.4 | Password hashing |
| Pydantic | 2.7.1 | Request/response validation |

## Prerequisites

- **Python 3.12** (not 3.13+ — pydantic-core has no pre-built wheel for those yet)
- **Node.js 18+**
- **PostgreSQL 15+**

### Install Python 3.12 on Windows
install Python.Python.3.12

### Install Node.js
install OpenJS.NodeJS.LTS


## Backend Setup

### 1. Create and activate virtual environment
cd backend

# Windows
py -3.12 -m venv venv
venv\Scripts\activate

# macOS / Linux
python3.12 -m venv venv
source venv/bin/activate


### 2. Install dependencies
pip install -r requirements.txt


### 3. Configure environment
.env.example .env

### 4. Create the database
psql -U postgres -c "CREATE DATABASE mentorspace;"

### 5. Create tables
python -c "from core.database import create_tables; create_tables(); print('Tables created!')"

### 6. Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

## Frontend Setup

### 1. Install dependencies
cd frontend
npm install

### 2. Configure environment
.env.local.example .env.local

### 3. Run the dev server
npm run dev

The app will be available at `http://localhost:3000`.

## Database

### Tables

| Table | Key Columns |
|---|---|
| `users` | `id` (UUID), `email`, `hashed_password`, `full_name`, `role` (mentor/student) |
| `sessions` | `id`, `mentor_id`, `student_id`, `status` (scheduled/active/ended), `invite_token`, `language`, `initial_code` |
| `messages` | `id`, `session_id`, `sender_id`, `content`, `message_type` (chat/code/system) |
| `code_snapshots` | `id`, `session_id`, `code`, `language`, `saved_at` |

## WebSocket Protocol
Connect to: `ws://localhost:8000/ws/{session_id}?user_id=...&user_name=...&role=mentor`


## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive a JWT token |
| `GET` | `/api/auth/me` | Get the current authenticated user |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions/create` | Create a session (mentor only) |
| `POST` | `/api/sessions/join` | Join a session via invite token |
| `POST` | `/api/sessions/{id}/end` | End a session (mentor only) |
| `GET` | `/api/sessions/my` | List all sessions for the current user |
| `GET` | `/api/sessions/{id}` | Get a session by ID |
| `GET` | `/api/sessions/by-token/{token}` | Get a session by invite token |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/messages/{session_id}` | Get all chat messages for a session |
| `POST` | `/api/messages/save` | Save a chat message |

### WebSocket
| Endpoint | Description |
|---|---|
| `WS /ws/{session_id}` | Real-time collaboration: code sync, chat, WebRTC signaling |

All REST endpoints except `/api/auth/register` and `/api/auth/login` require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Deployment

### Backend → Railway or Render

1. Push the `backend/` folder to a GitHub repo
2. Connect the repo to Railway or Render
3. Set environment variables in the dashboard:
   ```
   DATABASE_URL=postgresql://...
   SECRET_KEY=your-production-secret
   ```
4. Set the start command:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### Frontend → Vercel

1. Push the `frontend/` folder to a GitHub repo
2. Import the project on [vercel.com](https://vercel.com)
3. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
   ```
4. Deploy — Vercel auto-detects Next.js

> **Note:** When deploying, update the CORS origins in `backend/main.py` to include your Vercel frontend URL.

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `password authentication failed for user "postgres"` | Wrong password in `DATABASE_URL` | Update `.env` with the correct PostgreSQL password |
| `relation "users" does not exist` | Tables not created yet | Run `python -c "from core.database import create_tables; create_tables()"` |
| `pydantic-core` install fails | Python 3.13+ has no pre-built wheel | Use Python 3.12 — `py -3.12 -m venv venv` |
| `Connection refused` on port 5432 | PostgreSQL service not running | Run `net start postgresql-x64-18` (adjust version) |
| Duplicate participants in session | Stale WebSocket callbacks | Fixed in `useSessionWS.ts` via callback refs and `dedupeParticipants()` |