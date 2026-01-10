# Document Approval Management System

A comprehensive web-based application for managing document approvals, digital signatures, and organizational workflows. Built with modern web technologies to ensure performance, scalability, and a premium user experience.

## 🚀 Technology Stack

This project leverages the latest versions of the Laravel ecosystem and React:

- **Backend**: Laravel 12.x
- **Frontend**: React 19.x, Inertia.js 2.0
- **Styling**: Tailwind CSS 4.x, Shadcn UI
- **Database**: MySQL
- **Realtime**: Laravel Reverb (WebSockets)
- **Authentication**: Laravel Sanctum, Google OAuth (Socialite)
- **Testing**: Pest PHP

## 📋 System Requirements

Ensuring your environment meets these requirements is critical for successfully running the application:

- **PHP**: >= 8.3
- **Composer**: Latest version
- **Node.js**: >= 20.x
- **MySQL**: >= 8.0
- **Web Server**: Nginx or Apache

## 🛠️ Installation & Setup

Follow these steps to set up the project on your local machine or production server.

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/document-approval-management-system.git
cd document-approval-management-system
```

### 2. Install Dependencies

Install the backend (PHP) and frontend (Node) dependencies:

```bash
# Backend
composer install

# Frontend
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Open `.env` and set your specific configurations:

```ini
APP_NAME="Document Approval System"
APP_URL=http://your-domain.com

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Google OAuth (Required for Login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"

# Reverb (Realtime Notifications)
REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
```

### 4. Generate Application Key

```bash
php artisan key:generate
```

### 5. Database Setup & Seeding

Run the migrations to set up the database structure:

```bash
php artisan migrate
```

**🌱 Seeding Data (Important)**

To populate the database with initial master data (Jabatan, Companies, etc.) and default users, run the seeders:

```bash
# General Master Data
php artisan db:seed

# User Accounts (Specific for Handover)
# create 12 accounts: 1 Admin & 1 User for each of the 6 Jabatan levels
php artisan db:seed --class=UserJabatanSeeder
```

### 6. Storage Linking

Link the storage directory to the public directory for file accessibility:

```bash
php artisan storage:link
```

### 7. Build Assets

For development:

```bash
npm run dev
```

For production:

```bash
npm run build
```

---

## 👥 User Accounts (Seeder Generated)

After running `php artisan db:seed --class=UserJabatanSeeder`, the following accounts are available for testing and handover.

**Default Credentials:**

- **Password**: `password123`
- **PIN**: `12345678`

| Jabatan            | Admin Account                  | User Account                  |
| :----------------- | :----------------------------- | :---------------------------- |
| **Direktur Utama** | `admin.dirut@example.com`      | `user.dirut@example.com`      |
| **Direktur**       | `admin.direktur@example.com`   | `user.direktur@example.com`   |
| **Kepala Divisi**  | `admin.kadiv@example.com`      | `user.kadiv@example.com`      |
| **Manager**        | `admin.manager@example.com`    | `user.manager@example.com`    |
| **Supervisor**     | `admin.supervisor@example.com` | `user.supervisor@example.com` |
| **Staff**          | `admin.staff@example.com`      | `user.staff@example.com`      |

> **Note:** The `Super Administrator` account is also created via the main `DatabaseSeeder`:
>
> - **Email**: `superadmin@example.com`
> - **Password**: `password123`

---

## 🔑 Key Features

- **Multi-Level Approval Workflows**: Configure dynamic approval flows based on document types and user roles.
- **Digital Signatures**: secure digital signing of documents with strict identity verification.
- **Real-time Notifications**: Instant updates on document status changes via WebSockets.
- **Role-Based Access Control (RBAC)**: Granular permissions based on Position (Jabatan) and Role (Admin/User).
- **Context Switching**: Users can switch between different organizational contexts if assigned to multiple.
- **PDF Generation & Viewer**: Integrated PDF handling for document previews and finalization.

## 🚢 Deployment Notes

When deploying to production:

1.  Ensure `APP_ENV=production` and `APP_DEBUG=false` in `.env`.
2.  Optimize the application:
    ```bash
    php artisan optimize
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    ```
3.  Set up a Supervisor process for the Queue Worker and Reverb (WebSockets).
    - _See `laravel-worker.conf` and `laravel-reverb.conf` (if included) for configuration examples._
4.  Ensure the web server (Nginx/Apache) points to the `public` directory.

## 🤝 Support

For technical support or inquiries regarding this project, please contact the development team.

---

_Documentation generated on 2026-01-11_
