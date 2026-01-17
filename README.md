# Short Break System 🏢

A comprehensive web application designed to help organizations manage employee breaks efficiently and promote workplace wellness. This system provides real-time break tracking, admin dashboards for analytics, and callback management for follow-ups.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Default Credentials](#default-credentials)
- [API Routes](#api-routes)
- [Database](#database)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Employee Break Management**
  - Track break start and end times
  - Monitor daily break quotas
  - View break history and analytics

- **Admin Dashboard**
  - Real-time employee break monitoring
  - System analytics and reports
  - Employee management
  - Break quota configuration

- **Authentication & Security**
  - Role-based access control (Admin/SuperAdmin/Employee)
  - Secure password hashing with bcrypt
  - Protected routes and API endpoints

- **Real-time Notifications**
  - Broadcast ticker system
  - System-wide announcements
  - Employee notifications

- **Callback Management**
  - Schedule and manage follow-ups
  - Callback tracking
  - Status management

- **Database Seeding**
  - Dummy data generation for testing
  - Easy database setup and initialization

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - ORM
- **SQLite** - Database
- **bcrypt** - Password hashing
- **jsonwebtoken** - Authentication

### Development
- **ESLint** - Code linting
- **npm** - Package manager

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **Windows** (Project includes .bat file for Windows, but can run on macOS/Linux)

## 💻 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/abdulmanan69/short-break-system.git
cd short-break-system
```

### Step 2: Install Root Dependencies

```bash
npm install
```

### Step 3: Install Server Dependencies

```bash
cd server
npm install
cd ..
```

### Step 4: Install Client Dependencies

```bash
cd client
npm install
cd ..
```

## 🚀 Setup Instructions

### Step 1: Initialize the Database

First, set up the database with the schema:

```bash
cd server
node checkDB.js
cd ..
```

### Step 2: Seed Dummy Data (Optional)

To populate the database with dummy employee data and break logs:

```bash
cd server
node generateDummyData.js
cd ..
```

Or create just the admin user:

```bash
cd server
node seed.js
cd ..
```

### Step 3: Configure Environment Variables

The application uses default configurations. If you need to customize:

#### Server Configuration (server/config/database.js)
- Default port: `5000`
- Database: SQLite (server/database.sqlite)

#### Client Configuration (client/src/config.js)
- API base URL: `http://localhost:5000/api`

## 🎯 Running the Application

### Option 1: Using the Batch File (Windows Only)

Simply run the provided batch file:

```bash
RUN_SYSTEM.bat
```

This will automatically start both the server and client.

### Option 2: Manual Start

#### Terminal 1 - Start the Backend Server

```bash
cd server
npm start
```

The server will run on: `http://localhost:5000`

#### Terminal 2 - Start the Frontend Development Server

```bash
cd client
npm run dev
```

The client will typically run on: `http://localhost:5173`

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## 📁 Project Structure

```
short-break-system/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   │   ├── BroadcastTicker.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/                 # Context API
│   │   │   └── AuthContext.jsx
│   │   ├── pages/                   # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── EmployeeDashboard.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── config.js                # API configuration
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                          # Express backend
│   ├── config/
│   │   └── database.js              # Database configuration
│   ├── models/                      # Database models
│   │   ├── User.js
│   │   ├── BreakLog.js
│   │   ├── Callback.js
│   │   ├── SystemSetting.js
│   │   └── index.js
│   ├── routes/                      # API routes
│   │   ├── auth.js                  # Authentication routes
│   │   ├── admin.js                 # Admin routes
│   │   ├── break.js                 # Break management routes
│   │   └── callback.js              # Callback routes
│   ├── index.js                     # Express server entry point
│   ├── seed.js                      # Create admin user
│   ├── generateDummyData.js         # Generate test data
│   ├── checkDB.js                   # Initialize database
│   ├── package.json
│   └── database.sqlite              # SQLite database file
│
├── package.json                     # Root package.json
├── RUN_SYSTEM.bat                   # Windows batch file to run both servers
└── README.md                        # This file
```

## 🔐 Default Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** SuperAdmin

### Dummy Employee Accounts
All dummy employees have the password: `pass123`

| Username | Password | Name |
|----------|----------|------|
| john_doe | pass123 | John Doe |
| sarah_smith | pass123 | Sarah Smith |
| mike_ross | pass123 | Mike Ross |
| emma_wilson | pass123 | Emma Wilson |

## 🔌 API Routes

### Authentication Routes (`/api/auth`)
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user info

### Break Routes (`/api/break`)
- `POST /start` - Start a break
- `POST /end` - End current break
- `GET /history` - Get break history
- `GET /today` - Get today's breaks

### Admin Routes (`/api/admin`)
- `GET /employees` - List all employees
- `GET /breaks` - Get all breaks (filtered)
- `GET /analytics` - Get analytics data
- `PUT /settings` - Update system settings

### Callback Routes (`/api/callback`)
- `POST /create` - Create a callback
- `GET /list` - List callbacks
- `PUT /update/:id` - Update callback status

## 📊 Database

The application uses **SQLite** for data persistence. The database file is located at:
```
server/database.sqlite
```

### Database Models

**User**
- Stores employee and admin information
- Fields: id, username, password, name, role, dailyQuotaMinutes, isActive, createdAt, updatedAt

**BreakLog**
- Records all employee breaks
- Fields: id, userId, startTime, endTime, durationMinutes, createdAt

**Callback**
- Manages follow-up callbacks
- Fields: id, userId, scheduledTime, status, reason, createdAt

**SystemSetting**
- Stores system-wide configurations
- Fields: id, key, value, createdAt, updatedAt

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🆘 Troubleshooting

### Issue: Database not found
**Solution:** Run `node server/checkDB.js` to initialize the database

### Issue: Dummy data not created
**Solution:** Run `node server/generateDummyData.js`

### Issue: Port already in use
**Solution:** The server uses port 5000 and client uses port 5173. Ensure these ports are available or modify the configuration files.

### Issue: npm modules not installed
**Solution:** Delete `node_modules` folder and `package-lock.json`, then run `npm install` in the root, server, and client directories.

## 📞 Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

---

**Happy coding! 🚀**
