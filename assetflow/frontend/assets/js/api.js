/**
 * AssetFlow API Service Layer
 * Uses Axios to communicate with the Backend API.
 * Provides a fallback to LocalStorage for demonstration when the backend is unreachable.
 */

const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? 'http://localhost:3000/api'
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 (Unauthorized) and not already retrying
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Clear token and redirect to login if not already on auth pages
      const authPages = ['login.html', 'signup.html', 'forgot-password.html', 'otp-verification.html', 'reset-password.html'];
      const currentPage = window.location.pathname.split('/').pop();
      
      if (!authPages.includes(currentPage)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        Swal.fire({
          title: 'Session Expired',
          text: 'Please log in again.',
          icon: 'warning',
          confirmButtonColor: '#2563EB'
        }).then(() => {
          const isSubPage = window.location.pathname.includes('/pages/');
          window.location.href = isSubPage ? 'login.html' : 'pages/login.html';
        });
      }
    }
    return Promise.reject(error);
  }
);

// Helper to notify of Network/Server failures and fallback
function handleApiError(error, fallbackCallback) {
  console.warn("API Request Failed:", error);
  
  const isNetworkError = !error.response;
  
  if (isNetworkError) {
    // Notify user of connection issue and fallback
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
    });
    
    Toast.fire({
      icon: 'info',
      title: 'Connecting to local sandbox (Offline mode)'
    });
    
    if (fallbackCallback) {
      return fallbackCallback();
    }
  }
  
  // Extract error message
  const message = error.response && error.response.data && error.response.data.message
    ? error.response.data.message
    : 'Something went wrong. Please try again.';
    
  throw new Error(message);
}

// Local Storage Fallback Data Store (to ensure the frontend is interactive during review)
const fallbackStore = {
  get: (key, defaultValue) => {
    const val = localStorage.getItem(`af_fb_${key}`);
    return val ? JSON.parse(val) : defaultValue;
  },
  set: (key, value) => {
    localStorage.setItem(`af_fb_${key}`, JSON.stringify(value));
  }
};

