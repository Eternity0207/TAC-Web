const DonationModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary">
          <i className="fas fa-cow" aria-hidden="true"></i>
        </div>

        <h3 className="mb-2 text-xl font-semibold text-gray-900">Small order, big impact</h3>
        <p className="text-sm leading-relaxed text-gray-600">
          Rs 5 from every order supports cow fodder and animal welfare.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onClose} className="btn-primary flex-1">
            Got it ❤
          </button>
          <button
            type="button"
            onClick={() => {
              window.open('/blog', '_self');
              onClose();
            }}
            className="flex-1 rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 ease-in-out hover:border-primary hover:text-primary active:scale-95"
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;
