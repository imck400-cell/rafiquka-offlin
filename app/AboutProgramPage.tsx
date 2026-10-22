import React, { useState, useEffect, useRef } from "react";
import { useGlobal } from "../context/GlobalState";
import {
  Building,
  CheckCircle2,
  ShieldCheck,
  Cog,
  MessageCircle,
  Mail,
  ArrowRight,
  HeartHandshake,
  Bot,
  Clock,
  Users,
  FileSignature,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Settings,
  X,
  Plus,
  Trash2,
  Link as LinkIcon,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface AboutProgramPageProps {
  onBack: () => void;
}

const AboutProgramPage: React.FC<AboutProgramPageProps> = ({ onBack }) => {
  const { data, updateData, currentUser } = useGlobal();
  const profile = (data?.profile || {}) as any;

  const isAdminOrFull =
    currentUser?.role === "admin" || currentUser?.permissions?.all === true;

  const [showSettings, setShowSettings] = useState(false);

  const images = data.aboutSliderImages || [];
  const externalLinks = data.aboutExternalLinks || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Default duration in seconds to 5 if not specified
  const currentDuration = images[currentIndex]?.duration || 5;

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    if (images.length <= 1 || showSettings) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(() => {
      handleNext();
    }, currentDuration * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, images.length, currentDuration, showSettings]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  // Setting helpers
  const updateImages = (newImages: any[]) => {
    updateData({ aboutSliderImages: newImages });
  };
  const updateLinks = (newLinks: any[]) => {
    updateData({ aboutExternalLinks: newLinks });
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error(
          "حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 500 كيلوبايت.",
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...images];
        newImages[index].image = reader.result as string;
        updateImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12"
      dir="rtl"
    >
      {/* Header / Back */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-2xl transition-all"
          >
            <ArrowRight size={24} />
          </button>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            التعريف بالنظام
          </h2>
        </div>
        {isAdminOrFull && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
              showSettings
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Settings size={20} />
            <span className="hidden md:inline">التحكم بزر التعريف بالنظام</span>
          </button>
        )}
      </div>

      {showSettings && isAdminOrFull ? (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-amber-200 space-y-8 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Settings className="text-amber-500" /> لوحة تحكم التعريف بالنظام
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 text-slate-400 hover:text-red-500 transition-all bg-slate-50 rounded-xl hover:bg-red-50"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <h4 className="font-extrabold text-lg text-slate-700 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                1
              </div>
              التحكم بشاشة العرض (الصور)
            </h4>
            <div className="grid gap-6">
              {images.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-4 shadow-sm relative"
                >
                  <div className="absolute top-4 left-4">
                    <button
                      onClick={() => {
                        const newArr = [...images];
                        newArr.splice(idx, 1);
                        updateImages(newArr);
                      }}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500">
                        صورة العرض
                      </label>
                      <div className="relative w-full h-32 bg-white rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-blue-400 transition-all">
                        {img.image ? (
                          <img
                            src={img.image}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="text-slate-400 flex flex-col items-center">
                            <Upload size={24} />
                            <span className="text-xs font-bold mt-1">
                              رفع صورة
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleImageUpload(e, idx)}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-4 pr-0 md:pr-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500">
                          عنوان الصورة
                        </label>
                        <input
                          type="text"
                          value={img.title}
                          onChange={(e) => {
                            const newArr = [...images];
                            newArr[idx].title = e.target.value;
                            updateImages(newArr);
                          }}
                          className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-bold outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">
                          وصف الصورة
                        </label>
                        <textarea
                          value={img.description}
                          onChange={(e) => {
                            const newArr = [...images];
                            newArr[idx].description = e.target.value;
                            updateImages(newArr);
                          }}
                          className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-bold outline-none focus:border-blue-400 resize-none h-20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">
                          فترة العرض (ثواني)
                        </label>
                        <input
                          type="number"
                          value={img.duration || 5}
                          onChange={(e) => {
                            const newArr = [...images];
                            newArr[idx].duration =
                              parseInt(e.target.value) || 5;
                            updateImages(newArr);
                          }}
                          className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-bold outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  updateImages([
                    ...images,
                    {
                      id: Date.now().toString(),
                      title: "عنوان جديد",
                      description: "وصف جديد",
                      image: "",
                      duration: 5,
                    },
                  ]);
                }}
                className="w-full py-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-[2rem] font-bold hover:bg-blue-50 transition-all flex justify-center items-center gap-2"
              >
                <Plus size={20} /> إضافة صورة أخرى
              </button>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t">
            <h4 className="font-extrabold text-lg text-slate-700 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                2
              </div>
              روابط خارجية
            </h4>
            <div className="grid gap-4">
              {externalLinks.map((link, idx) => (
                <div
                  key={link.id || idx}
                  className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-start md:items-end relative"
                >
                  <div className="absolute top-2 left-2 md:static md:mb-1">
                    <button
                      onClick={() => {
                        const newArr = [...externalLinks];
                        newArr.splice(idx, 1);
                        updateLinks(newArr);
                      }}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="flex-1 w-full pt-6 md:pt-0">
                    <label className="text-xs font-bold text-slate-500">
                      اسم الرابط (ما سيظهر للزائر)
                    </label>
                    <input
                      type="text"
                      value={link.name}
                      onChange={(e) => {
                        const newArr = [...externalLinks];
                        newArr[idx].name = e.target.value;
                        updateLinks(newArr);
                      }}
                      className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-bold outline-none focus:border-emerald-400"
                      placeholder="مثال: منصة نور"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-slate-500">
                      الرابط الخارجي (URL)
                    </label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newArr = [...externalLinks];
                        newArr[idx].url = e.target.value;
                        updateLinks(newArr);
                      }}
                      className="w-full p-3 rounded-xl border border-slate-200 mt-1 font-bold outline-none focus:border-emerald-400 text-left"
                      dir="ltr"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  updateLinks([
                    ...externalLinks,
                    { id: Date.now().toString(), name: "رابط جديد", url: "" },
                  ]);
                }}
                className="w-full py-4 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-[2rem] font-bold hover:bg-emerald-50 transition-all flex justify-center items-center gap-2"
              >
                <Plus size={20} /> إضافة رابط جديد
              </button>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t">
            <h4 className="font-extrabold text-lg text-slate-700 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                3
              </div>
              شعار البرنامج
            </h4>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="w-full flex-col gap-2">
                <label className="text-sm font-bold text-slate-500 mb-2 block">
                  اختر صورة الشعار
                </label>
                <div className="relative w-full max-w-sm h-40 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-violet-400 transition-all">
                  {data.aboutLogoImg ? (
                    <img
                      src={data.aboutLogoImg}
                      className="w-full h-full object-contain p-2"
                      alt=""
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <Upload size={32} className="mb-2" />
                      <span className="text-sm font-bold">رفع الشعار</span>
                      <span className="text-xs text-slate-500 mt-1">
                        يُفضل بخلفية شفافة
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 500 * 1024) {
                          toast.error(
                            "حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 500 كيلوبايت.",
                          );
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () =>
                          updateData({ aboutLogoImg: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* القسم الأول: الهوية والرسالة */}
      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

        {data.aboutLogoImg ? (
          <img
            src={data.aboutLogoImg}
            alt="شعار البرنامج"
            className="w-32 h-32 object-contain mb-8 animate-in zoom-in"
          />
        ) : profile.logoImg ? (
          <img
            src={profile.logoImg}
            alt="شعار المدارس"
            className="w-32 h-32 object-contain mb-8 animate-in zoom-in"
          />
        ) : (
          <div className="w-32 h-32 bg-blue-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-lg mb-8">
            <Bot size={64} className="text-blue-600" />
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
          رفيقك في كتابة التقارير
        </h1>
        <p className="text-xl md:text-2xl font-bold text-slate-500 max-w-2xl leading-relaxed">
          الحل التقني الشامل للإدارة المدرسية الحديثة.. وبديلك الأمثل للأدبيات
          الورقية
        </p>
      </div>

      {/* شاشة العرض (Carousel) */}
      {images && images.length > 0 && (
        <div className="relative w-full overflow-hidden shadow-2xl bg-black/5 rounded-[3rem] aspect-[16/9] min-h-[400px]">
          <div className="grid grid-cols-1 grid-rows-1 w-full h-full">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="col-start-1 row-start-1 w-full h-full relative flex items-center justify-center bg-black"
              >
                {images[currentIndex].image ? (
                  <img
                    src={images[currentIndex].image}
                    className="w-full h-auto max-h-[80vh] object-contain"
                    alt={images[currentIndex].title}
                  />
                ) : (
                  <div className="text-white/20 font-black text-4xl">
                    صورة غير متوفرة
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20" />

                <div className="absolute inset-0 z-30 flex flex-col justify-end p-6 md:p-12 text-white text-right">
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl md:text-5xl font-heading font-bold drop-shadow-2xl mb-3">
                      {images[currentIndex].title}
                    </h2>
                    <p className="text-lg md:text-xl text-white/95 leading-relaxed drop-shadow-xl max-w-3xl">
                      {images[currentIndex].description}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {images.length > 1 && (
            <>
              {/* أزرار اليمين واليسار */}
              <button
                className="absolute z-40 right-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 border border-white/20 rounded-full text-white transition-all backdrop-blur-sm"
                onClick={handlePrev}
              >
                <ChevronRight size={32} />
              </button>
              <button
                className="absolute z-40 left-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 border border-white/20 rounded-full text-white transition-all backdrop-blur-sm"
                onClick={handleNext}
              >
                <ChevronLeft size={32} />
              </button>

              {/* النقاط السفلية */}
              <div className="absolute z-40 bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > currentIndex ? 1 : -1);
                      setCurrentIndex(index);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? "bg-white w-8"
                        : "bg-white/40 w-2"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* القسم الثاني: الميزات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-blue-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <FileSignature size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">
            إدارة شاملة وسريعة
          </h3>
          <p className="text-slate-500 font-bold leading-relaxed">
            إدارة شاملة وسريعة لجميع التقارير الإدارية بشكل رقمي.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-emerald-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">
            أتمتة شؤون الطلاب
          </h3>
          <p className="text-slate-500 font-bold leading-relaxed">
            أتمتة شؤون الطلاب وتسهيل متابعتهم اليومية باحترافية.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-purple-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">
            متابعة دقيقة للمعلمين
          </h3>
          <p className="text-slate-500 font-bold leading-relaxed">
            أدوات دقيقة وعملية لمتابعة وتقييم أداء المعلمين بشكل دوري.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 xl:col-span-1 border-b-4 border-b-amber-400 hover:-translate-y-1 transition-transform">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">
            توفير الوقت والجهد
          </h3>
          <p className="text-slate-500 font-bold leading-relaxed">
            توفير الوقت والجهد، وخلق بيئة عمل لا ورقية ومتطورة.
          </p>
        </div>
      </div>

      {/* القسم الثالث: رسالة الموثوقية */}
      <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 pointer-events-none -z-10" />
        <HeartHandshake className="w-20 h-20 text-amber-400 mx-auto mb-8 opacity-90" />
        <p className="text-xl md:text-2xl text-slate-300 font-bold leading-loose max-w-4xl mx-auto">
          "هذا البرنامج ليس مجرد أداة تقنية، بل هو ثمرة خبرة ميدانية واستشارية
          في المجال التربوي والإداري{" "}
          <span className="text-white">تتجاوز عشرين عاماً</span>، وتمت استشارة
          كبار الخبراء والمستشارين في هذا المجال، فالبرنامج صُمم خصيصاً{" "}
          <span className="text-emerald-400">
            ليفهم احتياجات القائد والمشرف والمعلم ويلبيها بدقة واحترافية
          </span>
          ."
        </p>
      </div>

      {/* القسم الرابع: قنوات التواصل والدعم */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-center">
        <h3 className="text-2xl font-black text-slate-800 mb-8">
          هل لديك استفسار؟ نحن هنا لمساعدتك واكتشاف المزيد
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a
            href="whatsapp://send?phone=967780804012"
            className="w-full sm:w-auto px-10 py-5 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-[2rem] font-black text-xl transition-all shadow-lg shadow-[#25D366]/30 flex items-center justify-center gap-3 active:scale-95"
          >
            <MessageCircle size={28} />
            تواصل معنا مباشرة
          </a>
          <a
            href="mailto:imck232@gmail.com"
            className="w-full sm:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95"
          >
            <Mail size={28} />
            راسلنا للاستفسار
          </a>
        </div>
      </div>

      {/* القسم الخامس: التذييل */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-flex flex-col items-center justify-center gap-2">
          <span className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-full text-sm font-black border border-slate-300">
            الإصدار 2.2.3
          </span>
          <p className="text-slate-500 font-bold mt-2">
            جميع الحقوق محفوظة © [1447 هـ / 2026 م]
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutProgramPage;
