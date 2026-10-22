import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

const GlobalScrollArrows: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Also try scrolling the main container if it's the one scrolling
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    // Also try scrolling the main container
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="fixed top-24 left-4 z-50 flex flex-col gap-3">
      {/* Blue Up Arrow - Scroll to Top */}
      <button
        onClick={scrollToTop}
        className="w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center hover:bg-blue-700 hover:scale-110 transition-all active:scale-95 border-2 border-white"
        title="أعلى الصفحة"
      >
        <ArrowUp size={20} strokeWidth={3} />
      </button>

      {/* Orange Down Arrow - Scroll to Bottom */}
      <button
        onClick={scrollToBottom}
        className="w-10 h-10 bg-orange-50 text-white rounded-full shadow-lg shadow-orange-200 flex items-center justify-center hover:bg-orange-600 hover:scale-110 transition-all active:scale-95 border-2 border-white"
        title="أسفل الصفحة"
      >
        <ArrowDown size={20} strokeWidth={3} />
      </button>
    </div>
  );
};

export default GlobalScrollArrows;
