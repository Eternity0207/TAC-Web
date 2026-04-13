const Loader = () => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-primary-200 border-t-primary rounded-full animate-spin"></div>
        <div className="mt-4 text-center">
          <p className="text-primary font-semibold">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default Loader;
