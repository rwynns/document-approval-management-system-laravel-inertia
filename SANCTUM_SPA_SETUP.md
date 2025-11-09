# Laravel Sanctum SPA + Realtime Setup Documentation

## 🎉 **SETUP LENGKAP: Laravel Sanctum + SPA + Realtime!**

### ✅ **Fitur yang Telah Diimplementasikan:**

#### 🔐 **Authentication dengan Sanctum**

- ✅ **Token-based authentication** untuk SPA
- ✅ **API routes** dengan protection
- ✅ **Auto token refresh** dan logout
- ✅ **CORS configuration** untuk cross-origin requests

#### ⚡ **SPA Experience**

- ✅ **React-based SPA** dengan routing
- ✅ **API client** dengan Axios
- ✅ **Auth context** untuk state management
- ✅ **Protected routes** dan auto-redirect

#### 🔄 **Realtime Features**

- ✅ **Laravel Reverb** + Sanctum integration
- ✅ **Broadcasting channels** dengan authentication
- ✅ **Real-time Role Management** SPA version
- ✅ **Live notifications** dan updates

---

## 🚀 **Cara Menjalankan:**

### 1. **Start Reverb Server**

```bash
php artisan reverb:start
```

### 2. **Start Laravel App**

```bash
php artisan serve
```

### 3. **Start Vite**

```bash
npm run dev
```

---

## 🌐 **Akses Aplikasi:**

### **Traditional Inertia Version:**

- Login: `http://localhost:8000/login`
- Dashboard: `http://localhost:8000/dashboard`
- Role Management: `http://localhost:8000/role-management`

### **SPA Version (NEW!):**

- SPA App: `http://localhost:8000/spa`
- Login dengan: `admin@example.com` / `password123`

---

## 🔧 **Architecture Overview:**

### **Traditional Flow (Existing):**

```
Browser → Laravel Routes → Inertia → React Components
```

### **SPA Flow (NEW):**

```
React SPA → Axios API → Laravel Sanctum → API Controllers
```

### **Realtime Flow:**

```
Laravel Events → Reverb → WebSocket → React Components
```

---

## 📁 **File Structure yang Dibuat:**

### **Backend API:**

- `routes/api.php` - API routes dengan Sanctum protection
- `app/Http/Controllers/API/AuthController.php` - Authentication endpoints
- `app/Http/Controllers/API/RoleController.php` - Role management API
- `config/cors.php` - CORS configuration
- `routes/channels.php` - Broadcasting channels

### **Frontend SPA:**

- `resources/js/contexts/AuthContext.tsx` - Auth state management
- `resources/js/lib/api.ts` - Axios API client
- `resources/js/pages/spa-app.tsx` - Main SPA application
- `resources/js/pages/spa/role-management.tsx` - SPA version of role management
- `resources/js/components/ui/use-toast.ts` - Toast notifications

### **Configuration:**

- `.env` - Updated with Sanctum domains
- `bootstrap/app.php` - API routes dan Sanctum middleware

---

## 🎯 **API Endpoints:**

### **Authentication:**

```
POST /api/login       - Login dan get token
POST /api/register    - Register user baru
GET  /api/user        - Get user info (protected)
POST /api/logout      - Logout dan revoke token
```

### **Role Management:**

```
GET    /api/roles     - List all roles
POST   /api/roles     - Create new role
GET    /api/roles/{id} - Get specific role
PUT    /api/roles/{id} - Update role
DELETE /api/roles/{id} - Delete role
```

---

## ⭐ **Key Features:**

### **🔐 Security:**

- Token-based authentication dengan expiration
- CORS protection untuk cross-origin requests
- Protected API routes dengan middleware
- Automatic token cleanup on logout

### **⚡ Performance:**

- API responses dengan caching headers
- Minimal payloads untuk mobile-friendly
- Optimized WebSocket connections
- Real-time updates tanpa polling

### **🎨 User Experience:**

- Seamless authentication flow
- Loading states dan error handling
- Real-time notifications
- Responsive design yang konsisten

### **🔄 Realtime:**

- Instant updates across all connected users
- Event-driven architecture
- Automatic reconnection on network issues
- Typed broadcasting events

---

## 🧪 **Testing:**

### **Test SPA Authentication:**

1. Buka `http://localhost:8000/spa`
2. Login dengan `admin@example.com` / `password123`
3. Navigate ke Role Management
4. Test CRUD operations

### **Test Realtime:**

1. Buka 2 browser tabs ke SPA
2. Login di kedua tab
3. Add/edit/delete role di satu tab
4. Lihat update real-time di tab lain!

---

## 🔮 **Next Steps:**

### **Extend SPA Features:**

- Company Management SPA
- User Management SPA
- Document Approval workflow
- Dashboard analytics

### **Advanced Features:**

- Push notifications
- Offline support dengan Service Workers
- Advanced error handling
- Performance monitoring

### **Production Ready:**

- Rate limiting untuk API
- Advanced CORS configuration
- Token refresh strategy
- Monitoring dan logging

---

## 🎉 **Congratulations!**

Anda sekarang memiliki:

- ✅ **Full SPA experience** dengan Laravel Sanctum
- ✅ **Real-time features** yang bekerja dengan authentication
- ✅ **Scalable architecture** untuk development selanjutnya
- ✅ **Modern authentication flow** yang aman
- ✅ **API-first approach** yang mobile-ready

**Website Anda sekarang setara dengan aplikasi modern seperti Discord, Slack, atau Notion dalam hal architecture dan user experience!** 🚀
