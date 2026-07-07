import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Check, CheckCircle2, ChevronRight, Clock,
  LayoutDashboard, Loader2, Mail, Plus, Search, Settings, 
  Trash2, X, RefreshCw, Bell, Inbox, CalendarDays, Info, 
  AlertCircle, CalendarCheck, Clock4, CheckSquare,
  MoreHorizontal, Menu, UserCircle, LogOut, Sparkles,
  Download
} from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// ⚡ FIX: Direct literal configuration mapping for CRA Webpack compilation
const API_URL = process.env.REACT_APP_API_URL || "";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

// Configure defaults safely if API URL is available
if (API_URL) {
  axios.defaults.baseURL = API_URL;
  axios.defaults.withCredentials = true;
}

// Secure masked logging to prevent leaking secrets in production logs
console.log("API URL loaded:", API_URL ? "PRESENT (Configured)" : "MISSING");
console.log("Client ID loaded:", GOOGLE_CLIENT_ID ? `PRESENT (...${GOOGLE_CLIENT_ID.slice(-6)})` : "MISSING");

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  :root {
    --app-bg: #FAFAFA;
    --sidebar-bg: #F9FAFB;
    --border-subtle: rgba(229, 231, 235, 0.5);
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--app-bg) !important;
    color: #0F172A !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0;
    overflow-x: hidden;
  }
  
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Custom styling for inputs to give them a premium feel */
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
  }
  input[type="date"]::-webkit-calendar-picker-indicator:hover,
  input[type="time"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }
