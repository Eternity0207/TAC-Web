import logo from '../assets/logo.png';

const GlobalLoader = ({ isVisible }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-50 via-green-50 to-white transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!isVisible}
    >
      <div className="text-center">
        <div className="mx-auto mb-5 h-20 w-20 animate-pulse-slow rounded-2xl bg-white/80 p-2 shadow-lg ring-1 ring-primary-100">
          <img src={logo} alt="The Awla Company" className="h-full w-full object-contain" />
        </div>
        <p className="fade-in-up text-base font-semibold text-primary">Preparing something natural...</p>
        <div className="mt-2 flex items-center justify-center gap-1 text-primary">
          <span className="loader-dot" style={{ animationDelay: '0ms' }} />
          <span className="loader-dot" style={{ animationDelay: '120ms' }} />
          <span className="loader-dot" style={{ animationDelay: '240ms' }} />
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;
