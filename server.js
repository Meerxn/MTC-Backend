require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mtc-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'mtc.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    skills TEXT,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    isAdmin BOOLEAN DEFAULT 0
  )`);

  // Projects table
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    createdBy TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users (id)
  )`);

  // User-Project relationships (many-to-many)
  db.run(`CREATE TABLE IF NOT EXISTS user_projects (
    userId TEXT,
    projectId TEXT,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, projectId),
    FOREIGN KEY (userId) REFERENCES users (id),
    FOREIGN KEY (projectId) REFERENCES projects (id)
  )`);

  // Insert mock projects if empty
  db.get("SELECT COUNT(*) as count FROM projects", (err, row) => {
    if (row.count === 0) {
      const mockProjects = [
        {
          id: 'mtc-ai-study',
          name: 'MTC AI Study Group',
          description: 'Weekly study sessions on machine learning fundamentals and building AI applications.',
          type: 'ai/ml',
          difficulty: 'intermediate',
          location: 'Seattle',
          status: 'approved'
        },
        {
          id: 'islamic-app-dev',
          name: 'Islamic Mobile App Development',
          description: 'Building mobile apps for the Muslim community - prayer times, Quran, community features.',
          type: 'mobile',
          difficulty: 'beginner',
          location: 'Remote',
          status: 'approved'
        },
        {
          id: 'mtc-web-platform',
          name: 'MTC Web Platform',
          description: 'Developing the main MTC website and member portal using Next.js and React.',
          type: 'web-dev',
          difficulty: 'intermediate',
          location: 'Seattle',
          status: 'approved'
        }
      ];

      mockProjects.forEach(project => {
        db.run(`INSERT INTO projects (id, name, description, type, difficulty, location, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [project.id, project.name, project.description, project.type, project.difficulty, project.location, project.status]
        );
      });
    }
  });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Helper function to generate user ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// ==================== AUTH ROUTES ====================

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, location, skills } = req.body;

    // Check if user exists
    db.get("SELECT id FROM users WHERE email = ?", [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Check if this is the first user (make them admin)
      db.get("SELECT COUNT(*) as count FROM users", async (err, countRow) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const isFirstUser = countRow.count === 0;
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = generateId();

        db.run(`INSERT INTO users (id, email, password, name, location, skills, isAdmin) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, email, hashedPassword, name, location, JSON.stringify(skills || []), isFirstUser ? 1 : 0],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create user' });
            }

            const token = jwt.sign(
              { id: userId, email, isAdmin: isFirstUser },
              JWT_SECRET,
              { expiresIn: '7d' }
            );

            res.status(201).json({
              message: 'User created successfully',
              token,
              user: {
                id: userId,
                email,
                name,
                location,
                skills: skills || [],
                projects: [],
                isAdmin: isFirstUser,
                joinedAt: new Date().toISOString()
              }
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get user's projects
      db.all(`SELECT projectId FROM user_projects WHERE userId = ?`, [user.id], (err, projectRows) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, isAdmin: user.isAdmin },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            location: user.location,
            skills: JSON.parse(user.skills || '[]'),
            projects: projectRows.map(row => row.projectId),
            isAdmin: user.isAdmin,
            joinedAt: user.joinedAt
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's projects
    db.all(`SELECT projectId FROM user_projects WHERE userId = ?`, [user.id], (err, projectRows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        location: user.location,
        skills: JSON.parse(user.skills || '[]'),
        projects: projectRows.map(row => row.projectId),
        isAdmin: user.isAdmin,
        joinedAt: user.joinedAt
      });
    });
  });
});

// ==================== PROJECT ROUTES ====================

// Get all approved projects
app.get('/api/projects', (req, res) => {
  db.all("SELECT * FROM projects WHERE status = 'approved'", (err, projects) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(projects.map(project => ({
      ...project,
      createdAt: project.createdAt
    })));
  });
});

// Create new project
app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, description, type, difficulty, location } = req.body;
  const projectId = generateId();

  db.run(`INSERT INTO projects (id, name, description, type, difficulty, location, status, createdBy) 
          VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [projectId, name, description, type, difficulty, location, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create project' });
      }
      res.status(201).json({ message: 'Project submitted for approval', projectId });
    }
  );
});

// Join project
app.post('/api/projects/:id/join', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  db.run(`INSERT OR IGNORE INTO user_projects (userId, projectId) VALUES (?, ?)`,
    [userId, projectId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to join project' });
      }
      res.json({ message: 'Successfully joined project' });
    }
  );
});

// Leave project
app.delete('/api/projects/:id/leave', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  db.run(`DELETE FROM user_projects WHERE userId = ? AND projectId = ?`,
    [userId, projectId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to leave project' });
      }
      res.json({ message: 'Successfully left project' });
    }
  );
});

// ==================== ADMIN ROUTES ====================

// Get pending projects (admin only)
app.get('/api/admin/projects/pending', authenticateToken, requireAdmin, (req, res) => {
  db.all("SELECT * FROM projects WHERE status = 'pending'", (err, projects) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(projects);
  });
});

// Approve project (admin only)
app.put('/api/admin/projects/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  const projectId = req.params.id;

  db.run("UPDATE projects SET status = 'approved' WHERE id = ?", [projectId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to approve project' });
    }
    res.json({ message: 'Project approved successfully' });
  });
});

// Reject project (admin only)
app.put('/api/admin/projects/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  const projectId = req.params.id;

  db.run("UPDATE projects SET status = 'rejected' WHERE id = ?", [projectId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to reject project' });
    }
    res.json({ message: 'Project rejected successfully' });
  });
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  db.all("SELECT id, email, name, location, skills, joinedAt, isAdmin FROM users", (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users.map(user => ({
      ...user,
      skills: JSON.parse(user.skills || '[]')
    })));
  });
});

// ==================== USER PROFILE ROUTES ====================

// Update user skills
app.put('/api/users/skills', authenticateToken, (req, res) => {
  const { skills } = req.body;
  const userId = req.user.id;

  db.run("UPDATE users SET skills = ? WHERE id = ?", [JSON.stringify(skills), userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update skills' });
    }
    res.json({ message: 'Skills updated successfully' });
  });
});

// Update user password
app.put('/api/users/password', authenticateToken, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update password' });
      }
      res.json({ message: 'Password updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MTC Backend is running!' });
});

// TEMPORARY: Debug endpoint to check users (REMOVE AFTER USE!)
app.get('/api/debug/users', (req, res) => {
  db.all('SELECT email, name FROM users', (err, rows) => {
    if (err) {
      console.error('Error checking users:', err);
      res.status(500).json({ error: 'Failed to check users' });
    } else {
      res.json({ users: rows, count: rows.length });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MTC Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📦 Database connection closed.');
    }
    process.exit(0);
  });
}); 