import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ban, CheckCircle, Trash2, Shield, Plus, Users, X, Upload, AlertTriangle, UserCheck, FileText, Download, AlertCircle, Eye, UserMinus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

export default function UserManagement() {
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const isPlatform = location.pathname.startsWith('/platform-admin');
  
  // Theme configuration based on admin type
  const theme = {
    primary: isPlatform ? 'amber-500' : 'emerald-500',
    primaryBg: isPlatform ? 'bg-amber-500' : 'bg-emerald-500',
    primaryText: isPlatform ? 'text-amber-400' : 'text-emerald-400',
    primaryBorder: isPlatform ? 'border-amber-500/20' : 'border-emerald-500/20',
    primaryShadow: isPlatform ? 'shadow-amber-500/20' : 'shadow-emerald-500/20',
    hoverBg: isPlatform ? 'hover:bg-amber-500/10' : 'hover:bg-emerald-500/10',
    accentText: isPlatform ? 'text-amber-100/20' : 'text-emerald-100/20',
    ring: isPlatform ? 'focus:ring-amber-500' : 'focus:ring-emerald-500',
    glow: isPlatform ? 'bg-amber-600' : 'bg-emerald-600',
    tealGlow: isPlatform ? 'bg-orange-600' : 'bg-teal-600'
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [joinedFrom, setJoinedFrom] = useState('');
  const [joinedTo, setJoinedTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [profileSummary, setProfileSummary] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'learner' });
  const [csvStudents, setCsvStudents] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [csvError, setCsvError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [registrationSummary, setRegistrationSummary] = useState(null);
  const [roleDropdownId, setRoleDropdownId] = useState(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState({ top: 0, left: 0 });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    actionType: '',
    data: null
  });

  const isProtectedUser = (targetUser) => {
    const currentUserId = currentUser?.id || currentUser?._id;
    return targetUser?.id === currentUserId
      || targetUser?.role === 'admin'
      || targetUser?.role === 'super_admin'
      || targetUser?.role === 'platform_owner';
  };

  const formatDate = (dateString, fallback = 'N/A') => {
    if (!dateString) return fallback;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatMoney = (amount, currency = 'INR') => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }).format(Number(amount) || 0);
    } catch {
      return `${currency} ${Number(amount) || 0}`;
    }
  };

  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterRole) params.append('role', filterRole);
      if (filterStatus) params.append('status', filterStatus);
      if (joinedFrom) params.append('joinedFrom', joinedFrom);
      if (joinedTo) params.append('joinedTo', joinedTo);
      
      const response = await apiClient.get(`/admin/users?${params.toString()}`);
      // Filter out root platform admin (platform_owner) from frontend visibility
      const filteredUsers = response.data.data.users.filter(u => u.role !== 'platform_owner');
      setUsers(filteredUsers);
      setTotalPages(response.data.data.pagination.pages);
      setSelectedUserIds(prev => prev.filter(id => filteredUsers.some(u => u.id === id)));
    } catch (error) {
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchUsers, searchTerm ? 300 : 0);
    return () => clearTimeout(timer);
  }, [page, searchTerm, filterRole, filterStatus, joinedFrom, joinedTo]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleBanStatus = (userId, currentlyBanned, targetUser) => {
    if (isProtectedUser(targetUser)) {
      showToast('Admin accounts cannot be deactivated from this page.', 'error');
      return;
    }

    setConfirmModal({
      show: true,
      title: currentlyBanned ? 'Restore User?' : 'Restrict User?',
      message: currentlyBanned 
        ? 'Are you sure you want to restore network access for this user?' 
        : 'Are you sure you want to terminate all platform access for this user?',
      actionType: 'ban',
      onConfirm: async () => {
        try {
          await apiClient.patch(`/admin/users/${userId}/ban`, {
            banned: !currentlyBanned,
            reason: currentlyBanned ? 'Admin unban' : 'Admin ban'
          });
          showToast(currentlyBanned ? 'User unbanned' : 'User banned');
          fetchUsers();
        } catch (error) {
          showToast(error.response?.data?.message || 'Failed to update ban status', 'error');
        }
      }
    });
  };

  const handleSuspendStatus = (userId, currentlySuspended, targetUser) => {
    if (isProtectedUser(targetUser)) {
      showToast('Admin accounts cannot be suspended from this page.', 'error');
      return;
    }

    setConfirmModal({
      show: true,
      title: currentlySuspended ? 'Restore User?' : 'Suspend User?',
      message: currentlySuspended
        ? 'Are you sure you want to restore access for this user?'
        : 'Are you sure you want to temporarily suspend this user?',
      actionType: 'suspend',
      onConfirm: async () => {
        try {
          await apiClient.patch(`/admin/users/${userId}/suspend`, {
            suspended: !currentlySuspended,
            reason: currentlySuspended ? 'Admin restore' : 'Admin suspension'
          });
          showToast(currentlySuspended ? 'User restored' : 'User suspended');
          fetchUsers();
        } catch (error) {
          showToast(error.response?.data?.message || 'Failed to update suspension status', 'error');
        }
      }
    });
  };

  const handleBulkSuspend = () => {
    if (selectedUserIds.length === 0) return;

    setConfirmModal({
      show: true,
      title: 'Bulk Suspend Users?',
      message: `Suspend ${selectedUserIds.length} selected user${selectedUserIds.length === 1 ? '' : 's'}? Protected accounts will be skipped.`,
      actionType: 'suspend',
      onConfirm: async () => {
        try {
          const response = await apiClient.patch('/admin/users/bulk-suspend', {
            userIds: selectedUserIds,
            reason: 'Bulk suspend from user management'
          });
          const data = response.data?.data || {};
          showToast(`Suspended ${data.suspended?.length || 0}; failed ${data.failed?.length || 0}.`);
          setSelectedUserIds([]);
          fetchUsers();
        } catch (error) {
          showToast(error.response?.data?.message || 'Bulk suspend failed', 'error');
        }
      }
    });
  };

  const exportSelectedUsers = () => {
    if (selectedUsers.length === 0) return;

    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = ['Name', 'Email', 'Role', 'Status', 'Join Date', 'Last Login'];
    const rows = selectedUsers.map((u) => [
      u.name,
      u.email,
      u.role,
      u.status,
      formatDate(u.createdAt),
      formatDate(u.lastLoginAt, 'Never')
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const openProfileSummary = async (targetUser) => {
    setProfileUser(targetUser);
    setProfileSummary(null);
    setProfileLoading(true);
    try {
      const response = await apiClient.get(`/admin/users/${targetUser.id}/profile-summary`);
      setProfileSummary(response.data?.data || null);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to load user profile', 'error');
      setProfileUser(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangeRole = (userId, newRole, targetUser) => {
    if (isProtectedUser(targetUser)) {
      showToast("Security lock active: Administrative roles cannot be altered.", "error");
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Change User Role?',
      message: `Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`,
      actionType: 'role',
      onConfirm: async () => {
        try {
          await apiClient.patch(`/admin/users/${userId}/role`, {
            role: newRole,
            reason: 'Admin role change'
          });
          showToast(`User role updated to ${newRole}`);
          fetchUsers();
        } catch (error) {
          showToast(error.response?.data?.message || 'Failed to change role', 'error');
        }
      }
    });
  };
   const handleDelete = (userId, targetUser) => {
    if (isProtectedUser(targetUser)) {
      showToast('Admin accounts cannot be deleted from this page.', 'error');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Delete User?',
      message: 'Are you sure you want to remove this user? They will be soft deleted for 30 days.',
      actionType: 'delete',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/admin/users/${userId}`);
          showToast('User deleted successfully');
          fetchUsers();
        } catch (error) {
          showToast(error.response?.data?.message || 'Failed to delete user', 'error');
        }
      }
    });
  };

  const handleApprove = (userId, userName) => {
    setConfirmModal({
      show: true,
      title: 'Approve Tutor?',
      message: `Are you sure you want to grant ${userName} full tutor access to the platform?`,
      actionType: 'approve',
      onConfirm: async () => {
        try {
          await apiClient.patch(`/admin/users/${userId}/approve-tutor`);
          showToast(`Tutor ${userName} approved successfully`);
          fetchUsers();
        } catch (error) {
          showToast(error.response?.data?.message || 'Failed to approve tutor', 'error');
        }
      }
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await apiClient.post('/admin/users', newUser);
      const { credentials, emailStatus, emailError } = response.data.data;
      
      const statusMsg = emailStatus === 'sent' 
        ? 'User created and invitation sent.' 
        : `User created but email failed: ${emailError}`;
      
      showToast(statusMsg, emailStatus === 'sent' ? 'success' : 'error');
      
      setRegistrationSummary({
        type: 'single',
        user: { ...newUser, ...credentials, emailStatus, emailError }
      });
      setShowSummaryModal(true);
      
      setShowAddModal(false);
      setNewUser({ name: '', email: '', role: 'learner' });
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const handleCSVUpload = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showToast('Please upload a valid CSV file.', 'error');
      return;
    }
    
    setFileName(file.name);
    setCsvError('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsedRows = parseCSV(text);
        if (parsedRows.length === 0) {
          setCsvError('The CSV file appears to be empty or lacks data.');
          setCsvStudents([]);
          return;
        }

        // Detect headers
        const firstRow = parsedRows[0].map(h => h.trim().toLowerCase());
        let nameIdx = -1;
        let emailIdx = -1;

        // Try mapping by matching headers
        firstRow.forEach((col, idx) => {
          if (col.includes('name') || col.includes('username') || col.includes('full name') || col.includes('user id')) {
            nameIdx = idx;
          } else if (col.includes('email') || col.includes('mail') || col.includes('email address') || col.includes('id')) {
            emailIdx = idx;
          }
        });

        // Fallback: assume column 0 is Name and column 1 is Email if header matching failed
        if (nameIdx === -1) nameIdx = 0;
        if (emailIdx === -1) emailIdx = firstRow.length > 1 ? 1 : 0;

        const dataRows = parsedRows.slice(1);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const processed = [];
        const seenEmails = new Set();

        dataRows.forEach((row, index) => {
          // Skip completely empty lines
          if (row.every(cell => cell.trim() === '')) return;

          const name = (row[nameIdx] || '').trim();
          const email = (row[emailIdx] || '').trim();

          let error = '';
          let isValid = true;

          if (!name) {
            error = 'Name is required';
            isValid = false;
          } else if (!email) {
            error = 'Email is required';
            isValid = false;
          } else if (!emailRegex.test(email)) {
            error = 'Invalid email format';
            isValid = false;
          }

          const isDuplicate = seenEmails.has(email.toLowerCase());
          if (isValid && isDuplicate) {
            error = 'Duplicate email in CSV';
            isValid = false;
          }
          if (email) {
            seenEmails.add(email.toLowerCase());
          }

          processed.push({
            name,
            email,
            isValid,
            error,
            isDuplicate
          });
        });

        if (processed.length === 0) {
          setCsvError('No valid data records found in the CSV.');
          setCsvStudents([]);
          return;
        }

        setCsvStudents(processed);
      } catch (err) {
        setCsvError('Failed to parse CSV file: ' + err.message);
        setCsvStudents([]);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVUpload(e.dataTransfer.files[0]);
    }
  };

  const removeCsvRow = (index) => {
    const updated = csvStudents.filter((_, i) => i !== index);
    
    // Re-validate duplicates dynamically
    const seenEmails = new Set();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const revalidated = updated.map(student => {
      let error = '';
      let isValid = true;
      
      if (!student.name) {
        error = 'Name is required';
        isValid = false;
      } else if (!student.email) {
        error = 'Email is required';
        isValid = false;
      } else if (!emailRegex.test(student.email)) {
        error = 'Invalid email format';
        isValid = false;
      }
      
      const isDuplicate = seenEmails.has(student.email.toLowerCase());
      if (isValid && isDuplicate) {
        error = 'Duplicate email in CSV';
        isValid = false;
      }
      if (student.email) {
        seenEmails.add(student.email.toLowerCase());
      }
      
      return {
        ...student,
        isValid,
        error,
        isDuplicate
      };
    });
    
    setCsvStudents(revalidated);
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Full Name,Email Address\nJohn Doe,john.doe@example.com\nJane Smith,jane.smith@example.com\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mass_registration_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkRegister = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const validStudents = csvStudents.filter(s => s.isValid);

      if (validStudents.length === 0) {
        showToast('Please import a CSV with at least one valid student record', 'error');
        setActionLoading(false);
        return;
      }

      // Check and slice to maximum of 100 students
      const studentsToRegister = validStudents.slice(0, 100).map(s => ({
        name: s.name,
        email: s.email
      }));

      const response = await apiClient.post('/admin/users/bulk', { students: studentsToRegister });
      const { success, failed } = response.data.data;
      
      setRegistrationSummary({
        type: 'bulk',
        success,
        failed
      });
      setShowSummaryModal(true);
      
      showToast(`Bulk registration completed. ${success.length} success, ${failed.length} failed.`);
      setShowBulkModal(false);
      
      // Clear csv states
      setCsvStudents([]);
      setFileName('');
      setCsvError('');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Bulk registration failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8"
      >

        <div className={isPlatform ? "flex gap-4" : "flex gap-4 ml-auto"}>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all shadow-sm"
          >
            <Users size={20} />
            Mass Student Register
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className={`flex items-center gap-2 ${theme.primaryBg} text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${theme.primaryShadow}`}
          >
            <Plus size={20} />
            Add User
          </motion.button>
        </div>
      </motion.div>

      {toast.show && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-8 right-8 p-4 rounded-2xl shadow-2xl z-[200] text-white font-bold glass-panel border-l-4 ${toast.type === 'error' ? 'border-red-500' : `border-${theme.primary}`}`}
        >
          {toast.message}
        </motion.div>
      )}

      <div className="glass-card rounded-[32px] overflow-hidden border border-white/5">
        <div className="p-8 border-b border-white/5 flex flex-col gap-4 bg-white/[0.02]">
          <div className="flex flex-col xl:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.accentText}`} size={20} />
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className={`w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:${theme.accentText} focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex gap-4 w-full xl:w-auto">
            <select 
              value={filterRole} 
              onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              className={`flex-1 md:flex-none px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 ${theme.ring} transition-all appearance-none cursor-pointer`}
            >
              <option value="" className="bg-[#0f172a]">All Roles</option>
              <option value="learner" className="bg-[#0f172a]">Learners</option>
              <option value="tutor" className="bg-[#0f172a]">Tutors</option>
              <option value="institution_admin" className="bg-[#0f172a]">Institution Admins</option>
              <option value="platform_admin" className="bg-[#0f172a]">Platform Admins</option>
              <option value="admin" className="bg-[#0f172a]">Legacy Admins</option>
            </select>
            <select 
              value={filterStatus} 
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className={`flex-1 md:flex-none px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 ${theme.ring} transition-all appearance-none cursor-pointer`}
            >
              <option value="" className="bg-[#0f172a]">All Statuses</option>
              <option value="active" className="bg-[#0f172a]">Active</option>
              <option value="pending_approval" className="bg-[#0f172a]">Pending Approval</option>
              <option value="suspended" className="bg-[#0f172a]">Suspended</option>
              <option value="banned" className="bg-[#0f172a]">Banned</option>
              <option value="rejected" className="bg-[#0f172a]">Rejected</option>
            </select>
          </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[220px_220px_auto] gap-4">
            <label className="relative block">
              <span className={`absolute left-6 top-2 text-[9px] font-black uppercase tracking-[0.2em] ${theme.accentText}`}>
                From
              </span>
              <input
                type="date"
                value={joinedFrom}
                onChange={(e) => { setJoinedFrom(e.target.value); setPage(1); }}
                className={`w-full px-6 pb-3 pt-7 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
              />
            </label>
            <label className="relative block">
              <span className={`absolute left-6 top-2 text-[9px] font-black uppercase tracking-[0.2em] ${theme.accentText}`}>
                To
              </span>
              <input
                type="date"
                value={joinedTo}
                onChange={(e) => { setJoinedTo(e.target.value); setPage(1); }}
                className={`w-full px-6 pb-3 pt-7 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
              />
            </label>
            {(searchTerm || filterRole || filterStatus || joinedFrom || joinedTo) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('');
                  setFilterStatus('');
                  setJoinedFrom('');
                  setJoinedTo('');
                  setPage(1);
                }}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {selectedUserIds.length > 0 && (
          <div className="px-8 py-4 border-b border-white/5 bg-amber-500/5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              {selectedUserIds.length} selected
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={exportSelectedUsers}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
              >
                <Download size={15} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleBulkSuspend}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all"
              >
                <UserMinus size={15} />
                Bulk Suspend
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2 px-8 pb-8">
            <thead>
              <tr className={`${theme.accentText} uppercase text-[10px] tracking-[0.2em]`}>
                <th className="px-6 py-4 font-bold">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && users.every(u => selectedUserIds.includes(u.id))}
                    onChange={(e) => {
                      setSelectedUserIds(e.target.checked ? users.map(u => u.id) : []);
                    }}
                    className="w-4 h-4 accent-amber-500"
                  />
                </th>
                <th className="px-6 py-4 font-bold">User</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Join Date</th>
                <th className="px-6 py-4 font-bold">Last Login</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="space-y-4">
              {loading ? (
                <tr><td colSpan="7" className={`text-center py-20 ${theme.accentText}`}>Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="7" className={`text-center py-20 ${theme.accentText}`}>No matching users found.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="glass-panel group hover:bg-white/[0.04] transition-all duration-300">
                    <td className="px-6 py-6 first:rounded-l-2xl">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={(e) => {
                          setSelectedUserIds(prev => e.target.checked
                            ? [...prev, u.id]
                            : prev.filter(id => id !== u.id)
                          );
                        }}
                        className="w-4 h-4 accent-amber-500"
                      />
                    </td>
                    <td className="px-6 py-6 first:rounded-l-2xl">
                      <div className={`font-bold text-white text-lg group-hover:${theme.primaryText} transition-colors`}>{u.name}</div>
                      <div className={`${theme.accentText} text-xs font-medium`}>{u.email}</div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 ${theme.primaryText} border ${theme.primaryBorder}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        u.status === 'active' ? `bg-emerald-500/20 text-emerald-400 border-emerald-500/30` :
                        u.status === 'banned' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                           u.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                           u.status === 'banned' ? 'bg-red-400' : 'bg-amber-400'
                        }`}></span>
                        {u.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-6 py-6 ${theme.accentText} font-mono text-xs`}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td className={`px-6 py-6 ${theme.accentText} font-mono text-xs`}>
                      {formatDate(u.lastLoginAt, 'Never')}
                    </td>
                    <td className="px-6 py-6 text-right last:rounded-r-2xl">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openProfileSummary(u)}
                          className={`p-3 rounded-xl ${theme.accentText} hover:bg-white/5 hover:${theme.primaryText} transition-all`}
                          data-tooltip="View Profile"
                        >
                          <Eye size={18} />
                        </button>

                        {isProtectedUser(u) ? (
                          <div 
                            className="p-3 rounded-xl text-white/10 cursor-not-allowed flex items-center justify-center animate-pulse"
                            data-tooltip="Protected Account"
                          >
                            <Ban size={18} className="opacity-20" />
                          </div>
                        ) : (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleBanStatus(u.id, u.status === 'banned', u)}
                            className={`p-3 rounded-xl transition-all ${u.status === 'banned' ? `bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20` : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                            data-tooltip={u.status === 'banned' ? 'Unban' : 'Ban'}
                          >
                            {u.status === 'banned' ? <CheckCircle size={18} /> : <Ban size={18} />}
                          </motion.button>
                        )}

                        {isProtectedUser(u) ? (
                          <div 
                            className="p-3 rounded-xl text-white/10 cursor-not-allowed flex items-center justify-center"
                            data-tooltip="Protected Account"
                          >
                            <UserMinus size={18} className="opacity-20" />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSuspendStatus(u.id, u.status === 'suspended', u)}
                            className={`p-3 rounded-xl transition-all ${u.status === 'suspended' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
                            data-tooltip={u.status === 'suspended' ? 'Restore' : 'Suspend'}
                          >
                            {u.status === 'suspended' ? <CheckCircle size={18} /> : <UserMinus size={18} />}
                          </button>
                        )}
                        
                        {u.role === 'tutor' && u.status === 'pending_approval' && (
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleApprove(u.id, u.name)}
                            className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            data-tooltip="Approve Tutor"
                          >
                            <UserCheck size={18} />
                          </motion.button>
                        )}
                        
                        <div className="relative">
                          {isProtectedUser(u) ? (
                            <div 
                              className="p-3 rounded-xl text-white/10 cursor-not-allowed flex items-center justify-center"
                              data-tooltip="Protected Account"
                            >
                              <Shield size={18} className="opacity-20" />
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                if (roleDropdownId === u.id) {
                                    setRoleDropdownId(null);
                                } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setRoleDropdownPos({ top: rect.bottom + 8, left: rect.right - 160 });
                                    setRoleDropdownId(u.id);
                                }
                              }}
                              className={`p-3 rounded-xl transition-all ${roleDropdownId === u.id ? `bg-white/10 ${theme.primaryText}` : `${theme.accentText} hover:bg-white/5 hover:${theme.primaryText}`}`}
                              data-tooltip="Change Role"
                            >
                              <Shield size={18} />
                            </button>
                          )}
                        </div>

                        {isProtectedUser(u) ? (
                          <div 
                            className="p-3 rounded-xl text-white/10 cursor-not-allowed flex items-center justify-center"
                            data-tooltip="Protected Account"
                          >
                            <Trash2 size={18} className="opacity-20" />
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleDelete(u.id, u)}
                            className={`p-3 rounded-xl ${theme.accentText} hover:bg-red-500/10 hover:text-red-400 transition-all`}
                            data-tooltip="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-8 py-6 border-t border-white/5 flex justify-between items-center">
          <span className={`text-xs ${theme.accentText} font-bold uppercase tracking-widest`}>Page {page} of {totalPages || 1}</span>
          <div className="flex gap-3">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white"
            >
              Previous
            </button>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl disabled:opacity-30 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Role Change Dropdown */}
      {roleDropdownId && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setRoleDropdownId(null)} />
          <div 
            className="fixed w-52 glass-panel rounded-2xl shadow-2xl border border-white/10 z-[110] overflow-hidden"
            style={{ top: roleDropdownPos.top, left: roleDropdownPos.left }}
          >
            {['learner', 'tutor', 'institution_admin', 'platform_admin'].map(r => (
              <button 
                key={r}
                onClick={() => { 
                  const targetUser = users.find(u => u.id === roleDropdownId);
                  handleChangeRole(roleDropdownId, r, targetUser); 
                  setRoleDropdownId(null); 
                }}
                className={`block w-full text-left px-5 py-3 text-xs text-white/70 ${theme.hoverBg} hover:${theme.primaryText} capitalize transition-colors font-bold tracking-wide`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </>
      )}

      {/* User Profile Summary Modal */}
      <AnimatePresence>
        {profileUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4 z-[250]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-[40px] p-8 w-full max-w-5xl max-h-[86vh] overflow-y-auto custom-scrollbar relative shadow-2xl border-white/10"
            >
              <button
                onClick={() => {
                  setProfileUser(null);
                  setProfileSummary(null);
                }}
                className={`absolute right-8 top-8 ${theme.accentText} hover:${theme.primaryText} transition-colors`}
              >
                <X size={28} />
              </button>

              <div className="mb-8 pr-10">
                <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${theme.primaryText} mb-2`}>User Profile</p>
                <h2 className="text-3xl font-bold text-white tracking-tight">{profileUser.name}</h2>
                <p className={`${theme.accentText} text-sm font-semibold mt-1`}>{profileUser.email}</p>
              </div>

              {profileLoading ? (
                <div className={`py-24 text-center ${theme.accentText} font-bold`}>Loading profile summary...</div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      ['Role', profileSummary?.user?.role?.replace('_', ' ')],
                      ['Status', profileSummary?.user?.status?.replace('_', ' ')],
                      ['Join Date', formatDate(profileSummary?.user?.createdAt)],
                      ['Last Login', formatDate(profileSummary?.user?.lastLoginAt, 'Never')]
                    ].map(([label, value]) => (
                      <div key={label} className="glass-panel rounded-2xl border border-white/5 p-4">
                        <p className={`${theme.accentText} text-[10px] font-black uppercase tracking-widest mb-1`}>{label}</p>
                        <p className="text-white text-sm font-bold capitalize">{value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <section className="glass-panel rounded-[28px] border border-white/5 p-5">
                      <h3 className="text-white font-black mb-4">Enrollment History</h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {profileSummary?.enrollmentHistory?.length ? profileSummary.enrollmentHistory.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                            <p className="text-sm font-bold text-white truncate">{item.courseTitle}</p>
                            <p className={`${theme.accentText} text-xs mt-1`}>{item.status} - {item.progressPercentage || 0}% complete</p>
                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-2">{formatDate(item.enrolledAt)}</p>
                          </div>
                        )) : (
                          <p className={`${theme.accentText} text-sm py-10 text-center`}>No enrollments found</p>
                        )}
                      </div>
                    </section>

                    <section className="glass-panel rounded-[28px] border border-white/5 p-5">
                      <h3 className="text-white font-black mb-4">Payment History</h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {profileSummary?.paymentHistory?.length ? profileSummary.paymentHistory.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold text-white truncate">{item.courseTitle}</p>
                              <span className="text-emerald-400 text-xs font-black">{formatMoney(item.amount, item.currency)}</span>
                            </div>
                            <p className={`${theme.accentText} text-xs mt-1`}>{item.status} - {item.paymentType?.replace('_', ' ')}</p>
                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-2">{formatDate(item.paidAt)}</p>
                          </div>
                        )) : (
                          <p className={`${theme.accentText} text-sm py-10 text-center`}>No payments found</p>
                        )}
                      </div>
                    </section>

                    <section className="glass-panel rounded-[28px] border border-white/5 p-5">
                      <h3 className="text-white font-black mb-4">Activity Log</h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {profileSummary?.activityLog?.length ? profileSummary.activityLog.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                            <p className="text-sm font-bold text-white">{item.action?.replaceAll('_', ' ')}</p>
                            <p className={`${theme.accentText} text-xs mt-1`}>By {item.actorName}</p>
                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-2">{formatDate(item.createdAt)}</p>
                          </div>
                        )) : (
                          <p className={`${theme.accentText} text-sm py-10 text-center`}>No admin activity found</p>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card rounded-[40px] p-10 w-full max-w-md relative shadow-2xl border-white/10"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className={`absolute right-8 top-8 ${theme.accentText} hover:${theme.primaryText} transition-colors`}
              >
                <X size={28} />
              </button>
              
              <h2 className="text-3xl font-bold text-white mb-8 tracking-tight uppercase tracking-widest">Initialize <span className={theme.primaryText}>Entity</span></h2>
              
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold ${theme.primaryText.replace('text-', 'text-opacity-40 text-')} uppercase tracking-[0.2em] ml-1`}>Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className={`w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
                    placeholder="Enter user name..."
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold ${theme.primaryText.replace('text-', 'text-opacity-40 text-')} uppercase tracking-[0.2em] ml-1`}>Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className={`w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 ${theme.ring} transition-all`}
                    placeholder="Enter email address..."
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold ${theme.primaryText.replace('text-', 'text-opacity-40 text-')} uppercase tracking-[0.2em] ml-1`}>Role</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className={`w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-white focus:outline-none focus:ring-2 ${theme.ring} transition-all appearance-none cursor-pointer`}
                  >
                    <option value="learner" className="bg-[#0f172a]">Learner</option>
                    <option value="tutor" className="bg-[#0f172a]">Tutor</option>
                    {isPlatform && <option value="platform_admin" className="bg-[#0f172a]">Platform Admin</option>}
                  </select>
                </div>
                
                <p className={`text-[10px] ${theme.primaryText.replace('text-', 'text-opacity-20 text-')} font-bold uppercase tracking-widest leading-relaxed`}>
                  Login credentials will be sent by email after the user is created.
                </p>

                <div className="flex gap-4 mt-6">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={actionLoading}
                    className={`flex-1 ${theme.primaryBg} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl ${theme.primaryShadow} transition-all disabled:opacity-50`}
                  >
                    {actionLoading ? 'Initializing...' : 'Initialize'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Register Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4 z-[200]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="glass-card rounded-[48px] p-10 w-full max-w-4xl relative shadow-2xl border-white/10"
            >
              <button 
                onClick={() => {
                  setShowBulkModal(false);
                  setCsvStudents([]);
                  setFileName('');
                  setCsvError('');
                }}
                className={`absolute right-10 top-10 ${theme.accentText} hover:${theme.primaryText} transition-colors cursor-pointer`}
              >
                <X size={32} />
              </button>
              
              <div className="flex items-center gap-6 mb-8">
                <div className={`p-5 glass-panel ${theme.primaryText} rounded-3xl shadow-lg border-white/10`}>
                  <Upload size={32} />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-white tracking-tight uppercase tracking-widest">Mass <span className={theme.primaryText}>Registration</span></h2>
                  <p className={`${theme.accentText} font-medium text-lg`}>Register multiple users at once by uploading a CSV file.</p>
                </div>
              </div>
              
              {csvStudents.length === 0 ? (
                /* Drag & Drop Upload State */
                <div className="flex flex-col h-[50vh] justify-between">
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('csv-file-input').click()}
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                      dragActive 
                        ? `border-${theme.primary} bg-${theme.primary}/5` 
                        : 'border-white/10 hover:border-white/20 hover:bg-white/[0.01]'
                    }`}
                  >
                    <input 
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleCSVUpload(e.target.files[0]);
                        }
                      }}
                    />
                    
                    <motion.div 
                      animate={dragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                      className={`p-6 rounded-full bg-white/5 border border-white/10 ${theme.primaryText} mb-6 group-hover:scale-105 transition-transform duration-300`}
                    >
                      <Upload size={40} className="animate-pulse" />
                    </motion.div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Drag & Drop CSV File here
                    </h3>
                    <p className={`${theme.accentText} text-sm max-w-md mx-auto mb-4 font-medium`}>
                      or <span className={`font-black ${theme.primaryText} underline`}>browse your files</span> to select a file
                    </p>
                    
                    <div className="flex items-center gap-2 justify-center px-4 py-2 bg-white/5 rounded-full border border-white/5 text-xs text-white/40">
                      <FileText size={14} />
                      <span>Supports name and email headers</span>
                    </div>

                    {csvError && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <AlertCircle size={16} />
                        <span>{csvError}</span>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-white/40 text-sm font-medium">
                      Don't have a CSV file yet?
                    </p>
                    <button 
                      type="button"
                      onClick={downloadTemplate}
                      className={`flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all text-sm group cursor-pointer`}
                    >
                      <Download size={16} className={`group-hover:translate-y-0.5 transition-transform duration-300 ${theme.primaryText}`} />
                      Download CSV Template
                    </button>
                  </div>
                </div>
              ) : (
                /* CSV Loaded Preview State */
                <form onSubmit={handleBulkRegister} className="flex flex-col h-[52vh] justify-between">
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 glass-panel rounded-3xl border border-white/10 gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 bg-white/5 text-white/80 rounded-2xl border border-white/5`}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg leading-tight truncate max-w-md">{fileName}</p>
                          <p className={`text-[11px] font-bold uppercase tracking-wider ${theme.primaryText}`}>
                            {csvStudents.length} rows parsed &bull; {csvStudents.filter(s => s.isValid).length} valid records
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setCsvStudents([]);
                          setFileName('');
                          setCsvError('');
                        }}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all text-xs cursor-pointer"
                      >
                        Reset / Select Different File
                      </button>
                    </div>

                    {/* Batch limit warning */}
                    {csvStudents.filter(s => s.isValid).length > 100 && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-3">
                        <AlertTriangle size={18} className="flex-shrink-0 animate-bounce" />
                        <div>
                          <p className="font-extrabold uppercase tracking-wide">Bulk Limit Threshold Exceeded</p>
                          <p className="opacity-80 mt-0.5">The platform allows registering up to 100 users per batch. Only the first 100 valid users will be registered now.</p>
                        </div>
                      </div>
                    )}

                    {/* Table Preview */}
                    <div className="glass-panel rounded-[32px] overflow-hidden border border-white/5">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`bg-white/5 border-b border-white/5 ${theme.accentText} text-[10px] font-black uppercase tracking-[0.25em]`}>
                            <th className="px-6 py-4">Row</th>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvStudents.map((student, idx) => (
                            <tr 
                              key={idx} 
                              className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors ${
                                !student.isValid ? 'bg-red-500/[0.02]' : ''
                              } ${idx >= 100 && student.isValid ? 'opacity-40' : ''}`}
                            >
                              <td className="px-6 py-4 text-xs font-mono text-white/30 font-bold">{idx + 1}</td>
                              <td className="px-6 py-4 text-sm font-bold text-white truncate max-w-[180px]">{student.name || <span className="text-red-400 font-normal italic">Missing</span>}</td>
                              <td className="px-6 py-4 text-sm font-bold text-white/70 truncate max-w-[220px]">{student.email || <span className="text-red-400 font-normal italic">Missing</span>}</td>
                              <td className="px-6 py-4">
                                {student.isValid ? (
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    idx >= 100 
                                      ? 'bg-white/5 text-white/40 border border-white/5'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {idx >= 100 ? 'Next Batch' : 'Ready'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                                    {student.error}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button 
                                  type="button"
                                  onClick={() => removeCsvRow(idx)}
                                  className="p-2 text-white/30 hover:text-red-400 transition-colors bg-white/5 hover:bg-red-500/10 rounded-xl cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-white/5 gap-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/30">
                      {csvStudents.filter(s => s.isValid).length} ready &bull; {csvStudents.filter(s => !s.isValid).length} rejected
                    </span>
                    <div className="flex gap-4 w-full sm:w-auto">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowBulkModal(false);
                          setCsvStudents([]);
                          setFileName('');
                          setCsvError('');
                        }}
                        className="px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        disabled={actionLoading || csvStudents.filter(s => s.isValid).length === 0}
                        className={`w-full sm:w-auto px-10 py-3.5 ${theme.primaryBg} text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl ${theme.primaryShadow} disabled:opacity-30 cursor-pointer`}
                      >
                        {actionLoading ? 'Registering...' : 'Complete Registration'}
                      </motion.button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && registrationSummary && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 z-[300]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-[48px] p-12 w-full max-w-3xl relative shadow-2xl border-white/10"
            >
              <h2 className="text-4xl font-bold text-white mb-10 tracking-tight text-center uppercase tracking-widest">Registration <span className={theme.primaryText}>Report</span></h2>
              
              <div className="space-y-10">
                {registrationSummary.success?.length > 0 && (
                  <div>
                    <h3 className={`text-[10px] font-black ${theme.primaryText} uppercase tracking-[0.4em] mb-6 flex items-center gap-3`}>
                      <div className={`w-2 h-2 ${theme.primaryBg} rounded-full animate-pulse`}></div>
                      Successful Initializations
                    </h3>
                    <div className="glass-panel rounded-[32px] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar border-white/10">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`bg-white/5 ${theme.accentText} text-[10px] font-black uppercase tracking-widest`}>
                            <th className="px-6 py-4">User Id</th>
                            <th className="px-6 py-4">Network Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrationSummary.success.map((s, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-5">
                                <div className="font-bold text-white text-sm">{s.name}</div>
                                <div className={`${theme.accentText} text-[10px] font-medium tracking-wide`}>{s.email}</div>
                              </td>
                              <td className="px-6 py-5">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${s.emailStatus === 'sent' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                                  {s.emailStatus === 'sent' ? 'Sent' : 'Failed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Single user summary case */}
                {registrationSummary.type === 'single' && (
                   <div className="glass-panel p-8 rounded-3xl border border-white/10">
                      <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">User Name</p>
                        <p className="text-xl font-bold text-white">{registrationSummary.user.name}</p>
                        <p className={`${theme.accentText} text-sm mt-1`}>{registrationSummary.user.email}</p>
                      </div>
                   </div>
                )}

                {registrationSummary.failed?.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Initialization Failures
                    </h3>
                    <div className="bg-red-500/5 rounded-3xl p-6 border border-red-500/20 space-y-4">
                      {registrationSummary.failed.map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="font-bold text-white">{f.email}</span>
                          <span className="text-red-400 font-bold bg-red-400/10 px-3 py-1 rounded-lg border border-red-400/20 text-[10px] uppercase tracking-widest">{f.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSummaryModal(false)}
                  className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-lg hover:bg-white/10 transition-all"
                >
                  Terminate Report View
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[400]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card rounded-[40px] p-10 w-full max-w-md relative shadow-2xl border-white/10 text-center"
            >
              <div className={`w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/10 ${
                confirmModal.actionType === 'delete' ? 'bg-red-500/10 text-red-400' :
                confirmModal.actionType === 'ban' ? 'bg-amber-500/10 text-amber-400' :
                confirmModal.actionType === 'suspend' ? 'bg-red-500/10 text-red-400' :
                `bg-${theme.primary}/10 ${theme.primaryText}`
              }`}>
                {confirmModal.actionType === 'delete' ? <AlertTriangle size={36} /> :
                 confirmModal.actionType === 'ban' ? <Ban size={36} /> :
                 confirmModal.actionType === 'suspend' ? <UserMinus size={36} /> :
                 confirmModal.actionType === 'approve' ? <UserCheck size={36} /> :
                 <Shield size={36} />}
              </div>

              <h2 className="text-2xl font-bold text-white mb-4 tracking-tight uppercase tracking-widest">{confirmModal.title}</h2>
              <p className="text-white/40 font-medium mb-10 leading-relaxed px-4">
                {confirmModal.message}
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await confirmModal.onConfirm();
                    setConfirmModal({ ...confirmModal, show: false });
                  }}
                  className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all ${
                    confirmModal.actionType === 'delete' ? 'bg-red-500 text-white shadow-red-500/20' :
                    confirmModal.actionType === 'ban' ? 'bg-amber-500 text-black shadow-amber-500/20' :
                    confirmModal.actionType === 'suspend' ? 'bg-red-500 text-white shadow-red-500/20' :
                    `${theme.primaryBg} text-white ${theme.primaryShadow}`
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
