# AssetFlow - Modern IT & Asset Management ERP

AssetFlow is a responsive, full-stack enterprise resource planning (ERP) system designed for operations teams to track hardware inventory, manage software licenses, schedule audits, coordinate resource bookings (such as conference rooms and company vehicles), and log maintenance records.

It features a modern, premium design built using standard HTML5/CSS3/JS, styled with **Bootstrap 5**, and connected to a **Node.js/Express** backend backed by a **MySQL** database.

---

## 🚀 Key Features

1. **Role-Based Access Control (RBAC)**:
   - Customized dashboards and permissions for **Admins**, **Asset Managers**, **Department Heads**, and **Employees**.
2. **Secure Login & Authentication**:
   - JWT-based authentication.
   - **Demo Quick-Fill Autocomplete (Security Patched)**: Fills demo account emails for evaluation convenience but requires manual password input (`Password123!`) to prevent automated login bypasses.
3. **Department Head Promotion & Transition Logs**:
   - Assigning a new department head prompts the Admin to specify the old head's status: **Retired** (deactivates account), **Shifted to another city / Transferred** (updates notes), **Demoted to Employee**, or **Resigned**.
   - Tracks former department heads in the **Former Department Heads & Alumni** table with custom transition notes.
4. **Asset Tracking & Allocations**:
   - Create, update, and delete assets with status indicators.
   - Request assets, approve/reject allocations, and return assets.
5. **Resource Bookings**:
   - Check room/vehicle availability and book with overlapping time conflict prevention.
6. **Maintenance & Auditing**:
   - Schedule hardware/software audits, update audit progress, and manage maintenance repair cost logs.
7. **Targeted Notifications**:
   - Live alerts targeted by role (e.g. Asset Manager warnings) or user email.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Axios, SweetAlert2
- **Backend**: Node.js, Express, JSON Web Tokens (JWT)
- **Database**: MySQL (with automated table creation and default seeding)

---

## 📂 Project Structure

```
├── assetflow/
│   ├── backend/
│   │   ├── db.js          # Database setup, tables schema & seeder logic
│   │   ├── server.js      # Express application, routes, and authentication middlewares
│   │   ├── package.json   # Node server dependencies
│   │   └── .env           # Environment configurations (DB connection, JWT secret)
│   │
│   └── frontend/
│       ├── index.html     # Landing Page
│       ├── assets/
│       │   ├── css/       # Premium style tokens
│       │   └── js/        # api.js, auth.js, org-setup.js and routing logic
│       └── pages/
│           ├── login.html
│           ├── signup.html
│           ├── dashboard.html
│           ├── org-setup.html
│           └── ... (allocation, booking, maintenance pages)
└── README.md              # Main Documentation
```

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) installed.
- [MySQL Server](https://www.mysql.com/) installed and running locally.

### 1. Configure Backend environment
Navigate to the backend directory and configure the environment variables:
```bash
cd assetflow/backend
```
Create/edit the `.env` file:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=assetflow_db
JWT_SECRET=assetflow_super_secret_key_123!
```

### 2. Run the Backend Server
Install dependencies and start the server:
```bash
npm install
npm start
```
*Note: The server will automatically create the `assetflow_db` database, initialize the tables, and seed them with default data if empty.*

### 3. Open the Frontend
Since the frontend consists of flat HTML files, you can open `assetflow/frontend/index.html` directly in your browser, or use a local HTTP server such as VS Code's **Live Server** extension.

---

## 🔑 Default Credentials (All use Password: `Password123!`)

For quick testing, you can use the **Quick Demo Accounts** dropdown on the login screen to fill the email address and log in using the password: **`Password123!`**

| User Role | Email | Access Scope |
| :--- | :--- | :--- |
| **Admin** | `admin@assetflow.com` | Org configuration, department management, promotions |
| **Asset Manager** | `manager@assetflow.com` | Assets inventory, allocation requests, audit schedules |
| **IT Head** | `it-head@assetflow.com` | IT resource requests, department logs |
| **Employee** | `employee@assetflow.com` | Bookings, hardware requests |

---

## 🛡️ Fallback Sandbox (Offline Mode)
If the backend is not running or unreachable, the application automatically redirects calls to a **LocalStorage Fallback Store**, allowing you to preview the dashboard and interact with all ERP features without needing MySQL active.
