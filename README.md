# MTC Backend API

A lightweight Node.js backend for the Muslim Tech Collaborative platform.

## 🚀 Features

- **JWT Authentication** with secure password hashing
- **SQLite Database** (no setup required)
- **Admin Role Management** (first user becomes admin)
- **Project Approval Workflow** with admin controls
- **RESTful API** with comprehensive endpoints
- **CORS Enabled** for frontend integration

## 🛠️ Tech Stack

- **Node.js** + **Express.js**
- **SQLite3** database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests

## 📦 Installation

```bash
# Clone and install
git clone <your-repo>
cd mtc-backend
npm install

# Run the server
npm start

# Development with auto-restart
npm run dev
```

## 🗄️ Database Schema

### Users Table
```sql
- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE)
- password (TEXT) -- bcrypt hashed
- name (TEXT)
- location (TEXT)
- skills (TEXT) -- JSON array
- joinedAt (DATETIME)
- isAdmin (BOOLEAN)
```

### Projects Table
```sql
- id (TEXT PRIMARY KEY)
- name (TEXT)
- description (TEXT)
- type (TEXT) -- ai/ml, web-dev, mobile, etc.
- difficulty (TEXT) -- beginner, intermediate, advanced
- location (TEXT)
- status (TEXT) -- pending, approved, rejected
- createdBy (TEXT) -- user ID
- createdAt (DATETIME)
```

### User-Projects Junction Table
```sql
- userId (TEXT)
- projectId (TEXT)
- joinedAt (DATETIME)
```

## 🔗 API Endpoints

### Authentication
```bash
POST /api/auth/signup     # Register new user
POST /api/auth/login      # User login
GET  /api/auth/profile    # Get current user (requires auth)
```

### Projects
```bash
GET  /api/projects              # Get all approved projects
POST /api/projects              # Create new project (requires auth)
POST /api/projects/:id/join     # Join a project (requires auth)
DELETE /api/projects/:id/leave  # Leave a project (requires auth)
```

### Admin Only
```bash
GET /api/admin/projects/pending    # Get pending projects
PUT /api/admin/projects/:id/approve # Approve project
PUT /api/admin/projects/:id/reject  # Reject project
GET /api/admin/users               # Get all users
```

### User Profile
```bash
PUT /api/users/skills    # Update user skills (requires auth)
PUT /api/users/password  # Update password (requires auth)
```

### Health Check
```bash
GET /api/health         # Server health status
```

## 🔐 Authentication

The API uses **JWT Bearer tokens**. Include in request headers:

```javascript
Authorization: Bearer <your-jwt-token>
```

## 📝 Example Requests

### Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "location": "Seattle",
    "skills": ["JavaScript", "React"]
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Projects
```bash
curl http://localhost:5000/api/projects
```

### Create Project (Authenticated)
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "New Project",
    "description": "Project description",
    "type": "web-dev",
    "difficulty": "intermediate",
    "location": "Remote"
  }'
```

## 🌐 Hosting Options

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Render
1. Push code to GitHub
2. Connect to Render.com
3. Deploy as Web Service
4. Set environment variables

### Option 3: Vercel (Functions)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option 4: Heroku
```bash
# Install Heroku CLI, then:
heroku create mtc-backend
git push heroku main
heroku config:set JWT_SECRET=your-secret-key
```

## 🔧 Environment Variables

Create `.env` file:

```bash
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
```

## 🚧 Development

```bash
# Start development server with auto-reload
npm run dev

# Test endpoints
curl http://localhost:5000/api/health
```

## 📊 Features Included

- ✅ **User Registration & Login**
- ✅ **JWT Authentication**
- ✅ **Password Hashing** (bcrypt)
- ✅ **Admin Role Management**
- ✅ **Project CRUD Operations**
- ✅ **Admin Approval Workflow**
- ✅ **Project Membership Management**
- ✅ **User Profile Updates**
- ✅ **Secure API Endpoints**
- ✅ **Database Auto-initialization**
- ✅ **Mock Data Seeding**

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection prevention (parameterized queries)
- CORS configuration
- Admin-only protected routes
- Token expiration (7 days)

## 📈 Next Steps

1. **Add rate limiting** (express-rate-limit)
2. **Email verification** for signup
3. **Password reset** functionality
4. **File upload** for project images
5. **Real-time notifications** (Socket.io)
6. **Logging** (winston)
7. **Testing** (Jest)

---

🚀 **Ready to integrate with your frontend!** 