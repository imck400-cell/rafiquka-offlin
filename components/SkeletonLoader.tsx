import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const SkeletonLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full mt-4 animate-pulse px-4">
      {/* Central icon or graphic */}
      <motion.div
        animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="mb-8 p-6 bg-white/40 backdrop-blur-md rounded-full shadow-lg border border-white/60 relative"
      >
        <Sparkles size={40} className="text-blue-500/40" />
      </motion.div>

      {/* Main glass card skeleton */}
      <div className="w-full max-w-4xl bg-white/30 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/50 shadow-inner" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-1/3 bg-white/50 rounded-lg" />
            <div className="h-4 w-1/4 bg-white/40 rounded-lg" />
          </div>
        </div>

        {/* Content Skeleton (Filters/Tabs) */}
        <div className="flex gap-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 bg-white/50 rounded-xl" />
          ))}
        </div>

        {/* Table/List Skeleton */}
        <div className="space-y-4">
          <div className="h-12 w-full bg-white/50 rounded-2xl" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 w-full bg-white/40 rounded-xl flex items-center px-4 gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-white/60" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 bg-white/50 rounded-md" />
                <div className="h-3 w-1/3 bg-white/40 rounded-md" />
              </div>
              <div className="h-8 w-20 bg-white/50 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
