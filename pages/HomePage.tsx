
import React, { useEffect, useRef } from 'react';
import { ModalType } from '../types';
import { APP_TITLE } from '../constants';
// Button component is now more generic, specific styling for homepage buttons will be here
import { useSettings } from '../contexts/SettingsContext';

interface HomePageProps {
  openModal: (modalType: ModalType) => void;
}

const ParticleBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const numParticles = 20; // Reduced density
    for (let i = 0; i < numParticles; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      const size = Math.random() * 10 + 3; // Size between 3px and 13px
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 15}s`; // Randomize animation start
      particle.style.animationDuration = `${Math.random() * 10 + 15}s`; // Randomize duration
      container.appendChild(particle);
    }
     return () => {
      if (container) {
        container.innerHTML = ''; // Clean up particles
      }
    };
  }, []);

  return <div ref={containerRef} className="particle-background" aria-hidden="true"></div>;
};


const HomePage: React.FC<HomePageProps> = ({ openModal }) => {
  const { settings } = useSettings(); // To get current theme for dynamic styles if needed
  const nsfwSettings = useSettings().nsfwSettings;
  const nsfwEnabled = nsfwSettings.enabled;

  const getButtonBaseStyle = (isLarge: boolean = false) => 
    `w-full text-white 
     ${isLarge ? 'text-lg sm:text-xl py-4 sm:py-5' : 'text-base sm:text-lg py-3 sm:py-3.5'} 
     font-semibold flex items-center justify-center 
     transform transition-all duration-300 ease-in-out 
     hover:shadow-xl hover:-translate-y-0.5 
     focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-60 
     button-shimmer rounded-xl shadow-lg`; // Added shadow-lg for more depth

  const buttonConfigs = [
    {
      label: "Bắt Đầu Khởi Tạo Mới",
      modal: ModalType.NewStorySetup,
      icon: "fas fa-wand-magic-sparkles", // Changed icon
      gradient: "bg-gradient-to-br from-primary via-emerald-400 to-green-400 dark:from-primary-dark dark:via-emerald-600 dark:to-green-600",
      ring: "focus-visible:ring-primary",
      isLarge: true,
      shimmerDelay: '0s'
    },
    {
      label: "Tải Truyện Đã Lưu",
      modal: ModalType.LoadStory,
      icon: "fas fa-upload", // Changed icon
      gradient: "bg-gradient-to-br from-secondary via-sky-400 to-blue-400 dark:from-secondary-dark dark:via-sky-600 dark:to-blue-600",
      ring: "focus-visible:ring-secondary",
      shimmerDelay: '0.15s'
    },
    {
      label: "Hướng Dẫn Chi Tiết", // Updated label
      modal: ModalType.Guide,
      icon: "fas fa-book-reader", // Changed icon
      gradient: "bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 dark:from-indigo-600 dark:via-purple-600 dark:to-fuchsia-600",
      ring: "focus-visible:ring-indigo-400",
      shimmerDelay: '0.3s'
    },
    {
      label: "Thiết Lập API Key",
      modal: ModalType.APISettings,
      icon: "fas fa-key",
      gradient: "bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 dark:from-teal-600 dark:via-cyan-600 dark:to-sky-600",
      ring: "focus-visible:ring-teal-400",
      shimmerDelay: '0.45s'
    },
    {
      label: `Chế Độ NSFW ${nsfwEnabled ? "(Đang Bật)" : "(Đang Tắt)"}`, // Updated label
      modal: ModalType.NSFWSettings,
      icon: `fas ${nsfwEnabled ? 'fa-fire-alt' : 'fa-shield-virus'}`, // Changed icons
      gradient: nsfwEnabled 
        ? "bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 dark:from-red-600 dark:via-orange-600 dark:to-amber-600"
        : "bg-gradient-to-br from-slate-500 via-gray-500 to-stone-500 dark:from-slate-600 dark:via-gray-600 dark:to-stone-600",
      ring: nsfwEnabled 
        ? "focus-visible:ring-red-400"
        : "focus-visible:ring-slate-400",
      shimmerDelay: '0.6s'
    },
    {
      label: "Cài Đặt Chung",
      modal: ModalType.GeneralSettings,
      icon: "fas fa-cogs", // Changed icon
      gradient: "bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 dark:from-pink-600 dark:via-rose-600 dark:to-red-600",
      ring: "focus-visible:ring-pink-400",
      isGridFullSpan: true,
      shimmerDelay: '0.75s'
    },
  ];

  return (
    <>
      <ParticleBackground />
      <div className="relative flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 dark:from-slate-900 dark:via-background-dark dark:to-slate-800 transition-colors duration-300">
        <header className="text-center mb-10 sm:mb-12 z-10">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-secondary-dark dark:from-primary-light dark:via-blue-400 dark:to-secondary animate-text-gradient-wave mb-4"
              style={{ WebkitTextStroke: settings.theme === 'dark' ? '0.5px rgba(255,255,255,0.1)' : '1px rgba(0,0,0,0.05)', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
            {APP_TITLE}
          </h1>
          <p className="text-md sm:text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Kiến tạo thế giới, hóa thân vào nhân vật, và để AI dẫn dắt bạn qua những cuộc phiêu lưu vô tận đậm chất tiểu thuyết mạng.
          </p>
        </header>

        <main className="w-full max-w-sm md:max-w-md lg:max-w-lg space-y-5 z-10">
          {buttonConfigs.slice(0, 1).map(btn => ( // Main large button
            <button
              key={btn.label}
              className={`${getButtonBaseStyle(btn.isLarge)} ${btn.gradient} ${btn.ring}`}
              style={{ '--shimmer-delay': btn.shimmerDelay } as React.CSSProperties}
              onClick={() => openModal(btn.modal)}
              aria-label={btn.label}
            >
              <i className={`${btn.icon} mr-3 ${btn.isLarge ? 'text-xl sm:text-2xl' : 'text-lg'}`}></i>{btn.label}
            </button>
          ))}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {buttonConfigs.slice(1).map(btn => (
              <button
                key={btn.label}
                className={`${getButtonBaseStyle(false)} ${btn.gradient} ${btn.ring} ${btn.isGridFullSpan ? 'sm:col-span-2' : ''}`}
                style={{ '--shimmer-delay': btn.shimmerDelay } as React.CSSProperties}
                onClick={() => openModal(btn.modal)}
                aria-label={btn.label}
              >
                <i className={`${btn.icon} mr-2 text-md`}></i>{btn.label}
              </button>
            ))}
          </div>
        </main>

        <footer className="mt-12 sm:mt-16 text-center text-sm text-slate-500 dark:text-slate-400 z-10">
          <p>&copy; {new Date().getFullYear()} {APP_TITLE}.</p>
          <p className="text-sm mt-1">Một sản phẩm được tạo ra với sự đồng hành của Trí Tuệ Nhân Tạo.</p>
          <p className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 mt-3">
              <i className="fas fa-code mr-1"></i> Thiết kế bởi @LocVinh04
          </p>
        </footer>
      </div>
    </>
  );
};

export default HomePage;
