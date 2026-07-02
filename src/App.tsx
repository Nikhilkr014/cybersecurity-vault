import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface EncryptedItem {
  id: string;
  title: string;
  encryptedData: string;
  createdAt: string;
}

export default function App() {
  // Navigation & View controls: 'landing' | 'auth' | 'dashboard'
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>(() => {
    const token = localStorage.getItem('xero-token');
    return token ? 'dashboard' : 'landing';
  });

  // Capsule Navigation state
  const navLinks = ['Method', 'Pricing', 'Docs'];
  const [activeNavLink, setActiveNavLink] = useState('Method');

  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem('xero-token'));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('xero-email'));
  
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Dashboard states
  const [items, setItems] = useState<EncryptedItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPlaintext, setNewPlaintext] = useState('');
  const [decryptedTexts, setDecryptedTexts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Animation Refs (Classic pipeline)
  const pipelineRef = useRef<HTMLDivElement>(null);
  const nodeStackRef = useRef<HTMLDivElement>(null);
  const nodeXRef = useRef<HTMLDivElement>(null);
  const nodeShieldRef = useRef<HTMLDivElement>(null);
  const beamGlowRef = useRef<SVGPathElement>(null);
  const beamCoreRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);

  // State machine tracker for pipeline
  const animationState = useRef({
    state: 'p1', // 'p1' | 'splash' | 'p2' | 'idle'
    startTime: performance.now(),
  });

  const navigateToAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthEmail('');
    setAuthPassword('');
    setFirstName('');
    setLastName('');
    setView('auth');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  // Compute and update the beam SVG path coordinates dynamically
  const updatePath = () => {
    const pipeline = pipelineRef.current;
    const nodeStack = nodeStackRef.current;
    const nodeX = nodeXRef.current;
    const nodeShield = nodeShieldRef.current;
    const beamGlow = beamGlowRef.current;
    const beamCore = beamCoreRef.current;

    if (!pipeline || !nodeStack || !nodeX || !nodeShield || !beamGlow || !beamCore) return;

    const pRect = pipeline.getBoundingClientRect();
    const sRect = nodeStack.getBoundingClientRect();
    const xRect = nodeX.getBoundingClientRect();
    const shRect = nodeShield.getBoundingClientRect();

    const startX = sRect.left + sRect.width / 2 - pRect.left;
    const startY = sRect.top + sRect.height / 2 - pRect.top;

    const midX = xRect.left + xRect.width / 2 - pRect.left;
    const midY = xRect.top + xRect.height / 2 - pRect.top;

    const endX = shRect.left + shRect.width / 2 - pRect.left;
    const endY = shRect.top + shRect.height / 2 - pRect.top;

    const d = `M ${startX},${startY} L ${midX},${midY} L ${endX},${endY}`;

    beamGlow.setAttribute('d', d);
    beamCore.setAttribute('d', d);
  };

  // Fetch encrypted list from the API server
  const fetchItems = async (authToken: string) => {
    try {
      const response = await fetch('/api/items', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else if (response.status === 403 || response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch encryption records:', err);
    }
  };

  // Handle Auth submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const url = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('xero-token', data.token);
      localStorage.setItem('xero-email', data.email);
      setToken(data.token);
      setUserEmail(data.email);
      
      setAuthEmail('');
      setAuthPassword('');
      setFirstName('');
      setLastName('');
      setAuthError('');
      
      setView('dashboard');
      fetchItems(data.token);
    } catch (err: any) {
      setAuthError(err.message || 'Server error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('xero-token');
    localStorage.removeItem('xero-email');
    setToken(null);
    setUserEmail(null);
    setItems([]);
    setDecryptedTexts({});
    setView('landing');
  };

  // Send plaintext to server to encrypt and save
  const handleEncryptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPlaintext.trim() || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/encrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle, plaintext: newPlaintext }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Encryption failed');
      }

      setItems((prev) => [data, ...prev]);
      setNewTitle('');
      setNewPlaintext('');
    } catch (err: any) {
      alert(err.message || 'Encryption failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Request decryption key and verification from server
  const handleDecrypt = async (id: string) => {
    if (!token) return;

    try {
      const response = await fetch('/api/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Decryption failed');
      }

      setDecryptedTexts((prev) => ({
        ...prev,
        [id]: data.plaintext,
      }));
    } catch (err: any) {
      alert(err.message || 'Decryption failed');
    }
  };

  useEffect(() => {
    if (view === 'auth') return; // Skip pipeline setup during full-page auth screen

    updatePath();
    const timer = setTimeout(updatePath, 150);

    const handleResize = () => {
      updatePath();
    };
    window.addEventListener('resize', handleResize);

    if (token) {
      fetchItems(token);
    }

    // requestAnimationFrame Loop for pipeline animation
    let animId: number;
    animationState.current.startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - animationState.current.startTime;
      const current = animationState.current;

      const nodeStack = nodeStackRef.current;
      const nodeShield = nodeShieldRef.current;
      const beamGlow = beamGlowRef.current;
      const beamCore = beamCoreRef.current;
      const gradient = gradientRef.current;
      const splash = splashRef.current;

      if (!nodeStack || !nodeShield || !beamGlow || !beamCore || !gradient || !splash) {
        animId = requestAnimationFrame(tick);
        return;
      }

      if (current.state === 'p1') {
        if (elapsed >= 800) {
          current.state = 'splash';
          current.startTime = now;
          beamGlow.style.opacity = '0';
          beamCore.style.opacity = '0';
          splash.classList.add('animate');
          nodeStack.classList.remove('active');
        } else {
          const p = (elapsed / 800) * 0.5;
          const center = p * 100;
          gradient.setAttribute('x1', `${center - 5}%`);
          gradient.setAttribute('x2', `${center + 5}%`);

          if (p < 0.4) {
            nodeStack.classList.add('active');
          } else {
            nodeStack.classList.remove('active');
          }
        }
      } else if (current.state === 'splash') {
        if (elapsed >= 800) {
          current.state = 'p2';
          current.startTime = now;
          splash.classList.remove('animate');
          beamGlow.style.opacity = '1';
          beamCore.style.opacity = '1';
        }
      } else if (current.state === 'p2') {
        if (elapsed >= 800) {
          current.state = 'idle';
          current.startTime = now;
          nodeShield.classList.remove('active');
          beamGlow.style.opacity = '0';
          beamCore.style.opacity = '0';
        } else {
          const p = 0.5 + (elapsed / 800) * 0.5;
          const center = p * 100;
          gradient.setAttribute('x1', `${center - 5}%`);
          gradient.setAttribute('x2', `${center + 5}%`);

          if (p > 0.6) {
            nodeShield.classList.add('active');
          } else {
            nodeShield.classList.remove('active');
          }
        }
      } else if (current.state === 'idle') {
        if (elapsed >= 1000) {
          current.state = 'p1';
          current.startTime = now;
          beamGlow.style.opacity = '1';
          beamCore.style.opacity = '1';
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      document.body.style.overflow = '';
    };
  }, [view, token]);

  // Framer Motion Animation Variants for Left Column Steps
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  // FULL-PAGE AUTHENTICATION SCREEN ("Aurora Sign Up / Log In")
  if (view === 'auth') {
    return (
      <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4 relative">
        
        {/* Back Button */}
        <button 
          onClick={() => setView(token ? 'dashboard' : 'landing')}
          className="absolute top-6 right-6 z-50 flex items-center gap-2.5 px-4.5 h-11 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.12] rounded-full hover:bg-white/[0.08] hover:border-white/[0.22] hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] transition-all duration-300 text-xs font-semibold text-white/90 cursor-pointer"
        >
          <svg viewBox="0 0 40 40" fill="none" className="w-3.5 h-3.5 text-white/80" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 7.5L14 7.5L18.5 16.5L11.5 16.5L7 7.5Z" fill="currentColor" />
            <path d="M33 7.5L26 7.5L21.5 16.5L28.5 16.5L33 7.5Z" fill="currentColor" />
            <path d="M7 32.5L14 32.5L18.5 23.5L11.5 23.5L7 32.5Z" fill="currentColor" />
            <path d="M33 32.5L26 32.5L21.5 23.5L28.5 23.5L33 32.5Z" fill="currentColor" />
            <rect x="18" y="18" width="4" height="4" rx="1" fill="currentColor" />
          </svg>
          Close
        </button>

        {/* LEFT COLUMN: Hero & Background Video */}
        <div className="hidden lg:flex w-[52%] relative flex-col items-center justify-end pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full">
          {/* Background Video */}
          <video 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source 
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4" 
              type="video/mp4" 
            />
          </video>

          {/* Staggered Content Overlay */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="z-10 w-full max-w-xs space-y-8"
          >
            {/* Brand Logo */}
            <motion.div variants={childVariants} className="flex items-center gap-3">
              <svg viewBox="0 0 40 40" fill="none" className="w-6 h-6 text-[#c8a0e0]" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 7.5L14 7.5L18.5 16.5L11.5 16.5L7 7.5Z" fill="currentColor" />
                <path d="M33 7.5L26 7.5L21.5 16.5L28.5 16.5L33 7.5Z" fill="currentColor" />
                <path d="M7 32.5L14 32.5L18.5 23.5L11.5 23.5L7 32.5Z" fill="currentColor" />
                <path d="M33 32.5L26 32.5L21.5 23.5L28.5 23.5L33 32.5Z" fill="currentColor" />
                <rect x="18" y="18" width="4" height="4" rx="1" fill="currentColor" />
              </svg>
              <span className="text-xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-[#c8a0e0] bg-clip-text text-transparent">Xero</span>
            </motion.div>

            {/* Heading Block */}
            <motion.div variants={childVariants} className="space-y-2">
              <h1 className="text-4xl font-medium tracking-tight whitespace-nowrap">Join Xero</h1>
              <p className="text-white/60 text-sm leading-relaxed">
                Follow these 3 quick phases to activate your space.
              </p>
            </motion.div>

            {/* Steps list */}
            <motion.div variants={childVariants} className="space-y-3">
              <StepItem number={1} text="Register your identity" active={authMode === 'signup'} />
              <StepItem number={2} text="Configure your studio" active={authMode === 'login'} />
              <StepItem number={3} text="Finalize your profile" />
            </motion.div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: Sign Up Form */}
        <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto lg:overflow-hidden bg-black">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-xl space-y-8 lg:space-y-6 sm:space-y-10"
          >
            {/* Header */}
            <div>
              <h2 className="text-3xl font-medium tracking-tight">
                {authMode === 'signup' ? 'Create New Profile' : 'Welcome Back'}
              </h2>
              <p className="text-white/40 text-sm mt-2">
                {authMode === 'signup' 
                  ? 'Input your basic details to begin the journey.' 
                  : 'Enter your profile credentials to access your secure space.'}
              </p>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <SocialButton 
                icon={
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none">
                    <path fill="#EA4335" d="M12.2 5c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18.1 1.4 15.3.6 12.2.6 7.5.6 3.5 3.3 1.5 7.2l4 3.1c1-2.9 3.7-5.3 6.7-5.3z"/>
                    <path fill="#4285F4" d="M23.5 12.2c0-.8-.1-1.6-.2-2.3H12.2v4.4h6.3c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.1-2 3.7-4.9 3.7-8.6z"/>
                    <path fill="#FBBC05" d="M5.5 14.7c-.3-.8-.4-1.7-.4-2.5s.1-1.7.4-2.5L1.5 6.6C.5 8.6 0 10.8 0 12.2s.5 3.6 1.5 5.6l4-3.1z"/>
                    <path fill="#34A853" d="M12.2 23.4c3.1 0 5.8-1 7.7-2.7l-3.7-2.9c-1.1.7-2.5 1.2-4 1.2-3 0-5.7-2.4-6.7-5.3l-4 3.1c2 3.9 6 6.6 10.7 6.6z"/>
                  </svg>
                } 
                label="Google" 
              />
              <SocialButton 
                icon={
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                } 
                label="GitHub" 
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">
                Or
              </span>
            </div>

            {/* Form */}
            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-sm text-left">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup 
                    label="First Name" 
                    placeholder="Jane" 
                    type="text" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    required 
                  />
                  <InputGroup 
                    label="Last Name" 
                    placeholder="Doe" 
                    type="text" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    required 
                  />
                </div>
              )}

              <InputGroup 
                label="Email" 
                placeholder="name@company.com" 
                type="email" 
                value={authEmail} 
                onChange={(e) => setAuthEmail(e.target.value)} 
                required 
              />

              <div className="flex flex-col gap-2 w-full text-left relative">
                <label className="text-sm font-medium text-white">Password</label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    className="bg-brand-gray border-none rounded-xl h-11 pl-4 pr-12 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#c8a0e0]/30 outline-none w-full text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {authMode === 'signup' && (
                  <span className="text-[10px] text-white/40 mt-1">Requires at least 8 symbols.</span>
                )}
              </div>

              <button 
                type="submit" 
                className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] mt-4 transition-all duration-200 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : authMode === 'signup' ? 'Create Account' : 'Log In'}
              </button>
            </form>

            {/* Footer switcher */}
            <div className="text-center">
              {authMode === 'signup' ? (
                <p className="text-sm text-white/40">
                  Member of the team?{' '}
                  <button 
                    onClick={() => setAuthMode('login')} 
                    className="text-white hover:underline font-medium cursor-pointer"
                  >
                    Log in
                  </button>
                </p>
              ) : (
                <p className="text-sm text-white/40">
                  New to the platform?{' '}
                  <button 
                    onClick={() => setAuthMode('signup')} 
                    className="text-white hover:underline font-medium cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  // STANDARD LANDING PAGE OR SECURE DASHBOARD VIEW
  return (
    <>
      {/* NAVBAR */}
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-[1600px] mx-auto px-6 py-4 border-b border-white/5 relative z-[1001]">
        {/* Left Logo - Xero Brand Name only */}
        <div className="justify-self-start">
          <a href="#" className="flex items-center gap-2.5 nav-logo" onClick={() => setView('landing')}>
            <span className="text-white font-bold tracking-tight text-xl">Xero</span>
          </a>
        </div>

        {/* Center Nav Capsule */}
        <div className="justify-self-center flex items-center justify-center">
          <ul className="flex items-center gap-1 bg-[#111118] border border-white/10 rounded-full p-1.5 shadow-lg shadow-black/40">
            {navLinks.map((link) => {
              const isActive = activeNavLink === link;
              return (
                <li key={link} className="relative">
                  <button
                    onClick={() => {
                      setActiveNavLink(link);
                    }}
                    className={`relative z-10 px-4 sm:px-5 py-2 text-[10px] sm:text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer ${
                      isActive ? 'text-black font-bold' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-pill"
                        className="absolute inset-0 bg-white rounded-full z-[-1]"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {link}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right Action Capsule */}
        <div className="justify-self-end flex items-center gap-2">
          {token ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-[#111118] border border-white/10 rounded-full p-1.5 pl-3 sm:pl-4 shadow-lg shadow-black/40">
              <span className="text-white/60 text-[10px] sm:text-xs font-medium hidden sm:inline">{userEmail}</span>
              <button 
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 bg-[#111118] border border-white/10 rounded-full p-1.5 shadow-lg shadow-black/40">
              <button 
                onClick={() => navigateToAuth('login')}
                className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold rounded-full text-white/70 hover:text-white transition-all cursor-pointer"
              >
                Log In
              </button>
              <button 
                onClick={() => navigateToAuth('signup')}
                className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-all cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* HERO CARD */}
      <section className="hero-card" onMouseMove={handleMouseMove}>
        <div className="hero-card-border-glow" />
        <div className="hero-card-bg-glow" />
        <div className="hero-grid"></div>

        {/* ICON PIPELINE */}
        <div className="icon-pipeline" ref={pipelineRef}>
          <svg className="beam-svg">
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="beam-gradient" gradientUnits="userSpaceOnUse" ref={gradientRef} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b04090" stopOpacity="0" />
                <stop offset="20%" stopColor="#b04090" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fff" stopOpacity="1" />
                <stop offset="80%" stopColor="#c8a0e0" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c8a0e0" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path ref={beamGlowRef} stroke="url(#beam-gradient)" strokeWidth="2" filter="url(#glow)" opacity="0.6" />
            <path ref={beamCoreRef} stroke="url(#beam-gradient)" strokeWidth="0.8" />
          </svg>

          {/* Left Node */}
          <div className="icon-node node-light-right" id="node-stack" ref={nodeStackRef}>
            <svg viewBox="0 0 24 24">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>

          <div className="pipeline-line"></div>

          {/* Center Wrapper */}
          <div style={{ position: 'relative' }}>
            <div className="splash" ref={splashRef}></div>
            <div className="icon-node-center" id="node-x" ref={nodeXRef}>
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 7.5L14 7.5L18.5 16.5L11.5 16.5L7 7.5Z" fill="white" />
                <path d="M33 7.5L26 7.5L21.5 16.5L28.5 16.5L33 7.5Z" fill="white" />
                <path d="M7 32.5L14 32.5L18.5 23.5L11.5 23.5L7 32.5Z" fill="white" />
                <path d="M33 32.5L26 32.5L21.5 23.5L28.5 23.5L33 32.5Z" fill="white" />
                <rect x="18" y="18" width="4" height="4" rx="1" fill="white" />
              </svg>
            </div>
          </div>

          <div className="pipeline-line right"></div>

          {/* Right Node */}
          <div className="icon-node node-light-left" id="node-shield" ref={nodeShieldRef}>
            <svg viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
        </div>

        {/* HERO CONTENT OR DASHBOARD */}
        {view === 'dashboard' ? (
          /* Dashboard Layout */
          <div className="dashboard-container">
            {/* Encryption Module */}
            <div className="dashboard-panel">
              <h2>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                AES Encryption Portal
              </h2>
              <form onSubmit={handleEncryptSubmit}>
                <div className="dashboard-input-group">
                  <label htmlFor="title">Record Title</label>
                  <input
                    id="title"
                    type="text"
                    placeholder="e.g. My Database Password"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="dashboard-input-group">
                  <label htmlFor="plaintext">Plaintext Data</label>
                  <textarea
                    id="plaintext"
                    rows={4}
                    placeholder="Enter sensitive data to encrypt..."
                    value={newPlaintext}
                    onChange={(e) => setNewPlaintext(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-dashboard-submit" disabled={isLoading}>
                  {isLoading ? 'Encrypting...' : 'Encrypt & Save'}
                </button>
              </form>
            </div>

            {/* Records List Module */}
            <div className="dashboard-panel">
              <h2>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Secure Saved Vault
              </h2>
              {items.length === 0 ? (
                <div className="no-records">
                  No encrypted items yet. Encrypt a message on the left to start!
                </div>
              ) : (
                <div className="records-list">
                  {items.map((item) => (
                    <div key={item.id} className="record-item">
                      <div className="record-header">
                        <span className="record-title">{item.title}</span>
                      </div>
                      <div className="record-hex">
                        {item.encryptedData.substring(0, 48)}...
                      </div>
                      <div className="record-actions">
                        <button 
                          className="btn-record-decrypt"
                          onClick={() => handleDecrypt(item.id)}
                        >
                          Decrypt
                        </button>
                        {decryptedTexts[item.id] !== undefined && (
                          <div className="decrypted-result">
                            Plaintext: <strong>{decryptedTexts[item.id]}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Landing Hero Text */
          <div className="hero-content">
            <h1 className="hero-heading">
              The simple way
              <strong>encryption your data</strong>
            </h1>
            <p className="hero-sub">
              Fully managed data encrypting service and annotation<br />
              platform for teams of all industries.
            </p>
            <a href="#" className="btn-cta" onClick={() => navigateToAuth('signup')}>Get Started</a>
          </div>
        )}
      </section>

      {/* BRANDS ROW */}
      <div className="brands">
        <div className="brand-item">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
            <path fill="var(--bg)" d="M8 9h8v2H8zm0 4h6v2H8z" />
          </svg>
          Expedia
        </div>

        <div className="brand-item">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="7" r="4" fill="currentColor" />
            <circle cx="5" cy="16" r="3.5" fill="currentColor" />
            <circle cx="19" cy="16" r="3.5" fill="currentColor" />
          </svg>
          asana
        </div>

        <div className="brand-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 8h16M8 12h8M4 16h16" />
          </svg>
          zenefits
        </div>

        <div className="brand-item">
          <svg viewBox="0 0 24 24">
            <circle cx="15.5" cy="8.5" r="2.5" fill="currentColor" />
            <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="10.5" y1="8.5" x2="13" y2="8.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="14" r="1.5" fill="currentColor" />
            <line x1="8.5" y1="10.5" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          HubSp<span className="hubspot-dot"></span>t
        </div>

        <div className="brand-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
            <line x1="5.6" y1="18.4" x2="18.4" y2="5.6" />
          </svg>
          loom
        </div>
      </div>
    </>
  );
}

// ==========================================
// REUSABLE SUB-COMPONENTS
// ==========================================

interface StepItemProps {
  number: number;
  text: string;
  active?: boolean;
}

function StepItem({ number, text, active }: StepItemProps) {
  return (
    <div 
      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 w-full max-w-xs ${
        active 
          ? 'bg-white text-black border border-[#c8a0e0]/40 shadow-[0_0_15px_rgba(200,160,224,0.15)]' 
          : 'bg-brand-gray text-white border-none opacity-60'
      }`}
    >
      <div 
        className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
          active 
            ? 'bg-gradient-to-tr from-[#b04090] to-[#c8a0e0] text-white' 
            : 'bg-white/10 text-white/40'
        }`}
      >
        {number}
      </div>
      <span className="font-medium text-sm">{text}</span>
    </div>
  );
}

interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function SocialButton({ icon, label, onClick }: SocialButtonProps) {
  return (
    <button 
      type="button" 
      onClick={onClick}
      className="flex items-center justify-center gap-3 w-full h-12 bg-black border border-white/10 rounded-xl hover:bg-white/5 transition-all text-sm font-medium text-white cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

function InputGroup({ label, ...props }: InputGroupProps) {
  return (
    <div className="flex flex-col gap-2 w-full text-left">
      <label className="text-sm font-medium text-white">{label}</label>
      <input 
        {...props}
        className="bg-brand-gray border-none rounded-xl h-11 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#c8a0e0]/30 outline-none w-full text-sm transition-all"
      />
    </div>
  );
}
