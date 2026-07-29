import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Video, Award, Users, 
  ShieldCheck, ArrowRight, Zap, Globe 
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  const features = [
    {
      icon: <BookOpen className="text-blue-400" size={24} />,
      title: "Extensive Course Catalog",
      description: "Browse hundreds of courses across various disciplines taught by industry experts."
    },
    {
      icon: <Video className="text-emerald-400" size={24} />,
      title: "Live Interactive Sessions",
      description: "Join real-time live classes and interact directly with your tutors and peers."
    },
    {
      icon: <Award className="text-amber-400" size={24} />,
      title: "Verifiable Certificates",
      description: "Earn blockchain-verifiable certificates upon course completion to boost your resume."
    },
    {
      icon: <Users className="text-purple-400" size={24} />,
      title: "Community Discussions",
      description: "Engage in meaningful conversations in our dedicated community forums."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-elmessiri overflow-x-hidden selection:bg-blue-500/30">
      
      {/* Navigation Bar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 glass-panel rounded-2xl">
        <div className="px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <img src="/src/assets/green-logo.png" alt="EduCore" className="w-16 h-16 object-contain" />
            <span className="text-xl font-black tracking-widest text-white">EDUCORE</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold tracking-widest uppercase text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
            <button 
              onClick={() => navigate('/login')}
              className="text-white hover:text-blue-400 transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/learner-dashboard/catalogue')}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-2.5 rounded-full text-white transition-all hover:scale-105 active:scale-95"
            >
              Catalog
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden min-h-screen flex items-center">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
          
          {/* Left Side - Logo & Tag */}
          <div className="w-full md:w-1/2 flex justify-center md:justify-start md:ml-12">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="flex justify-center"
              >
                <img src="/src/assets/green-logo.png" alt="EduCore" className="w-64 h-64 md:w-[450px] md:h-[450px] object-contain drop-shadow-[0_0_50px_rgba(59,130,246,0.3)]" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, type: 'spring', delay: 0.1 }}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-sm md:text-base font-bold uppercase tracking-widest mt-4"
              >
                <Zap size={18} /> Holistic E-Learning Platform
              </motion.div>
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="w-full md:w-1/2">
            
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-8 leading-tight"
            >
              Master Your Craft with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 animate-gradient-x">
                Educore LMS
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg md:text-xl text-white/60 max-w-xl mx-auto md:mx-0 mb-12 leading-relaxed"
            >
              A premium learning experience featuring interactive live sessions, comprehensive assignments, verifiable certificates, and a thriving community.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-6"
            >
              <button 
                onClick={() => navigate('/learner-dashboard/catalogue')}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600/80 to-emerald-500/80 backdrop-blur-xl border border-white/20 rounded-full font-bold text-sm uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_8px_32px_0_rgba(59,130,246,0.2)] flex items-center gap-3 w-full sm:w-auto justify-center"
              >
                <span className="relative z-10 text-white">Start Learning</span>
                <ArrowRight size={18} className="relative z-10 text-white group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </button>
              
              <button 
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-full font-bold text-sm uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                Become a Tutor
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-[#0b0f1a] to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 text-white">
            <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: '#ffffff' }}>Key Functionalities</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#ffffff' }}>Everything you need to excel in your learning journey, built with modern technology and premium design.</p>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="group p-8 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#ffffff' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#ffffff' }}>{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 px-6 border-t border-white/5 bg-black relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight" style={{ color: '#ffffff' }}>
                Designed for the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500" style={{ color: '#ffffff' }}>
                  Modern Learner
                </span>
              </h2>
              
              <div className="space-y-8">
                {[
                  { icon: <ShieldCheck className="text-emerald-400" />, title: "Secure & Reliable", desc: "Enterprise-grade security for your data and payments." },
                  { icon: <Globe className="text-blue-400" />, title: "Learn Anywhere", desc: "Fully responsive platform accessible from any device." },
                  { icon: <Users className="text-amber-400" />, title: "Institutional Support", desc: "Join via your institution for specialized curriculums." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold mb-1" style={{ color: '#ffffff' }}>{item.title}</h4>
                      <p className="text-sm" style={{ color: '#ffffff' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative rounded-[40px] overflow-hidden glass-card aspect-square lg:aspect-auto lg:h-[600px] flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60 blur-md scale-110" />
              <div className="relative z-10 p-12 text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl mb-8 animate-bounce-slow">
                  <Award size={48} className="text-white" />
                </div>
                <h3 className="text-3xl font-black mb-4" style={{ color: '#ffffff' }}>Start Achieving Today</h3>
                <p className="mb-8 max-w-sm mx-auto" style={{ color: '#ffffff' }}>Join thousands of learners who are already upgrading their skills on Educore.</p>
                <button 
                  onClick={() => navigate('/learner-dashboard/catalogue')}
                  className="px-8 py-4 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors"
                >
                  Explore Catalog
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 bg-black text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/src/assets/green-logo.png" alt="EduCore" className="w-8 h-8 object-contain" />
          <span className="text-xl font-black tracking-widest">EDUCORE</span>
        </div>
        <p className="text-white/40 text-sm font-medium">
          &copy; {new Date().getFullYear()} Educore LMS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