// Initialize fallback store with sample data if empty
if (!localStorage.getItem('af_fb_initialized_v4')) {
  // Sample Organization
  fallbackStore.set('organization', {
    name: 'Acme India Private Limited',
    code: 'ACME-IN',
    industry: 'Technology',
    address: 'DLF Cyber City, Phase 3, Gurugram, Haryana, India',
    phone: '+91 98765 43210',
    website: 'https://acme-india.in'
  });

  // Sample Assets (INR currency format representation)
  fallbackStore.set('assets', [
    { id: 'AST-001', name: 'MacBook Pro 16"', type: 'Hardware', serial: 'C02DF43SMD6R', status: 'Active', value: 199000, location: 'Gurugram HQ', owner: 'Rahul Sharma' },
    { id: 'AST-002', name: 'Dell UltraSharp 32" Monitor', type: 'Hardware', serial: 'MX-09283-918', status: 'Active', value: 65000, location: 'Gurugram HQ', owner: 'Arjun Nair' },
    { id: 'AST-003', name: 'Adobe Creative Cloud License', type: 'Software', serial: 'LIC-ADOBE-CC-992', status: 'Active', value: 45000, location: 'Cloud', owner: 'Neha Sharma' },
    { id: 'AST-004', name: 'Cisco Core Switch', type: 'Infrastructure', serial: 'CS-RTR-4431', status: 'Maintenance', value: 350000, location: 'IT Server Room', owner: 'IT Dept' },
    { id: 'AST-005', name: 'Conference Table & Chairs', type: 'Furniture', serial: 'FUR-CONF-02', status: 'Active', value: 85000, location: 'Meeting Room B', owner: 'Facility Team' },
    { id: 'AF-0114', name: 'Dell Latitude Laptop', type: 'Hardware', serial: 'DELL-99218', status: 'Active', value: 95000, location: 'Desk E14', owner: 'Arjun Nair' }
  ]);

  // Sample Allocations
  fallbackStore.set('allocations', [
    { id: 'ALC-001', assetId: 'AST-001', assetName: 'MacBook Pro 16"', allocatedTo: 'Rahul Sharma', date: '2026-01-15', status: 'Approved', department: 'Management' },
    { id: 'ALC-002', assetId: 'AST-002', assetName: 'Dell UltraSharp 32" Monitor', allocatedTo: 'Arjun Nair', date: '2026-02-10', status: 'Approved', department: 'IT' },
    { id: 'ALC-003', assetId: 'AST-004', assetName: 'Cisco Core Switch', allocatedTo: 'IT Dept', date: '2026-03-01', status: 'Pending Approval', department: 'IT' },
    { id: 'ALC-004', assetId: 'AF-0114', assetName: 'Dell Latitude Laptop', allocatedTo: 'Arjun Nair', date: '2026-03-12', status: 'Approved', department: 'IT' },
    { id: 'ALC-005', assetId: 'AST-003', assetName: 'Adobe Creative Cloud License', allocatedTo: 'Neha Sharma', date: '2026-04-05', status: 'Approved', department: 'Marketing' }
  ]);

  // Sample Resource Bookings
  fallbackStore.set('bookings', [
    { id: 'BKG-001', resourceName: 'Conference Room A', bookedBy: 'Priya Iyer', date: '2026-07-13', startTime: '10:00', endTime: '11:30', status: 'Confirmed', department: 'IT' },
    { id: 'BKG-002', resourceName: 'Company EV Tata Nexon', bookedBy: 'Vikram Malhotra', date: '2026-07-14', startTime: '09:00', endTime: '17:00', status: 'Confirmed', department: 'Engineering' },
    { id: 'BKG-003', resourceName: 'Projector Screen B', bookedBy: 'Neha Sharma', date: '2026-07-15', startTime: '14:00', endTime: '16:00', status: 'Confirmed', department: 'Marketing' },
    { id: 'BKG-004', resourceName: 'Training Hall', bookedBy: 'Arjun Nair', date: '2026-07-16', startTime: '11:00', endTime: '13:00', status: 'Confirmed', department: 'IT' }
  ]);

  // Sample Maintenance Logs
  fallbackStore.set('maintenance', [
    { id: 'MNT-001', assetId: 'AF-0062', assetName: 'Projector bulb', type: 'Repair', description: 'not turning on', cost: 5000, date: '2026-07-10', status: 'Pending' },
    { id: 'MNT-002', assetId: 'AF-003', assetName: 'AC unit', type: 'Repair', description: 'noisy compressor', cost: 12000, date: '2026-07-09', status: 'Approved' },
    { id: 'MNT-003', assetId: 'AF-0078', assetName: 'Server Rack Fan', type: 'Scheduled', description: 'Tech: R varma', cost: 18000, date: '2026-07-08', status: 'Technician assigned' },
    { id: 'MNT-004', assetId: 'AF-897', assetName: 'Printer', type: 'Repair', description: 'Jam parts ordered', cost: 8500, date: '2026-07-07', status: 'In progress' },
    { id: 'MNT-005', assetId: 'AF-873', assetName: 'Chair repair', type: 'Repair', description: 'resolved 7 Jul', cost: 3500, date: '2026-07-07', status: 'Resolved' }
  ]);

  // Sample Audits
  fallbackStore.set('audits', [
    { id: 'AUD-001', name: 'Q2 Hardware Inventory Audit', date: '2026-06-30', auditor: 'Amit Patel', progress: 100, status: 'Completed' },
    { id: 'AUD-002', name: 'Software License Compliance Audit', date: '2026-08-15', auditor: 'Priya Iyer', progress: 10, status: 'In Progress' }
  ]);

  // Sample Notifications
  fallbackStore.set('notifications', [
    { id: 'NTF-001', title: 'Maintenance Overdue', message: 'Asset AST-004 Cisco Core Switch is overdue for firmware check.', type: 'warning', date: '2026-07-12 08:30', read: false },
    { id: 'NTF-002', title: 'Booking Confirmed', message: 'Your booking for Conference Room A has been confirmed for 2026-07-13.', type: 'success', date: '2026-07-11 14:20', read: false },
    { id: 'NTF-003', title: 'New Asset Assigned', message: 'Adobe Creative Cloud License has been assigned to Creative Team.', type: 'info', date: '2026-07-10 10:15', read: true }
  ]);

  // Seed default registered users
  fallbackStore.set('registered_users', [
    { email: 'admin@assetflow.com', password: 'Password123!', fullName: 'Rahul Sharma', role: 'Admin', department: 'Management', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', isVerified: true },
    { email: 'manager@assetflow.com', password: 'Password123!', fullName: 'Amit Patel', role: 'Asset Manager', department: 'Asset Management', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100', isVerified: true },
    { email: 'it-head@assetflow.com', password: 'Password123!', fullName: 'Priya Iyer', role: 'Department Head', department: 'IT', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', isVerified: true },
    { email: 'eng-head@assetflow.com', password: 'Password123!', fullName: 'Vikram Malhotra', role: 'Department Head', department: 'Engineering', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100', isVerified: true },
    { email: 'mkt-head@assetflow.com', password: 'Password123!', fullName: 'Neha Sharma', role: 'Department Head', department: 'Marketing', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100', isVerified: true },
    { email: 'employee@assetflow.com', password: 'Password123!', fullName: 'Arjun Nair', role: 'Employee', department: 'IT', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100', isVerified: true }
  ]);

  localStorage.setItem('af_fb_initialized_v4', 'true');
}

// Global API Services Module
const ApiService = {
  // --- AUTH SERVICES ---
  auth: {
    signup: async (userData) => {
      try {
        const res = await api.post('/auth/signup', userData);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          // Fallback signup: Bypass OTP, register directly
          const registeredUsers = fallbackStore.get('registered_users', []);
          if (registeredUsers.some(u => u.email === userData.email)) {
            throw new Error("Email already registered.");
          }
          const newUser = { ...userData, isVerified: true, id: 'USR-' + Math.floor(1000 + Math.random() * 9000) };
          registeredUsers.push(newUser);
          fallbackStore.set('registered_users', registeredUsers);
          return { success: true, message: "Signup successful! Please log in.", email: userData.email, bypassOtp: true };
        });
      }
    },

    verifyOtp: async (email, otp) => {
      try {
        const res = await api.post('/auth/verify-otp', { email, otp });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return { success: true, message: "Email verified successfully!" };
        });
      }
    },

    resendOtp: async (email) => {
      try {
        const res = await api.post('/auth/resend-otp', { email });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return { success: true, message: "New OTP sent successfully!" };
        });
      }
    },

    login: async (credentials) => {
      try {
        const res = await api.post('/auth/login', credentials);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const registeredUsers = fallbackStore.get('registered_users', []);
          const user = registeredUsers.find(u => u.email === credentials.email);
          if (!user) throw new Error("Invalid email or password.");
          
          if (user.password !== credentials.password) throw new Error("Invalid email or password.");
          if (!user.isVerified) {
            const err = new Error("Please verify your email before logging in.");
            err.unverified = true;
            throw err;
          }
          
          const userProfile = { 
            name: user.fullName || user.name, 
            email: user.email, 
            role: user.role || 'Employee', 
            department: user.department || 'IT',
            avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100' 
          };
          localStorage.setItem('token', 'fallback-mock-jwt-token-' + userProfile.role.replace(' ', ''));
          localStorage.setItem('user', JSON.stringify(userProfile));
          return { success: true, user: userProfile, token: 'fallback-mock-jwt-token-' + userProfile.role.replace(' ', '') };
        });
      }
    },

    forgotPassword: async (email) => {
      try {
        const res = await api.post('/auth/forgot-password', { email });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const registeredUsers = fallbackStore.get('registered_users', []);
          const userExists = credentials => true; // Allow mock for demo
          
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          localStorage.setItem('reset_email', email);
          localStorage.setItem('reset_otp', otp);
          
          console.log(`[OFFLINE DEV] Reset password OTP for ${email}: ${otp}`);
          return { success: true, message: "Reset code sent to your email." };
        });
      }
    },

    resetPassword: async (email, otp, newPassword) => {
      try {
        const res = await api.post('/auth/reset-password', { email, otp, newPassword });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const savedEmail = localStorage.getItem('reset_email');
          const savedOtp = localStorage.getItem('reset_otp');
          
          if (email !== savedEmail || otp !== savedOtp) {
            throw new Error("Invalid email or OTP code.");
          }
          
          // Modify password in registered users list
          const registeredUsers = fallbackStore.get('registered_users', []);
          const user = registeredUsers.find(u => u.email === email);
          if (user) {
            user.password = newPassword;
            fallbackStore.set('registered_users', registeredUsers);
          }
          
          localStorage.removeItem('reset_email');
          localStorage.removeItem('reset_otp');
          return { success: true, message: "Password reset successfully!" };
        });
      }
    }
  },

  // --- ORGANIZATION SERVICES ---
  organization: {
    get: async () => {
      try {
        const res = await api.get('/org');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('organization');
        });
      }
    },
    save: async (orgData) => {
      try {
        const res = await api.put('/org', orgData);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          fallbackStore.set('organization', orgData);
          return { success: true, message: "Organization setup saved successfully!" };
        });
      }
    }
  },

  // --- ASSET SERVICES ---
  assets: {
    list: async () => {
      try {
        const res = await api.get('/assets');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('assets');
        });
      }
    },
    create: async (asset) => {
      try {
        const res = await api.post('/assets', asset);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const assets = fallbackStore.get('assets');
          const newAsset = { ...asset, id: 'AST-' + String(assets.length + 1).padStart(3, '0') };
          assets.push(newAsset);
          fallbackStore.set('assets', assets);
          return { success: true, asset: newAsset, message: "Asset added successfully!" };
        });
      }
    },
    update: async (id, assetData) => {
      try {
        const res = await api.put(`/assets/${id}`, assetData);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const assets = fallbackStore.get('assets');
          const idx = assets.findIndex(a => a.id === id);
          if (idx !== -1) {
            assets[idx] = { ...assets[idx], ...assetData };
            fallbackStore.set('assets', assets);
            return { success: true, message: "Asset updated successfully!" };
          }
          throw new Error("Asset not found");
        });
      }
    },
    delete: async (id) => {
      try {
        const res = await api.delete(`/assets/${id}`);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          let assets = fallbackStore.get('assets');
          assets = assets.filter(a => a.id !== id);
          fallbackStore.set('assets', assets);
          return { success: true, message: "Asset deleted successfully!" };
        });
      }
    }
  },

  // --- ALLOCATION & TRANSFER SERVICES ---
  allocations: {
    list: async () => {
      try {
        const res = await api.get('/allocations');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('allocations');
        });
      }
    },
    create: async (allocation) => {
      try {
        const res = await api.post('/allocations', allocation);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const allocations = fallbackStore.get('allocations');
          const newAlloc = { ...allocation, id: 'ALC-' + String(allocations.length + 1).padStart(3, '0'), status: 'Pending Approval' };
          allocations.push(newAlloc);
          fallbackStore.set('allocations', allocations);
          return { success: true, allocation: newAlloc, message: "Allocation request created!" };
        });
      }
    },
    action: async (id, status) => {
      try {
        const res = await api.post(`/allocations/${id}/action`, { status });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const allocations = fallbackStore.get('allocations');
          const idx = allocations.findIndex(a => a.id === id);
          if (idx !== -1) {
            allocations[idx].status = status;
            fallbackStore.set('allocations', allocations);
            return { success: true, message: `Allocation ${status.toLowerCase()} successfully!` };
          }
          throw new Error("Allocation not found");
        });
      }
    }
  },

  // --- RESOURCE BOOKING SERVICES ---
  bookings: {
    list: async () => {
      try {
        const res = await api.get('/bookings');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('bookings');
        });
      }
    },
    create: async (booking) => {
      try {
        const res = await api.post('/bookings', booking);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const bookings = fallbackStore.get('bookings');
          const newBooking = { ...booking, id: 'BKG-' + String(bookings.length + 1).padStart(3, '0'), status: 'Confirmed' };
          bookings.push(newBooking);
          fallbackStore.set('bookings', bookings);
          return { success: true, booking: newBooking, message: "Resource booked successfully!" };
        });
      }
    },
    cancel: async (id) => {
      try {
        const res = await api.delete(`/bookings/${id}`);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const bookings = fallbackStore.get('bookings');
          const idx = bookings.findIndex(b => b.id === id);
          if (idx !== -1) {
            bookings[idx].status = 'Cancelled';
            fallbackStore.set('bookings', bookings);
            return { success: true, message: "Booking cancelled successfully!" };
          }
          throw new Error("Booking not found");
        });
      }
    }
  },

  // --- MAINTENANCE SERVICES ---
  maintenance: {
    list: async () => {
      try {
        const res = await api.get('/maintenance');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('maintenance');
        });
      }
    },
    create: async (log) => {
      try {
        const res = await api.post('/maintenance', log);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const maintenance = fallbackStore.get('maintenance');
          const newLog = { ...log, id: 'MNT-' + String(maintenance.length + 1).padStart(3, '0'), status: 'Pending' };
          maintenance.push(newLog);
          fallbackStore.set('maintenance', maintenance);
          return { success: true, log: newLog, message: "Maintenance log added successfully!" };
        });
      }
    },
    updateStatus: async (id, status) => {
      try {
        const res = await api.put(`/maintenance/${id}/status`, { status });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const maintenance = fallbackStore.get('maintenance');
          const idx = maintenance.findIndex(m => m.id === id);
          if (idx !== -1) {
            maintenance[idx].status = status;
            fallbackStore.set('maintenance', maintenance);
            return { success: true, message: "Maintenance status updated!" };
          }
          throw new Error("Log not found");
        });
      }
    }
  },

  // --- AUDIT SERVICES ---
  audits: {
    list: async () => {
      try {
        const res = await api.get('/audits');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('audits');
        });
      }
    },
    create: async (audit) => {
      try {
        const res = await api.post('/audits', audit);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const audits = fallbackStore.get('audits');
          const newAudit = { ...audit, id: 'AUD-' + String(audits.length + 1).padStart(3, '0'), progress: 0, status: 'In Progress' };
          audits.push(newAudit);
          fallbackStore.set('audits', audits);
          return { success: true, audit: newAudit, message: "Audit scheduled successfully!" };
        });
      }
    },
    updateProgress: async (id, progress) => {
      try {
        const res = await api.put(`/audits/${id}/progress`, { progress });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const audits = fallbackStore.get('audits');
          const idx = audits.findIndex(a => a.id === id);
          if (idx !== -1) {
            audits[idx].progress = progress;
            if (progress === 100) {
              audits[idx].status = 'Completed';
            }
            fallbackStore.set('audits', audits);
            return { success: true, message: "Audit progress updated!" };
          }
          throw new Error("Audit record not found");
        });
      }
    }
  },

  // --- NOTIFICATIONS SERVICES ---
  notifications: {
    list: async () => {
      try {
        const res = await api.get('/notifications');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('notifications');
        });
      }
    },
    markAsRead: async (id) => {
      try {
        const res = await api.post(`/notifications/${id}/read`);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const notifications = fallbackStore.get('notifications');
          const idx = notifications.findIndex(n => n.id === id);
          if (idx !== -1) {
            notifications[idx].read = true;
            fallbackStore.set('notifications', notifications);
            return { success: true };
          }
          throw new Error("Notification not found");
        });
      }
    },
    clearAll: async () => {
      try {
        const res = await api.delete('/notifications');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          fallbackStore.set('notifications', []);
          return { success: true };
        });
      }
    }
  },

  // --- PROFILE & SETTINGS ---
  profile: {
    update: async (profileData) => {
      try {
        const res = await api.put('/profile', profileData);
        // Sync local user info
        localStorage.setItem('user', JSON.stringify(res.data.user));
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const user = JSON.parse(localStorage.getItem('user')) || {};
          const updatedUser = { ...user, ...profileData };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return { success: true, user: updatedUser, message: "Profile updated successfully!" };
        });
      }
    },
    changePassword: async (pwdData) => {
      try {
        const res = await api.post('/profile/change-password', pwdData);
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          // Simulating password check
          if (pwdData.currentPassword === '') {
            throw new Error("Current password cannot be empty.");
          }
          return { success: true, message: "Password updated successfully!" };
        });
      }
    }
  },

  // --- USER MANAGEMENT SERVICES ---
  users: {
    list: async () => {
      try {
        const res = await api.get('/users');
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          return fallbackStore.get('registered_users', []);
        });
      }
    },
    updateRole: async (email, role, department) => {
      try {
        const res = await api.put('/users/role', { email, role, department });
        return res.data;
      } catch (err) {
        return handleApiError(err, () => {
          const registeredUsers = fallbackStore.get('registered_users', []);
          
          // Demote existing head if assigning a new head
          if (role === 'Department Head') {
            registeredUsers.forEach(u => {
              if (u.department === department && u.role === 'Department Head') {
                u.role = 'Employee';
              }
            });
          }

          const user = registeredUsers.find(u => u.email === email);
          if (user) {
            user.role = role;
            user.department = department;
            fallbackStore.set('registered_users', registeredUsers);
            
            // Sync with current user profile if active
            const loggedInUser = JSON.parse(localStorage.getItem('user')) || {};
            if (loggedInUser.email === email) {
              const updatedProfile = { ...loggedInUser, role, department };
              localStorage.setItem('user', JSON.stringify(updatedProfile));
            }
            
            return { success: true, message: `Assigned ${user.fullName || user.name} as Head of ${department} department.` };
          }
          throw new Error("User not found.");
        });
      }
    }
  }
};
window.ApiService = ApiService;
