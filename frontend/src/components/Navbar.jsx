import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleOrderNow = () => {
    if (location.pathname === '/') {
      // If on home page, scroll to products section
      const productsSection = document.getElementById('products');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to home page with products section
      navigate('/#products');
    }
    closeMenu();
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'Blog', path: '/blog' },
    { name: 'Team', path: '/team' },
    { name: 'Careers', path: '/careers' },
    { name: 'Bulk Enquiry', path: '/bulk-enquiry' },
  ];

  const useGlassStyle = location.pathname === '/' && !isScrolled;
  const headerClass = useGlassStyle
    ? 'bg-white/70 backdrop-blur-md shadow-sm'
    : 'bg-white/95 backdrop-blur-lg shadow-md';

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 ease-in-out ${headerClass}`}>
      <nav className="container-custom">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="The Awla Company Logo"
              className="h-12 w-12 object-contain"
            />
            <span className="font-display text-xl font-bold text-primary hidden sm:block">
              The Awla Company
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`font-medium transition-colors duration-300 ${
                    isActive(link.path)
                      ? 'nav-link text-primary'
                      : 'nav-link text-gray-700 hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
            <li>
              <button className="btn-primary" onClick={handleOrderNow}>
                Order Now
              </button>
            </li>
          </ul>

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMenu}
            className="lg:hidden flex flex-col gap-1.5 w-8 h-8 justify-center items-center"
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-6 bg-primary transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block h-0.5 w-6 bg-primary transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block h-0.5 w-6 bg-primary transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-2xl transform transition-transform duration-300 ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex justify-end p-4">
            <button
              onClick={closeMenu}
              className="text-3xl text-gray-700 hover:text-primary transition-colors"
              aria-label="Close menu"
            >
              &times;
            </button>
          </div>
          <ul className="flex flex-col gap-6 px-8 py-4">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  onClick={closeMenu}
                  className={`font-medium text-lg transition-colors duration-300 ${
                    isActive(link.path)
                      ? 'text-primary'
                      : 'text-gray-700 hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
            <li className="mt-4">
              <button className="btn-primary w-full" onClick={handleOrderNow}>
                Order Now
              </button>
            </li>
          </ul>
        </div>

        {/* Backdrop for mobile menu */}
        {isMenuOpen && (
          <div
            onClick={closeMenu}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50"
            style={{ zIndex: -1 }}
          ></div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
