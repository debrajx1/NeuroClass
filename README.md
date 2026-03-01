<p align="center">
  <img src="https://img.shields.io/badge/NeuroClass-AI%20Powered-blueviolet?style=for-the-badge&logo=brain&logoColor=white" alt="NeuroClass Badge"/>
</p>

<h1 align="center">🧠 NeuroClass</h1>
<h3 align="center">AI-Powered Classroom Engagement & Behavioral Analytics Platform</h3>

<p align="center">
  <em>Real-time student monitoring · Automated attendance · Privacy-first design</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.IO"/>
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/YOLOv8-Ultralytics-FF6F00?style=flat-square&logo=yolo&logoColor=white" alt="YOLOv8"/>
  <img src="https://img.shields.io/badge/DeepFace-Facenet-FF4081?style=flat-square" alt="DeepFace"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"/>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Dashboard Pages](#-dashboard-pages)
- [AI Detection Pipeline](#-ai-detection-pipeline)
- [Privacy & Ethics](#-privacy--ethics)
- [Scripts & Utilities](#-scripts--utilities)
- [Contributing](#-contributing)
- [License](#-license)
- [Team](#-team)

---

## 🌟 Overview

**NeuroClass** is a premium, privacy-preserving AI system designed to revolutionize classroom management. By analyzing real-time camera feeds, it provides teachers with actionable engagement analytics, behavioral insights, and automated attendance—all through a sleek, modern dashboard.

The platform combines computer vision, deep learning, and real-time web technologies to deliver a seamless experience that respects student privacy while empowering educators with data-driven insights.

---

## ✨ Key Features

### 🚀 Instant-Start AI Engine
Parallelized startup sequence allows the camera to go live in **< 1 second** while heavy AI models (YOLOv8, Facenet) load asynchronously in the background via threaded ingestion.

### 👤 Intelligent Face Recognition
Automated attendance tracking using **DeepFace (Facenet)** to identify registered students without storing raw facial data. Cosine-distance matching ensures high accuracy with minimal computational overhead.

### 📊 Behavioral Analytics
Real-time detection of student states using spatial heuristics:

| State | Detection Method |
|:---|:---|
| ✅ **Attentive** | Active participation and focus (default state) |
| 📱 **Phone Usage** | Detects mobile devices in proximity to students via YOLO |
| 😴 **Sleeping** | Identifies students leaning/resting based on skeletal aspect ratios |
| 💬 **Talking** | Analyzes inter-peer distance to flag unauthorized collaboration |

### ⚡ Live Dashboard
Real-time telemetry via **WebSockets (Socket.IO)** providing instant feedback on classroom "vibe" and individual engagement levels with dynamic Recharts visualizations.

### 📅 Automated Scheduling
Smart backend scheduler using **node-cron** that automatically initiates and terminates analytics sessions based on the class timetable.

### 🔒 JWT Authentication
Secure teacher authentication with **bcryptjs** password hashing, **JWT** token-based sessions, and route-level protection for all dashboard pages.

### 📈 PDF Reports
Generate and download comprehensive session reports and attendance records as **PDF documents** using jsPDF with auto-table formatting.

### 🌙 Dark Mode
Full dark/light theme support across the entire dashboard with smooth CSS transitions powered by Tailwind CSS.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NeuroClass Platform                         │
├────────────────────┬────────────────────┬───────────────────────────┤
│                    │                    │                           │
│   🖥️ Frontend      │   ⚙️ Backend       │   🤖 AI Module            │
│   React + Vite     │   Express + Mongo  │   Python + OpenCV        │
│   Tailwind CSS     │   Socket.IO        │   YOLOv8 + DeepFace      │
│                    │                    │                           │
│  ┌──────────────┐  │  ┌──────────────┐  │  ┌─────────────────────┐  │
│  │  Dashboard   │  │  │  Auth API    │  │  │  Threaded Camera    │  │
│  │  Sessions    │◄─┼──┤  Analytics   │◄─┼──┤  Stream (VideoStream)│  │
│  │  Students    │  │  │  Ingestion   │  │  │                     │  │
│  │  Analytics   │  │  │  Students    │  │  │  YOLO Detection     │  │
│  │  Attendance  │  │  │              │  │  │  Face Recognition   │  │
│  │  Reports     │  │  │  WebSocket   │  │  │  Behavior Analysis  │  │
│  │  Settings    │  │  │  Scheduler   │  │  │                     │  │
│  └──────┬───────┘  │  └──────┬───────┘  │  └─────────┬───────────┘  │
│         │          │         │          │            │              │
│         └──────────┼─►REST + WS◄───────┼────────────┘              │
│                    │    (Port 5002)     │    Ingestion API          │
└────────────────────┴────────────────────┴───────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   MongoDB Atlas    │
                    │   or Local DB      │
                    └───────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|:---|:---|:---|
| React | 19.x | UI library with hooks & context |
| Vite | 7.x | Lightning-fast dev server & bundler |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| React Router | 7.x | Client-side routing |
| Recharts | 3.x | Dynamic data visualization |
| Socket.IO Client | 4.x | Real-time WebSocket communication |
| Axios | 1.x | HTTP client for REST API |
| Lucide React | — | Modern icon system |
| jsPDF | 4.x | PDF report generation |
| react-hot-toast | 2.x | Toast notifications |

### Backend
| Technology | Version | Purpose |
|:---|:---|:---|
| Node.js | 18+ | JavaScript runtime |
| Express | 5.x | Web framework |
| Mongoose | 9.x | MongoDB ODM |
| Socket.IO | 4.x | Real-time event broadcasting |
| JWT | — | Authentication tokens |
| bcryptjs | 3.x | Password hashing |
| node-cron | 4.x | Task scheduling |
| Multer | 2.x | File upload handling |
| Sharp | 0.34 | Image processing |
| Morgan | 1.x | HTTP request logging |
| express-rate-limit | 8.x | API rate limiting |

### AI Module
| Technology | Purpose |
|:---|:---|
| Python 3.10+ | Core runtime |
| OpenCV | Video capture & frame processing |
| Ultralytics YOLOv8 | Object detection (persons, phones) |
| DeepFace (Facenet) | Face recognition & encoding |
| NumPy | Numerical computations |
| tf-keras | Deep learning backend |

---

## 📁 Project Structure

```
NeuroClass/
├── 📂 frontend/                    # React SPA
│   ├── 📂 src/
│   │   ├── 📂 components/          # Reusable UI components
│   │   │   ├── ClassroomHeatmap.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Skeleton.jsx
│   │   ├── 📂 pages/               # Route-level page components
│   │   │   ├── Dashboard.jsx       # Main overview & live telemetry
│   │   │   ├── Analytics.jsx       # Historical engagement charts
│   │   │   ├── Sessions.jsx        # Session management
│   │   │   ├── Students.jsx        # Student registry & photos
│   │   │   ├── AttendanceReports.jsx
│   │   │   ├── Report.jsx          # Individual session report
│   │   │   ├── Settings.jsx        # Teacher preferences
│   │   │   └── Login.jsx           # Authentication page
│   │   ├── 📂 context/             # React Context providers
│   │   ├── api.js                  # Axios instance configuration
│   │   ├── App.jsx                 # Root component & routing
│   │   └── main.jsx                # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── 📂 backend/                     # Express REST API
│   ├── 📂 config/
│   │   └── db.js                   # MongoDB connection
│   ├── 📂 middleware/
│   │   └── auth middleware         # JWT verification
│   ├── 📂 models/                  # Mongoose schemas
│   │   ├── Teacher.js
│   │   ├── Student.js
│   │   ├── Session.js
│   │   └── Event.js
│   ├── 📂 routes/                  # API route handlers
│   │   ├── auth.js                 # Login / Register
│   │   ├── analytics.js            # Session analytics & reports
│   │   ├── ingestion.js            # AI telemetry ingestion
│   │   └── students.js             # Student CRUD & photos
│   ├── 📂 utils/
│   │   └── scheduler.js            # Automated class scheduling
│   ├── 📂 uploads/                 # Student photo storage
│   ├── server.js                   # App entry point
│   └── package.json
│
├── 📂 ai_module/                   # Python CV pipeline
│   ├── main.py                     # Core detection & recognition loop
│   ├── requirements.txt            # Python dependencies
│   └── yolov8n.pt                  # Pre-trained YOLO model weights
│
├── Start_NeuroClass.bat            # One-click Windows launcher
├── Open_Website.bat                # Quick browser opener
├── .gitignore
└── README.md                       # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Minimum Version | Notes |
|:---|:---|:---|
| Node.js | v18+ | [Download](https://nodejs.org/) |
| MongoDB | 6.0+ | Local install or [Atlas](https://www.mongodb.com/atlas) |
| Python | 3.10+ | [Download](https://www.python.org/) |
| Webcam | — | USB or integrated camera |
| Git | 2.x | [Download](https://git-scm.com/) |

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/NeuroClass.git
cd NeuroClass
```

#### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb://localhost:27017/neuroclass
JWT_SECRET=your_super_secret_jwt_key
PORT=5002
```

Start the backend server:

```bash
npm run dev
```

> The backend runs on `http://localhost:5002` by default.

#### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5002
```

Start the development server:

```bash
npm run dev
```

> The frontend runs on `http://localhost:5173` by default.

#### 4️⃣ AI Module Setup

```bash
cd ai_module
pip install -r requirements.txt
```

Create a `.env` file in the `ai_module/` directory:

```env
BACKEND_URL=http://localhost:5002
INGESTION_API_KEY=your_ingestion_api_key
TEACHER_ID=your_teacher_id_from_mongodb
```

Start the AI pipeline:

```bash
python main.py
```

### ⚡ Quick Start (Windows)

Double-click `Start_NeuroClass.bat` to launch all three services simultaneously, then use `Open_Website.bat` to open the dashboard in your default browser.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|:---|:---|:---|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/neuroclass` |
| `JWT_SECRET` | Secret key for JWT signing | `my_super_secret_key_123` |
| `PORT` | Server port | `5002` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|:---|:---|:---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5002` |

### AI Module (`ai_module/.env`)

| Variable | Description | Example |
|:---|:---|:---|
| `BACKEND_URL` | Backend URL for telemetry | `http://localhost:5002` |
| `INGESTION_API_KEY` | API key for secure data ingestion | `abc123secret` |
| `TEACHER_ID` | MongoDB ObjectId of the teacher | `64f1a2b3c4d5e6f7g8h9i0j1` |

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|:---|:---|:---|:---|
| `POST` | `/api/auth/register` | Register a new teacher | ❌ |
| `POST` | `/api/auth/login` | Login & receive JWT | ❌ |

### Analytics

| Method | Endpoint | Description | Auth |
|:---|:---|:---|:---|
| `GET` | `/api/analytics/sessions` | Get all sessions | ✅ JWT |
| `GET` | `/api/analytics/sessions/:id` | Get session details | ✅ JWT |
| `POST` | `/api/analytics/sessions` | Create a new session | ✅ JWT |
| `GET` | `/api/analytics/reports` | Generate analytics report | ✅ JWT |

### Students

| Method | Endpoint | Description | Auth |
|:---|:---|:---|:---|
| `GET` | `/api/students` | List all students | ✅ JWT |
| `POST` | `/api/students` | Register a new student | ✅ JWT |
| `PUT` | `/api/students/:id` | Update student info | ✅ JWT |
| `DELETE` | `/api/students/:id` | Remove a student | ✅ JWT |

### Ingestion (AI → Backend)

| Method | Endpoint | Description | Auth |
|:---|:---|:---|:---|
| `POST` | `/api/ingestion/events` | Push behavioral events | 🔑 API Key |
| `POST` | `/api/ingestion/session/start` | Start an AI session | 🔑 API Key |

### Health Check

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/health` | API health status |

> **Rate Limiting**: All API routes (except ingestion) are protected with a rate limiter — **500 requests per 15 minutes** per IP.

---

## 🖥️ Dashboard Pages

| Page | Route | Description |
|:---|:---|:---|
| **Dashboard** | `/` | Live classroom overview with real-time engagement metrics, activity timeline, and classroom heatmap |
| **Sessions** | `/sessions` | Create, manage, and browse all analytics sessions |
| **Session Report** | `/report/:id` | Deep-dive report for a specific session with per-student breakdown |
| **Students** | `/students` | Student registry with photo management and enrollment |
| **Attendance** | `/attendance` | Automated attendance reports powered by face recognition |
| **Analytics** | `/analytics` | Historical engagement trends and behavioral pattern charts |
| **Settings** | `/settings` | Teacher profile, class schedule, and system preferences |
| **Login** | `/login` | Secure authentication portal |

---

## 🤖 AI Detection Pipeline

```
Camera Feed ──► VideoStream (Threaded) ──► Frame Buffer
                                              │
                                              ▼
                                     YOLOv8 Detection
                                    (Persons & Phones)
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                            Face Extraction      Behavior Analysis
                           (DeepFace Facenet)    (Spatial Heuristics)
                                    │                   │
                                    ▼                   ▼
                            Identity Matching    State Classification
                          (Cosine Distance)    (Attentive/Phone/Sleep/Talk)
                                    │                   │
                                    └─────────┬─────────┘
                                              ▼
                                     Event Batching
                                              │
                                              ▼
                                   POST /api/ingestion/events
                                      (to Backend)
                                              │
                                              ▼
                                   Socket.IO Broadcast
                                    (to Dashboard)
```

### Pipeline Highlights

- **Threaded Video Capture**: `VideoStream` class uses a dedicated thread for frame acquisition, preventing I/O blocking from stalling the detection loop.
- **Async Model Loading**: Heavy models (YOLOv8, Facenet) load in a background thread while the camera starts instantly.
- **Smooth Bounding Boxes**: Exponential moving average (EMA) smoothing eliminates jittery bounding boxes.
- **Batched Event Dispatch**: Events are collected and sent in batches to minimize HTTP overhead.
- **Session Lifecycle**: The AI module checks session validity periodically and gracefully shuts down when a session ends.

---

## 🛡️ Privacy & Ethics

NeuroClass is built on **Privacy by Design** principles:

| Principle | Implementation |
|:---|:---|
| **Zero Video Retention** | Frames are processed in volatile memory and immediately discarded. No video is ever saved to disk. |
| **Anonymized Processing** | The system tracks "Anonymous IDs" by default. Face recognition only maps these IDs to names locally for attendance. |
| **Ephemeral Tracking** | Tracking identities are session-scoped and purged upon session termination. |
| **Secure Ingestion** | All telemetry is protected via API keys and encrypted transport (HTTPS ready). |
| **No Raw Biometrics** | Face embeddings are computed in-memory and never persisted or transmitted as raw biometric data. |
| **Minimal Data Collection** | Only behavioral state labels and timestamps are stored — never video frames or audio. |

---

## 🔧 Scripts & Utilities

| File | Description |
|:---|:---|
| `Start_NeuroClass.bat` | One-click launcher for all three services (Windows) |
| `Open_Website.bat` | Opens the dashboard in the default browser |
| `backend/scripts/` | Database utility scripts |
| `backend/wipe_db.js` | Reset the database (⚠️ destructive) |
| `check_db.js` | Verify MongoDB connectivity |
| `test_socket.js` | Test Socket.IO connection |
| `ai_module/test_deepface.py` | Verify DeepFace installation |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push** to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|:---|:---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `style:` | Code style (no logic change) |
| `refactor:` | Code refactoring |
| `perf:` | Performance improvement |
| `test:` | Adding tests |
| `chore:` | Maintenance tasks |

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 👥 Team

| Role | Responsibilities |
|:---|:---|
| **🤖 AI Specialist** | YOLOv8 pipeline, behavioral heuristics, face recognition engine |
| **⚙️ Full-Stack Architect** | Express API, MongoDB aggregations, real-time Socket layer |
| **🎨 Product Designer** | React dashboard, data visualization, UX/UI design |

---

<p align="center">
  <b>Built with ❤️ for smarter classrooms</b>
</p>

<p align="center">
  <a href="#-neuroclass">⬆ Back to Top</a>
</p>
