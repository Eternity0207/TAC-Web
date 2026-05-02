import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Footer = () => {
  return (
    <footer className="bg-primary-900 text-white">
      <div className="container-custom py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="The Awla Company" className="h-11 w-11 object-contain" />
              <div>
                <h3 className="font-display text-lg font-bold">The Awla Company</h3>
                <p className="text-xs text-gray-400">Royal Way to Stay Healthy</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              India's purest Amla products — freshly picked, processed within a day. 100% natural, no additives.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { name: 'Home', path: '/' },
                { name: 'Products', path: '/products' },
                { name: 'Team', path: '/team' },
                { name: 'Blog', path: '/blog' },
                { name: 'Careers', path: '/careers' },
                { name: 'Bulk Enquiry', path: '/bulk-enquiry' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-gray-300 transition-colors hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Contact</h4>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <i className="fas fa-map-marker-alt mt-0.5 text-accent-400" />
                <span>Jaipur, Rajasthan, India</span>
              </div>
              <div className="flex items-start gap-3">
                <i className="fas fa-phone-alt mt-0.5 text-accent-400" />
                <a href="tel:+919664161773" className="hover:text-white transition-colors">+91 96641 61773</a>
              </div>
              <div className="flex items-start gap-3">
                <i className="fas fa-envelope mt-0.5 text-accent-400" />
                <a href="mailto:support@theawlacompany.com" className="hover:text-white transition-colors">support@theawlacompany.com</a>
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Follow Us</h4>
            <div className="flex gap-3">
              {[
                { href: 'https://www.linkedin.com/company/the-awla-company/', icon: 'fab fa-linkedin-in', label: 'LinkedIn' },
                { href: 'https://www.facebook.com/people/The-Awla-Company/61586226441354/', icon: 'fab fa-facebook-f', label: 'Facebook' },
                { href: 'https://www.instagram.com/theawlacompany', icon: 'fab fa-instagram', label: 'Instagram' },
                { href: 'https://wa.me/919664161773', icon: 'fab fa-whatsapp', label: 'WhatsApp' },
              ].map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm transition-all hover:bg-accent hover:text-white hover:shadow-glow-accent"
                  aria-label={social.label}
                >
                  <i className={social.icon} />
                </a>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                <i className="fas fa-leaf text-green-400" /> 100% Natural
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                <i className="fas fa-truck text-accent-300" /> All India Shipping
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; 2026 The Awla Company. All Rights Reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <span className="text-gray-700">|</span>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