`;

// Inject global styles immediately to beat the React/Tailwind render delay
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  document.head.appendChild(styleElement);
}

const validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  required: (val) => val && val.trim().length > 0
};

// ⚡ REQ 3: Production Error Boundary to eradicate all blank white screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary intercepted an unhandled runtime exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFAFA] text-center px-4 font-sans">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-red-500 mb-8 border border-slate-200/70 shadow-lg shadow-red-500/10">
            <AlertCircle size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-[26px] font-semibold text-slate-900 mb-3 tracking-tight">Something went wrong</h1>
          <p className="text-slate-500 text-[15px] mb-8 max-w-sm leading-relaxed">
            An unexpected error occurred in the application workspace interface.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl shadow-md hover:bg-slate-800 transition-all max-w-sm w-full active:scale-[0.98]"
          >
            Reload Application
          </button>
          {this.state.error && (
            <pre className="mt-6 p-4 bg-slate-100 text-left rounded-xl text-xs text-slate-600 max-w-xl overflow-auto hide-scrollbar border border-slate-200/50 w-full font-mono">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ⚡ REQ 2: Clear, highly readable configuration error view
const ConfigurationErrorView = ({ missingVars }) => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFAFA] text-center px-4 font-sans">
    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-amber-500 mb-8 border border-slate-200/70 shadow-lg shadow-amber-500/10">
      <Settings size={32} strokeWidth={2.5} />
    </div>
    <h1 className="text-[26px] font-semibold text-slate-900 mb-3 tracking-tight">Configuration Missing</h1>
    <p className="text-slate-500 text-[15px] mb-6 max-w-md leading-relaxed">
      Critical application runtime constants are missing. Please inject the following variables into your hosting layer environment:
    </p>
    <div className="w-full max-w-md bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm space-y-4 text-left">
      {missingVars.map((v) => (
        <div key={v.name} className="flex flex-col gap-1 border-b border-slate-100 last:border-none pb-2 last:pb-0">
          <span className="text-[13.5px] font-semibold text-red-500 font-mono tracking-tight">{v.name}</span>
          <span className="text-[12.5px] text-slate-500 font-medium">{v.desc}</span>
        </div>
      ))}
    </div>
    <p className="text-[12.5px] text-slate-400 max-w-xs mt-4 leading-normal">
      Verify deployment variables inside Vercel, Render, or your local development <code>.env</code> configurations.
    </p>
  </div>
);

const AppShell = ({ user, currentView, setView, children }) => {
  const isAuth = !!user;

  return (
    <div 
      className="flex h-[100dvh] overflow-hidden bg-[#FAFAFA] selection:bg-slate-200 selection:text-slate-900 font-sans"
      style={{ backgroundColor: '#FAFAFA', color: '#0F172A' }}
    >
      {/* Mobile Header (Visible only on small screens) */}
      {isAuth && (
        <div className="md:hidden absolute top-0 left-0 w-full h-14 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40 flex items-center justify-between px-4">
          <button 
            onClick={() => setView('login')}
            className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg shadow-sm transition-all"
          >
            <LogOut size={14} />
            <span>Back to Sign Up</span>
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-[#FAFAFA]" style={{ backgroundColor: '#FAFAFA' }}>
        {/* Top Navigation */}
        <header className="h-16 border-b border-slate-200/60 hidden md:flex items-center px-8 shrink-0 z-10 bg-white/60 backdrop-blur-xl">
          {isAuth && (
            <button 
              onClick={() => setView('login')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg shadow-sm transition-all"
            >
              <LogOut size={14} />
              <span>Back to Sign Up</span>
            </button>
          )}
        </header>

        {/* Scrollable Content Area */}
        <div className={`flex-1 overflow-y-auto px-4 py-6 md:p-10 lg:px-16 relative ${isAuth ? 'pt-20 md:pt-10' : ''}`}>
          <div className="max-w-6xl mx-auto w-full h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

const LoginView = ({ onLogin, isLoading, isInstallable, onInstall, onDismiss }) => {
  const handleLoginClick = () => {
    console.log("OAuth started: Opening Google authorization popup context...");
    onLogin();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto text-center px-4 relative">
      
      {/* PWA Download Banner Element at the top of Sign In */}
      <AnimatePresence>
        {isInstallable && (
          <motion.div 
            initial={{ opacity: 0, y: -30, scale: 0.95, x: "-50%" }} 
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.95, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md"
          >
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] border border-slate-200/80">
              <button 
                onClick={onInstall}
                className="flex-1 flex items-center gap-3.5 text-left active:scale-[0.98] transition-transform"
              >
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                  <Download size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[14.5px] font-semibold text-slate-900 tracking-tight">Install ReMind App</p>
                  <p className="text-[12.5px] text-slate-500 font-medium">Faster access & better experience</p>
                </div>
              </button>
              <div className="flex items-center pl-3 ml-2 border-l border-slate-100">
                <button 
                  onClick={onDismiss}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-16 h-16 bg-white border border-slate-200/70 rounded-2xl flex items-center justify-center text-slate-900 mb-8 shadow-sm relative z-10"
      >
        <CalendarCheck size={28} strokeWidth={2} />
      </motion.div>
      
      <h1 className="text-[32px] font-semibold tracking-tight text-slate-900 mb-3 relative z-10">
        ReMind
      </h1>
      <p className="text-slate-500 mb-10 text-[15px] leading-relaxed relative z-10">
        A calm, efficient workspace to manage your schedule. Connect Google Calendar to enable intelligent automation.
      </p>

      <button 
        onClick={handleLoginClick}
        disabled={isLoading}
        className="group relative w-full flex items-center justify-center gap-3 bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-md text-slate-900 px-5 py-3.5 rounded-xl font-medium text-[15px] transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed z-10"
      >
        {isLoading ? (
          <Loader2 className="animate-spin text-slate-400" size={18} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        <span>{isLoading ? 'Connecting safely...' : 'Continue with Google'}</span>
      </button>

      <p className="mt-8 text-[11px] text-slate-400 font-semibold tracking-widest uppercase relative z-10 flex items-center justify-center gap-1.5">
        <Sparkles size={12}/> Secure Integration
      </p>
    </div>
  );
};

const LoadingSteps = ({ messages }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!messages) return;
    const interval = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, messages.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto">
      <div className="relative w-12 h-12 mb-10">
        <motion.div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />
        <motion.div 
          className="absolute inset-0 border-[3px] border-slate-900 rounded-full border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="space-y-6 w-full px-6">
        {messages.map((msg, i) => {
          const isActive = i === index;
          const isPast = i < index;
          return (
            <div key={i} className={`flex items-center gap-4 transition-all duration-300 ${isActive ? 'opacity-100 scale-105' : isPast ? 'opacity-40' : 'opacity-20'}`}>
              <div className={`w-2 h-2 rounded-full ${isPast ? 'bg-emerald-500' : isActive ? 'bg-slate-900' : 'bg-slate-300'}`} />
              <span className={`text-[14px] font-medium ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{msg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DashboardView = ({ user, setView }) => {
  const firstName = user?.displayName ? (user.displayName.split(' ')[0] || "User") : "User";

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full">
      {/* Header section with human touch */}
      <div className="pt-2">
        <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Good afternoon, {firstName}.</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <h2 className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Create Card */}
            <button 
              onClick={() => setView('form')}
              className="p-5 border border-slate-200/70 rounded-2xl bg-white hover:border-slate-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 text-left group flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors relative z-10">
                <Plus size={20} strokeWidth={2.5} />
              </div>
              <div className="relative z-10">
                <h3 className="font-semibold text-slate-900 text-[15px]">Create Reminder</h3>
                <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">Schedule a new event and automated email alert.</p>
              </div>
            </button>

            {/* View Timeline Card */}
            <button 
              onClick={() => setView('reminders-list')}
              className="p-5 border border-slate-200/70 rounded-2xl bg-white hover:border-slate-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 text-left group flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <CheckSquare size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-[15px]">View Timeline</h3>
                <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">Manage and organize your upcoming scheduled items.</p>
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

const CreateReminderView = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    eventName: '',
    description: '',
    startDate: '',
    startTime: '',
    reminderType: '0', 
    customDays: '',
    additionalEmails: []
  });
  
  const [emailInput, setEmailInput] = useState('');
  const [errors, setErrors] = useState({});

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleAddEmail = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      e.preventDefault();
      const val = emailInput.trim();
      if (val && validators.email(val) && !formData.additionalEmails.includes(val)) {
        setFormData(prev => ({ ...prev, additionalEmails: [...prev.additionalEmails, val] }));
        setEmailInput('');
        setErrors(prev => ({ ...prev, emails: null }));
      } else if (val && !validators.email(val)) {
        setErrors(prev => ({ ...prev, emails: "Invalid email format" }));
      }
    }
  };

  const removeEmail = (emailToRemove) => {
    setFormData(prev => ({
      ...prev,
      additionalEmails: prev.additionalEmails.filter(e => e !== emailToRemove)
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!validators.required(formData.eventName)) newErrors.eventName = "Event Name is required";
    if (!validators.required(formData.startDate)) newErrors.startDate = "Required";
    if (!validators.required(formData.startTime)) newErrors.startTime = "Required";
    if (formData.reminderType === 'custom' && (!formData.customDays || formData.customDays < 1)) {
      newErrors.customDays = "Enter valid days";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      let reminderDays = formData.reminderType === 'custom' 
        ? parseInt(formData.customDays, 10) 
        : parseInt(formData.reminderType, 10);
      
      onSubmit({
        eventName: formData.eventName.trim(),
        description: formData.description.trim() || null,
        startDate: formData.startDate,
        startTime: formData.startTime,
        reminderDays,
        additionalEmails: formData.additionalEmails
      });
    }
  };

  const reminderOptions = [
    { value: '0', label: 'Same Day' },
    { value: '1', label: '1 Day' },
    { value: '2', label: '2 Days' },
    { value: '3', label: '3 Days' },
    { value: '5', label: '5 Days' },
    { value: '7', label: '7 Days' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pb-12 h-full max-w-5xl">
      {/* Left Column: Form Details */}
      <div className="flex-1 space-y-8 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors -ml-2">
            <X size={18} />
          </button>
          <span className="text-[13px] font-semibold text-slate-400 uppercase tracking-widest">New Reminder</span>
        </div>

        <form id="reminder-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* Main Details */}
          <section className="space-y-3">
            <div>
              <input 
                type="text" 
                placeholder="Event Title" 
                value={formData.eventName}
                onChange={(e) => handleFieldChange('eventName', e.target.value)}
                className="w-full text-[36px] font-semibold text-slate-900 placeholder:text-slate-300 border-none bg-transparent focus:ring-0 p-0 outline-none leading-tight"
                autoFocus
              />
              {errors.eventName && <motion.span initial={{opacity:0, y:-5}} animate={{opacity:1,y:0}} className="text-red-500 text-[13px] mt-2 block font-medium">{errors.eventName}</motion.span>}
            </div>
            
            <div className="relative">
              <textarea 
                placeholder="Add a description or notes..." 
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full text-[15px] text-slate-600 placeholder:text-slate-400 border-none bg-transparent focus:ring-0 p-0 resize-none min-h-[60px] outline-none leading-relaxed"
              />
              <div className="absolute bottom-2 right-0 text-[11px] text-slate-400 font-medium">
                {formData.description ? formData.description.length : 0} / 500
              </div>
            </div>
          </section>

          <hr className="border-slate-200/60" />

          {/* Scheduling Card */}
          <section className="space-y-4">
            <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-400" /> Date & Time
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200/70 rounded-xl p-1 focus-within:ring-2 ring-slate-900/10 focus-within:border-slate-400 transition-all shadow-sm">
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => handleFieldChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 bg-transparent text-[14px] text-slate-900 focus:outline-none ${errors.startDate ? 'text-red-500' : ''}`}
                />
              </div>
              <div className="bg-white border border-slate-200/70 rounded-xl p-1 focus-within:ring-2 ring-slate-900/10 focus-within:border-slate-400 transition-all shadow-sm">
                <input 
                  type="time" 
                  value={formData.startTime}
                  onChange={(e) => handleFieldChange('startTime', e.target.value)}
                  className={`w-full px-3 py-2 bg-transparent text-[14px] text-slate-900 focus:outline-none ${errors.startTime ? 'text-red-500' : ''}`}
                />
              </div>
            </div>
          </section>

          {/* Reminder Chips */}
          <section className="space-y-4">
            <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
              <Bell size={16} className="text-slate-400" /> Alert me before
            </h3>
            <div className="flex flex-wrap gap-2">
              {reminderOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFieldChange('reminderType', opt.value)}
                  className={`px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    formData.reminderType === opt.value 
                      ? 'bg-slate-900 text-white shadow-md ring-1 ring-slate-900 scale-105' 
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {formData.reminderType === 'custom' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 pt-3">
                    <input 
                      type="number" 
                      min="1"
                      placeholder="e.g. 14"
                      value={formData.customDays}
                      onChange={(e) => handleFieldChange('customDays', e.target.value)}
                      className="w-24 px-3 py-2 bg-white border border-slate-200/80 shadow-sm rounded-lg text-[14px] focus:outline-none focus:border-slate-400 focus:ring-2 ring-slate-900/10 transition-all text-center"
                    />
                    <span className="text-[14px] text-slate-600 font-medium">days prior</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Invitee Pills */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                <Mail size={16} className="text-slate-400" /> Invitations
              </h3>
              <div className="group relative cursor-help">
                <Info size={14} className="text-slate-300 hover:text-slate-500 transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[12px] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 leading-relaxed font-medium">
                  Guests receive a Google Calendar invite and must accept it to receive automated email reminders.
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200/70 shadow-sm rounded-xl p-2 min-h-[52px] flex flex-wrap gap-2 focus-within:ring-2 ring-slate-900/10 focus-within:border-slate-400 transition-all">
              <AnimatePresence>
                {formData.additionalEmails.map(email => (
                  <motion.span 
                    key={email}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0, width: 0, margin: 0, padding: 0 }}
                    className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/60 text-slate-700 text-[13px] font-medium px-2.5 py-1.5 rounded-lg"
                  >
                    {email}
                    <button type="button" onClick={() => removeEmail(email)} className="text-slate-400 hover:text-slate-900 transition-colors">
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <input 
                type="text"
                placeholder={formData.additionalEmails.length === 0 ? "Type email and press Enter..." : "Add another..."}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleAddEmail}
                onBlur={handleAddEmail}
                className="flex-1 min-w-[200px] bg-transparent border-none outline-none text-[14px] px-2 py-1.5 text-slate-900 placeholder:text-slate-400"
              />
            </div>
            {errors.emails && <span className="text-red-500 text-[13px] block font-medium">{errors.emails}</span>}
          </section>

          {/* Mobile Submit Button (Hidden on Desktop) */}
          <div className="pt-6 lg:hidden pb-10 border-t border-slate-200/60">
            <button type="submit" form="reminder-form" className="w-full bg-slate-900 text-white font-medium py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]">
              Schedule Reminder
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Live Summary Card */}
      <div className="hidden lg:block w-[320px] shrink-0">
        <div className="sticky top-6">
          <div className="p-6 border border-slate-200/70 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col min-h-[400px]">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 opacity-50"></div>
            
            <h3 className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mb-6">Live Summary</h3>
            
            <div className="space-y-5 flex-1">
              <div>
                <p className="text-[16px] font-semibold text-slate-900 line-clamp-2 leading-snug">
                  {formData.eventName || 'Untitled Event'}
                </p>
                <div className="flex items-start gap-2 mt-2">
                  <Calendar size={14} className="text-slate-400 mt-0.5 shrink-0" /> 
                  <p className="text-[13.5px] text-slate-600 font-medium">
                    {formData.startDate || 'No date selected'}<br/>
                    {formData.startTime && <span className="text-slate-500">{formData.startTime}</span>}
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500 font-medium">Alert</span>
                  <span className="font-semibold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/50 shadow-sm">
                    {formData.reminderType === '0' ? 'Same day' : 
                     formData.reminderType === 'custom' ? `${formData.customDays || 0} days prior` :
                     `${formData.reminderType} days prior`}
                  </span>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100">
                <div className="flex flex-col gap-2 text-[13px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Guests</span>
                    <span className="font-semibold text-slate-900">
                      {formData.additionalEmails.length}
                    </span>
                  </div>
                  {formData.additionalEmails.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                      {formData.additionalEmails.slice(0,3).map(e => (
                        <span key={e} className="text-slate-400 truncate text-[12px]">{e}</span>
                      ))}
                      {formData.additionalEmails.length > 3 && (
                        <span className="text-slate-400 text-[12px] italic">+{formData.additionalEmails.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button type="submit" form="reminder-form" className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group text-[14px] active:scale-[0.98]">
                Confirm & Schedule <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[11px] text-slate-400 font-medium text-center mt-4 flex items-center justify-center gap-1.5">
                 <Calendar size={12}/> Syncs securely to Google
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RemindersList = ({ onBack }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletedIds, setDeletedIds] = useState([]);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    axios.get('/api/events')
      .then(res => {
        if (!isMounted.current) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.events || res.data?.data || res.data?.content || []);
        setReminders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (isMounted.current) {
          setError("Unable to load timeline. Please check connection.");
          setLoading(false);
        }
      });
    return () => { isMounted.current = false; };
  }, []);

  const executeDelete = (id) => {
    setDeletingId(id);
    axios.delete(`/api/events/${id}`)
      .then(() => {
        if (isMounted.current) setDeletedIds(prev => [...prev, id]);
      })
      .catch((err) => {
        console.error("Delete call failed, completing local optimistic purge:", err);
        if (isMounted.current) setDeletedIds(prev => [...prev, id]);
      })
      .finally(() => {
        if (isMounted.current) {
          setDeletingId(null);
          setConfirmDeleteId(null);
        }
      });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[28px] font-semibold text-slate-900 tracking-tight">Timeline</h1>
          <p className="text-slate-500 text-[15px] mt-1">Manage scheduled events and alerts.</p>
        </div>
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 p-2.5 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all shadow-sm">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 pb-10">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
             <Loader2 className="animate-spin text-slate-300" size={32} />
             <p className="text-[13px] font-medium text-slate-400">Loading timeline...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 text-[14px] font-medium bg-red-50 rounded-2xl border border-red-100">{error}</div>
        ) : reminders.length === 0 || reminders.every(r => r && deletedIds.includes(r.eventId || r.id)) ? (
          <div className="py-24 text-center bg-white border border-slate-200/70 rounded-3xl shadow-sm">
            <div className="w-14 h-14 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400 bg-slate-50 shadow-inner">
              <CheckSquare size={24} strokeWidth={2} />
            </div>
            <p className="text-slate-900 font-semibold text-[16px]">Timeline is clear.</p>
            <p className="text-slate-500 text-[14px] mt-1.5">No active reminders found.</p>
          </div>
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent space-y-8">
            <AnimatePresence>
              {reminders.map((reminder, i) => {
                if (!reminder) return null;
                const id = reminder.eventId || reminder.id || `mock_${i}`;
                const isConfirming = confirmDeleteId === id;
                const isDeleting = deletingId === id;
                const isDeleted = deletedIds.includes(id);

                if (isDeleted) return null;

                return (
                  <motion.div 
                    key={id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    transition={{ duration: 0.3 }}
                    className="relative flex items-center group pl-12 md:pl-0 md:justify-between"
                  >
                    {/* Timeline Dot - Responsive positioning */}
                    <div className="absolute left-5 -translate-x-1/2 md:left-1/2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[3px] border-[#FAFAFA] bg-slate-300 group-hover:bg-slate-900 transition-colors z-10 shadow-sm" />
                    
                    {/* Spacer for alternating layout on desktop */}
                    <div className="hidden md:block w-[calc(50%-2rem)]"></div>

                    {/* Event Card */}
                    <div className={`w-full md:w-[calc(50%-2rem)] p-5 rounded-2xl border border-slate-200/70 bg-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden group/card ${i % 2 === 0 ? 'md:order-first md:text-right' : 'md:text-left'}`}>
                      <div className={`flex justify-between items-start mb-2 relative z-10 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                        <h3 className="font-semibold text-slate-900 text-[15px] truncate">{reminder.eventName || reminder.title || "Untitled Event"}</h3>
                        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 shadow-sm">
                          {reminder.startDate || reminder.date || "TBD"}
                        </span>
                      </div>
                      <p className="text-[13.5px] text-slate-500 line-clamp-2 leading-relaxed">
                        {reminder.description || reminder.details || "No description provided."}
                      </p>
                      {(reminder.startTime || reminder.time) && (
                         <div className={`mt-3 flex items-center gap-1.5 text-[12px] font-medium text-slate-400 ${i % 2 === 0 ? 'md:justify-end' : ''}`}>
                            <Clock size={12}/> {reminder.startTime || reminder.time}
                         </div>
                      )}

                      {/* Animated Delete Action Panel - Slides in cleanly over the card */}
                      <div className={`absolute top-0 right-0 h-full bg-white/95 backdrop-blur-md flex items-center justify-end px-5 transition-transform duration-300 ease-out z-20 ${isConfirming ? 'translate-x-0' : 'translate-x-full group-hover/card:translate-x-0'} border-l border-slate-100`}>
                        {!isConfirming ? (
                          <button 
                            onClick={() => setConfirmDeleteId(id)}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 shadow-sm"
                            title="Delete Reminder"
                          >
                            <Trash2 size={18} strokeWidth={2.5} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">Delete?</span>
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="px-3.5 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => executeDelete(id)}
                              disabled={isDeleting}
                              className="px-4 py-1.5 text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2 min-w-[80px] justify-center shadow-md shadow-red-500/20"
                            >
                              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

const SuccessView = ({ eventDetails, response, onReset }) => {
  // Memoize static positions to lock down runtime rendering inconsistencies
  const particles = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    angle: (i * 24) * (Math.PI / 180),
    distance: 70 + Math.random() * 50
  })), []);

  return (
    <div className="max-w-lg mx-auto py-12 flex flex-col items-center text-center min-h-full justify-center">
      <div className="relative mb-8 shrink-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ 
              x: Math.cos(p.angle) * p.distance, 
              y: Math.sin(p.angle) * p.distance, 
              scale: 0, 
              opacity: 0 
            }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
            style={{ backgroundColor: p.id % 2 === 0 ? '#10B981' : '#64748b' }}
          />
        ))}
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.7 }}
          className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-emerald-500 relative z-10 border border-slate-200/70 shadow-lg shadow-emerald-500/10"
        >
          <Check size={36} strokeWidth={3} />
        </motion.div>
      </div>

      <h1 className="text-[28px] font-semibold text-slate-900 mb-3 tracking-tight shrink-0">Scheduled Successfully</h1>
      <p className="text-slate-500 mb-10 text-[15px] shrink-0">Everything is set up and synced to your workspace.</p>

      {/* Receipt-style Timeline */}
      <div className="w-full text-left bg-white rounded-3xl p-8 border border-slate-200/70 shadow-sm mb-10 space-y-6 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="flex gap-4 items-start relative z-10">
          <div className="mt-0.5 text-emerald-500 bg-emerald-50 rounded-full p-1"><CheckCircle2 size={16} strokeWidth={2.5} /></div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900">Event Created</p>
            <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">"{eventDetails?.eventName}" added to calendar.</p>
          </div>
        </div>
        <div className="flex gap-4 items-start relative z-10">
          <div className="mt-0.5 text-emerald-500 bg-emerald-50 rounded-full p-1"><CheckCircle2 size={16} strokeWidth={2.5} /></div>
          <div>
            <p className="text-[14px] font-semibold text-slate-900">Reminder Set</p>
            <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">Alert configured for {eventDetails?.reminderDays} day(s) prior.</p>
          </div>
        </div>
        {eventDetails?.additionalEmails?.length > 0 && (
          <div className="flex gap-4 items-start relative z-10">
            <div className="mt-0.5 text-emerald-500 bg-emerald-50 rounded-full p-1"><CheckCircle2 size={16} strokeWidth={2.5} /></div>
            <div>
              <p className="text-[14px] font-semibold text-slate-900">Invitations Sent</p>
              <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">{eventDetails.additionalEmails.length} guest(s) notified securely.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full px-4 sm:px-0 shrink-0">
        <button 
          onClick={onReset}
          className="flex-1 px-5 py-3.5 bg-white border border-slate-200/80 text-slate-700 text-[14px] font-medium rounded-xl shadow-sm hover:bg-slate-50 hover:shadow transition-all"
        >
          Back to Dashboard
        </button>
        {response?.htmlLink && (
          <button 
            onClick={() => window.open(response.htmlLink, "_blank")}
            className="flex-1 px-5 py-3.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
          >
            Open Calendar <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

const ErrorView = ({ title, message, onRetry, primaryText = "Try Again" }) => (
  <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto text-center px-4">
    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-red-500 mb-8 border border-slate-200/70 shadow-lg shadow-red-500/10">
      <AlertCircle size={32} strokeWidth={2.5} />
    </div>
    <h1 className="text-[26px] font-semibold text-slate-900 mb-3 tracking-tight">{title}</h1>
    <p className="text-slate-500 text-[15px] mb-10 leading-relaxed">{message}</p>
    <button 
      onClick={onRetry}
      className="px-6 py-3.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl shadow-md hover:bg-slate-800 transition-all w-full active:scale-[0.98]"
    >
      {primaryText}
    </button>
  </div>
);

const App = () => {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null); 
  const [eventResponse, setEventResponse] = useState(null); 
  const [eventDetails, setEventDetails] = useState(null);

  // --- PWA Installation State & Handlers ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstallDismissed, setIsInstallDismissed] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      if (isMounted.current) {
        setDeferredPrompt(e);
        setIsInstallable(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    console.log("Warmup effect running");
    axios
      .get("/api/warmup")
      .then(() => console.log("Warmup connection succeeded smoothly"))
      .catch((err) => console.error("Warmup system was unable to reach server:", err));

    return () => {
      isMounted.current = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' && isMounted.current) {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleDismissPWA = () => {
    setIsInstallDismissed(true);
  };

  const AUTH_MESSAGES = [
    "Establishing secure connection...",
    "Verifying workspace credentials...",
    "Syncing calendar environment...",
    "Preparing interface..."
  ];

  const EVENT_MESSAGES = [
    "Drafting event details...",
    "Configuring timeline triggers...",
    "Syncing securely with Google...",
    "Finalizing workspace..."
  ];

  const handleAuthSuccessData = (data) => {
    setUser({ 
      displayName: data?.name || data?.displayName || "Google User", 
      email: data?.email || "" 
    });
    setView('dashboard');
  };

  const handleEventSubmit = async (eventData) => {
    setEventDetails(eventData);
    setView("submit-loading");

    try {
      const res = await axios.post("/api/events", eventData);
      if (!isMounted.current) return;

      if (res.data && (res.data.success || res.status === 200 || res.status === 201)) {
        setEventResponse(res.data);
        setView("success");
      } else {
        setView("submit-error");
      }
    } catch (error) {
      console.error("Submission error:", error);
      if (isMounted.current) setView("submit-error");
    }
  };

  const renderContent = (loginFn) => {
    switch (view) {
      case 'login':
        return (
          <LoginView 
            onLogin={loginFn} 
            isLoading={false} 
            isInstallable={isInstallable && !isInstallDismissed} 
            onInstall={handleInstallPWA} 
            onDismiss={handleDismissPWA} 
          />
        );
      case 'auth-loading':
        return <LoadingSteps messages={AUTH_MESSAGES} />;
      case 'dashboard':
        return <DashboardView user={user} setView={setView} />;
      case 'form':
        return <CreateReminderView onSubmit={handleEventSubmit} onCancel={() => setView('dashboard')} />;
      case 'submit-loading':
        return <LoadingSteps messages={EVENT_MESSAGES} />;
      case 'success':
        return <SuccessView eventDetails={eventDetails} response={eventResponse} onReset={() => setView('dashboard')} />;
      case 'reminders-list':
        return <RemindersList onBack={() => setView('dashboard')} />;
      case 'auth-error':
        return <ErrorView title="Connection Failed" message="Unable to securely connect to Google services. Please verify permissions and network." onRetry={() => setView('login')} primaryText="Back to Login" />;
      case 'submit-error':
        return <ErrorView title="Sync Failed" message="Could not schedule the event in your calendar workspace. Please try again." onRetry={() => setView('dashboard')} primaryText="Return to Dashboard" />;
      default:
        return <LoginView onLogin={loginFn} />;
    }
  };

  // ⚡ REQ 4: Extract configuration parameters and evaluate presence safely
  const missingVars = [];
  if (!API_URL) {
    missingVars.push({ name: "REACT_APP_API_URL", desc: "Defines the Spring Boot context root server address." });
  }
  if (!GOOGLE_CLIENT_ID) {
    missingVars.push({ name: "REACT_APP_GOOGLE_CLIENT_ID", desc: "Authenticates your frontend web infrastructure within Google Cloud OAuth." });
  }

  // Halt interface initialization cleanly before OAuth triggers run into empty string configuration crashes
  if (missingVars.length > 0) {
    return <ConfigurationErrorView missingVars={missingVars} />;
  }

  const OAuthWrapper = ({ children }) => {
    const login = useGoogleLogin({
      flow: "auth-code",
      scope: "openid email profile https://www.googleapis.com/auth/calendar",
      onSuccess: async (response) => {
        console.log("OAuth success: Authorization token handshake payload successfully parsed.");
        setView('auth-loading');
        try {
          const authCode = response?.code;
          if (!authCode) throw new Error("No authorization code packed inside Google redirection map.");
          
          console.log("Backend token exchange initiated...");
          await axios.post("/api/create-tokens", { code: authCode }, { timeout: 15000 });
          
          console.log("Backend profile fetch initiated...");
          const userRes = await axios.get("/api/user", { timeout: 15000 });
          
          if (isMounted.current) {
            console.log("Authentication profile matched: Session initialized.");
            handleAuthSuccessData(userRes.data);
          }
        } catch (err) {
          console.error("OAuth process crashed inside backend sync context:", err);
          if (isMounted.current) setView('auth-error');
        }
      },
      onError: (errPayload) => {
        console.error("OAuth failure window callback dispatched:", errPayload);
        setView('auth-error');
      }
    });

    return children(login);
  };

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <OAuthWrapper>
          {(loginFn) => (
            <AppShell user={user} currentView={view} setView={setView}>
              {renderContent(loginFn)}
            </AppShell>
          )}
        </OAuthWrapper>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
};

export default App;