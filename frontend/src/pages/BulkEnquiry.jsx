import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { apiService } from '../services/api';

const BulkEnquiry = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedPhone = String(formData.phone || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        contactPerson: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: normalizedPhone,
        company: formData.company.trim(),
        businessName: formData.company.trim(),
        message: formData.message.trim(),
      };

      const response = await apiService.enquiry.bulk(payload);

      if (response.data.success) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          message: '',
        });
      }
    } catch (error) {
      console.error('Bulk enquiry submission error:', error);
      const fieldErrors = error?.response?.data?.errors;
      const firstFieldError = Array.isArray(fieldErrors) ? fieldErrors[0]?.message : '';
      setError(
        firstFieldError ||
        error.response?.data?.message ||
        'Failed to submit enquiry. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Success message component
  if (submitted) {
    return (
      <>
        <Helmet>
          <title>Thank You! | The Awla Company</title>
        </Helmet>

        <div className="section-padding bg-gradient-to-b from-primary-50 to-white">
          <div className="container-custom max-w-4xl">
            <div className="text-center bg-white border border-primary-100 shadow-xl rounded-3xl p-10 md:p-14">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 shadow-md">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="heading-primary mb-6 text-green-600">Thank You!</h1>
              <p className="text-lg text-gray-600 mb-8">
                Your bulk enquiry has been submitted successfully. Our team will contact you within 24 hours with pricing and availability.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-primary"
              >
                Submit Another Enquiry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Bulk Enquiry | The Awla Company</title>
        <meta name="description" content="Get special wholesale pricing for bulk orders." />
      </Helmet>

      <div className="section-padding bg-gradient-to-b from-primary-50 via-white to-accent-50/30">
        <div className="container-custom max-w-6xl">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-semibold text-primary mb-5">
              Wholesale Desk
            </span>
            <h1 className="heading-primary mb-6">Bulk Enquiry</h1>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Get special wholesale pricing for retailers, distributors, and businesses.
              Share your requirement and get a callback from our bulk team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <form onSubmit={handleSubmit} className="lg:col-span-8 bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-primary-100">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Tell us your approximate quantity, products, and expected delivery location..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full md:w-auto px-12 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Enquiry'
                )}
              </button>
            </form>

            <aside className="lg:col-span-4 space-y-5">
              <div className="bg-white border border-primary-100 rounded-2xl shadow-lg p-6">
                <h3 className="font-display text-2xl text-primary mb-3">Why Bulk With Us?</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>Direct wholesale pricing with transparent slabs</li>
                  <li>Assistance for retailers and distributors</li>
                  <li>Fast support on stock and dispatch timelines</li>
                </ul>
              </div>

              <div className="bg-primary text-white rounded-2xl shadow-lg p-6">
                <h3 className="font-display text-2xl mb-3">Need Quick Help?</h3>
                <p className="text-primary-100 text-sm mb-4">
                  Talk to our team for urgent requirements.
                </p>
                <a href="tel:+919664161773" className="inline-flex items-center justify-center w-full rounded-xl bg-white text-primary font-semibold py-2.5 px-4 hover:bg-primary-50 transition-colors">
                  +91 96641 61773
                </a>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h4 className="font-semibold text-gray-900 mb-2">Typical Response Time</h4>
                <p className="text-sm text-gray-600">Within 24 hours on business days.</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkEnquiry;
