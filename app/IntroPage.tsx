import React from "react";
import { motion } from "framer-motion";
import { useGlobal } from "../context/GlobalState";
import {
  PlayCircle,
  Info,
  Bot,
  PenTool,
  BarChart3,
  FileSignature,
  Settings,
  Lightbulb,
  CheckCircle2,
  Gauge,
  Network,
  Box,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

interface IntroPageProps {
  onEnter: () => void;
  onAbout: () => void;
  onNavigate?: (path: string) => void;
}

const FloatingIcon = ({ icon, color, bg, pos, size, delay }: any) => (
  <motion.div
    animate={{ y: [0, -15, 0] }}
    transition={{
      repeat: Infinity,
      duration: 4 + Math.random() * 2,
      ease: "easeInOut",
      delay,
    }}
    className={`absolute ${pos} ${size} ${bg} ${color} rounded-2xl flex items-center justify-center shadow-lg border-2 border-white backdrop-blur-md z-0`}
  >
    {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
  </motion.div>
);

const IntroPage: React.FC<IntroPageProps> = ({ onEnter, onAbout }) => {
  const { currentUser, data } = useGlobal();

  return (
    <div
      className="flex flex-col items-center justify-between min-h-[70vh] w-full relative font-arabic overflow-hidden rounded-[2rem] bg-slate-50/50"
      dir="rtl"
    >
      {/* Background Gradient & Orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-teal-50/50 to-amber-50/80 pointer-events-none -z-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl relative z-10 py-12 px-4">
        {/* Logo Area */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-white/70 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-white/80 mb-6"
        >
          {data.aboutLogoImg ? (
            <img
              src={data.aboutLogoImg}
              alt="شعار البرنامج"
              className="h-16 object-contain"
            />
          ) : (
            <>
              <Bot className="text-blue-600" size={32} />
              <div className="flex flex-col items-center justify-center">
                <span className="font-black text-2xl text-slate-800 leading-none">
                  رفيقك
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                  Al-Taqareer
                </span>
              </div>
              <PenTool className="text-teal-600" size={28} />
            </>
          )}
        </motion.div>

        {/* Text Headers */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-4 mb-16"
        >
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-l from-blue-700 to-teal-600 leading-normal pb-2">
            مرحباً بك في نظام رفيقك في كتابة التقارير
          </h1>
          <p className="text-lg md:text-xl font-bold text-slate-700 max-w-3xl mx-auto leading-relaxed">
            نسعد كثيراً بخدمتكم والارتقاء معكم إلى أفضل المستويات من خلال
            التقارير الإلكترونية
          </p>


        </motion.div>

        {/* Central Abstract Graphic */}
        <div className="relative w-full max-w-3xl lg:max-w-4xl aspect-[16/10] md:aspect-[21/9] mx-auto mt-4 mb-12 flex items-center justify-center">
          {/* Central Element: A glowing tablet/screen */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 w-64 h-48 md:w-96 md:h-64 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-[6px] border-white flex flex-col items-center justify-center p-2 transform transition-transform duration-500 hover:scale-105"
          >
            <div className="w-full h-full bg-slate-50 rounded-2xl border border-slate-100 flex flex-col overflow-hidden relative shadow-inner">
              <div className="h-8 bg-slate-200/50 w-full flex items-center px-4 gap-2 border-b border-slate-200">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 p-5 flex flex-col gap-4">
                <div className="h-4 w-5/12 bg-blue-100 rounded-full" />
                <div className="h-3 w-full bg-slate-100 rounded-full" />
                <div className="h-3 w-4/5 bg-slate-100 rounded-full" />
                <div className="mt-auto h-24 md:h-32 w-full bg-gradient-to-t from-blue-50/50 to-transparent rounded-t-xl flex items-end justify-between px-3 md:px-6 pb-2 gap-2 md:gap-4">
                  <motion.div
                    animate={{ height: ["40%", "60%", "40%"] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="flex-1 bg-gradient-to-t from-blue-400 to-blue-300 rounded-t-md opacity-80"
                  />
                  <motion.div
                    animate={{ height: ["70%", "90%", "70%"] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md flex items-end justify-center pb-1"
                  >
                    <BarChart3
                      size={16}
                      className="text-white opacity-50 hidden md:block"
                    />
                  </motion.div>
                  <motion.div
                    animate={{ height: ["30%", "50%", "30%"] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="flex-1 bg-gradient-to-t from-teal-400 to-teal-300 rounded-t-md opacity-80"
                  />
                  <motion.div
                    animate={{ height: ["80%", "100%", "80%"] }}
                    transition={{ duration: 3.5, repeat: Infinity }}
                    className="flex-1 bg-gradient-to-t from-blue-600 to-blue-500 rounded-t-md shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                  <motion.div
                    animate={{ height: ["50%", "80%", "50%"] }}
                    transition={{ duration: 4.5, repeat: Infinity }}
                    className="flex-1 bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-md opacity-90"
                  />
                </div>
              </div>
            </div>
            {/* Tablet stand/glow effect */}
            <div className="absolute -bottom-8 w-64 h-4 bg-slate-300/60 blur-md rounded-full" />
          </motion.div>

          {/* Floating Icons */}
          <FloatingIcon
            icon={<BarChart3 />}
            color="text-amber-500"
            bg="bg-amber-50"
            pos="top-0 left-4 md:left-20"
            size="w-14 h-14 md:w-16 md:h-16"
            delay={0}
          />
          <FloatingIcon
            icon={<FileSignature />}
            color="text-violet-500"
            bg="bg-violet-50"
            pos="top-8 right-2 md:right-24 cursor-pointer hover:bg-violet-100"
            size="w-16 h-16 md:w-20 md:h-20"
            delay={1}
          />
          <FloatingIcon
            icon={<Settings />}
            color="text-pink-500"
            bg="bg-pink-50"
            pos="bottom-8 left-2 md:left-16"
            size="w-12 h-12 md:w-16 md:h-16"
            delay={2}
          />
          <FloatingIcon
            icon={<Lightbulb />}
            color="text-yellow-500"
            bg="bg-yellow-50"
            pos="-top-8 right-1/4 md:right-1/3"
            size="w-12 h-12 md:w-16 md:h-16"
            delay={1.5}
          />
          <FloatingIcon
            icon={<CheckCircle2 />}
            color="text-emerald-500"
            bg="bg-emerald-50"
            pos="left-[20%] md:left-[30%] -bottom-6 md:-bottom-10"
            size="w-12 h-12 md:w-16 md:h-16"
            delay={0.5}
          />
          <FloatingIcon
            icon={<Gauge />}
            color="text-blue-500"
            bg="bg-blue-50"
            pos="bottom-2 right-6 md:right-[15%]"
            size="w-14 h-14 md:w-16 md:h-16"
            delay={2.5}
          />
          <FloatingIcon
            icon={<Network />}
            color="text-indigo-500"
            bg="bg-indigo-50"
            pos="top-[35%] -left-2 md:left-4"
            size="w-16 h-16"
            delay={3}
          />
          <FloatingIcon
            icon={<Box />}
            color="text-orange-500"
            bg="bg-orange-50"
            pos="top-1/4 -right-4 md:right-0"
            size="w-14 h-14 md:w-16 md:h-16"
            delay={1.2}
          />
        </div>
      </div>

      {/* The bottom buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-center gap-6 pb-12 px-4 z-20"
      >
        <button
          onClick={onAbout}
          className="w-full sm:w-auto px-8 py-5 bg-white/80 backdrop-blur-sm border-2 border-slate-200 text-slate-700 rounded-[2rem] font-black text-xl hover:border-slate-300 hover:bg-white shadow-lg shadow-slate-200/50 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          <Info size={28} className="text-slate-500" />
          التعريف بالنظام
        </button>
      </motion.div>

      {data.aboutExternalLinks && data.aboutExternalLinks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-4xl px-4 z-20 pb-12"
        >
          <div className="w-full bg-white/80 backdrop-blur-sm p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-xl">
            <h3 className="text-center font-black text-slate-800 text-2xl mb-6">
              روابط تهمك
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {data.aboutExternalLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-4 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-2xl font-bold flex items-center gap-3 transition-all hover:-translate-y-1"
                >
                  <LinkIcon size={20} className="text-blue-500" />
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default IntroPage;
