const DonationBanner = () => {
  return (
    <div className="slide-down sticky top-20 z-40 border-b border-primary-100 bg-gradient-to-r from-primary-50 via-lime-50 to-accent-50">
      <div className="container-custom flex flex-col gap-1.5 py-2.5 text-primary-900 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-xs font-semibold sm:text-sm">
          <i className="fas fa-leaf mr-2" aria-hidden="true"></i>
          Zero preservatives, no artificial flavour, colour, or fragrance. Just 100% pure natural Amla.
        </p>

        <p className="text-xs font-semibold sm:text-sm">
          <i className="fas fa-cow mr-2" aria-hidden="true"></i>
          Rs 5 from every order goes to cow fodder and animal welfare.
        </p>
      </div>
    </div>
  );
};

export default DonationBanner;
