import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

const Home = () => {
  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderData, setOrderData] = useState(null); // Store complete order response
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [products, setProducts] = useState([]);

  // Order form data
  const [orderFormData, setOrderFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    quantity: 1,
  });

  const normalizeProduct = (product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const primaryVariant = variants.length ? variants[0] : null;
    return {
      id: product?.id || product?.slug,
      name: product?.name || 'Product',
      price: Number(primaryVariant?.price || 0),
      imageUrl: product?.imageUrl || '',
      description: product?.shortDescription || product?.description || '',
      weight: primaryVariant?.weight || '',
      displayOrder: Number(product?.displayOrder || 999),
    };
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiService.products.getPublic();
        const items = Array.isArray(response?.data?.data) ? response.data.data : [];
        const normalized = items
          .map(normalizeProduct)
          .filter((p) => p.id && p.name)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        setProducts(normalized);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };

    fetchProducts();
  }, []);

  // Handle order now click
  const handleOrderNow = (product) => {
    if (!product) return;
    setSelectedProduct(product);
    setShowOrderModal(true);
    setOrderSuccess(false);
    setOrderError('');
    setCouponCode('');
    setCouponError('');
    setAppliedCoupon(null);
  };

  // Handle order form changes
  const handleOrderFormChange = (e) => {
    setOrderFormData({
      ...orderFormData,
      [e.target.name]: e.target.value
    });
    setOrderError('');
  };

  const getSubtotal = () => (selectedProduct?.price * Number(orderFormData.quantity || 1)) || 0;
  const getShipping = () => (getSubtotal() >= 299 ? 0 : 40);
  const getDiscount = () => Number(appliedCoupon?.discountAmount || 0);
  const getGrandTotal = () => Math.max(0, getSubtotal() + getShipping() - getDiscount());

  const handleApplyCoupon = async () => {
    const code = String(couponCode || '').trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter coupon code');
      setAppliedCoupon(null);
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    try {
      const response = await apiService.coupons.validate({
        couponCode: code,
        subtotal: getSubtotal(),
      });
      const result = response?.data || {};
      if (result.valid) {
        setAppliedCoupon({
          code,
          discountAmount: Number(result.discountAmount || 0),
          discountType: result?.coupon?.discountType || null,
          message: result.message || 'Coupon applied',
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(result.message || 'Invalid coupon');
      }
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error?.response?.data?.message || 'Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  // Handle order submission
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderLoading(true);
    setOrderError('');

    try {
      const landingPayload = {
        name: orderFormData.customerName,
        email: orderFormData.customerEmail,
        phone: orderFormData.customerPhone,
        address: [orderFormData.addressLine1, orderFormData.addressLine2].filter(Boolean).join(', '),
        city: orderFormData.city,
        state: orderFormData.state,
        pincode: orderFormData.pincode,
        country: orderFormData.country,
        products: [{
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: orderFormData.quantity,
          totalPrice: selectedProduct.price * orderFormData.quantity,
          weight: selectedProduct.weight
        }],
        paymentMode: 'UPI_QR',
        message: '',
        couponCode: appliedCoupon?.code || '',
        discountAmount: getDiscount(),
        discountType: appliedCoupon?.discountType || null,
      };

      const response = await apiService.orders.createLanding(landingPayload);

      if (response.data.success) {
        setOrderSuccess(true);
        const normalizedOrderData = {
          order: {
            orderNumber:
              response?.data?.data?.order?.orderNumber ||
              response?.data?.data?.orderNumber ||
              response?.data?.orderNumber ||
              '',
            totalAmount:
              response?.data?.data?.order?.totalAmount ||
              response?.data?.data?.totalAmount ||
              0,
          },
          qrCode:
            response?.data?.data?.qrCode ||
            response?.data?.qrCode ||
            null,
        };
        setOrderData(normalizedOrderData);
        // Reset form
        setOrderFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
          quantity: 1,
        });
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponError('');
      }
    } catch (error) {
      console.error('Order submission error:', error);
      setOrderError(
        error.response?.data?.message ||
        'Failed to place order. Please try again.'
      );
    } finally {
      setOrderLoading(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowOrderModal(false);
    setSelectedProduct(null);
    setOrderError('');
    setOrderSuccess(false);
    setOrderData(null);
  };

  const heroImage = products[0]?.imageUrl || '';
  return (
    <>
      <Helmet>
        <title>Natural Amla Powder & Candy Jaipur | The Awla Company - 100% Pure Indian Gooseberry</title>
        <meta name="description" content="The Awla Company – freshly picked Amla processed within a day for maximum freshness & aroma. Premium natural Amla powder & candy that improves gut health, relieves bloating, and gives you healthier mornings. 100% natural, sun-dried, farm-to-pack in Jaipur." />
        <meta name="keywords" content="amla powder, natural amla powder, awla powder, amla candy, indian gooseberry powder, buy amla powder online, pure amla powder, sun dried amla" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-primary via-primary-700 to-primary-600 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center"
          style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
        ></div>

        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-20">
            {/* Hero Content */}
            <div className="text-white space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  <i className="fas fa-leaf"></i>
                  Freshly Picked
                </span>
                <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  <i className="fas fa-bolt"></i>
                  Same-Day Processed
                </span>
                <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  <i className="fas fa-check-circle"></i>
                  100% Natural
                </span>
              </div>

              <div className="inline-flex items-center gap-3 bg-accent text-white px-5 py-3 rounded-2xl shadow-lg ring-4 ring-accent-200/50">
                <span className="text-xs uppercase tracking-wider font-bold">Limited Offer</span>
                <span className="text-lg font-extrabold">15% OFF</span>
                <span className="text-sm font-medium">First 50 Customers · Use FIRST50</span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                The Awla Company<br />
                <span className="text-accent-400">Royal Way to Stay Healthy</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-100 leading-relaxed">
                India's purest Amla products processed <strong>within a day of harvest</strong> for an irresistible fresh aroma.
                Boost your <strong>gut health</strong>, beat <strong>bloating</strong>, and start <strong>healthier mornings</strong>.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <a href="#products" className="btn-secondary text-lg px-8">
                  Shop Now
                </a>
                <a href="#products" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary font-semibold py-3 px-8 rounded-lg transition-all duration-300">
                  Explore Products
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6 pt-6 text-sm">
                <span className="flex items-center gap-2">
                  <i className="fas fa-truck"></i>
                  Free Delivery Above ₹299
                </span>
                <span className="flex items-center gap-2">
                  <i className="fas fa-star"></i>
                  4.8+ Rating
                </span>
                <span className="flex items-center gap-2">
                  <i className="fas fa-map-marker-alt"></i>
                  Ships All India
                </span>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="relative">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt="Awla Product"
                    className="w-full max-w-md mx-auto rounded-3xl shadow-2xl"
                  />
                ) : (
                  <div className="w-full max-w-md mx-auto rounded-3xl shadow-2xl bg-white/10 h-[420px]" />
                )}
                <div className="absolute -bottom-4 -right-4 bg-white text-primary rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-xl">
                  <span className="text-3xl font-bold">100%</span>
                  <span className="text-xs">Natural</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="section-padding bg-white" id="products">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Our Products</span>
            <h2 className="heading-secondary mt-4 mb-6">
              Premium <span className="text-gradient">Awla Products</span>
            </h2>
            <p className="text-gray-600 text-lg">
              Freshly picked and processed within a day — our Amla products improve gut health,
              relieve bloating, and give you healthier mornings
            </p>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <div className="relative overflow-hidden h-80 bg-gray-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    />
                  ) : null}
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">₹{product.price}</span>
                    <button
                      onClick={() => handleOrderNow(product)}
                      className="btn-primary"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Free Delivery Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-accent-50 text-accent-700 px-6 py-3 rounded-full font-semibold">
              <i className="fas fa-truck text-xl"></i>
              Free Delivery on Orders Above ₹299 · Ships All India
            </div>
          </div>
        </div>
      </section>

      {/* Bulk Enquiry CTA */}
      <section className="section-padding bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="container-custom text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">B2B & Wholesale</span>
          <h2 className="heading-secondary mt-4 mb-6">
            Looking for <span className="text-gradient">Bulk Orders</span>?
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            Get special wholesale pricing for retailers, distributors, and businesses. Custom packaging available.
          </p>
          <a href="/bulk-enquiry" className="btn-primary text-lg px-12">
            Send Bulk Enquiry
          </a>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="heading-secondary mb-6">
              Why Choose <span className="text-gradient">The Awla Company</span>?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-leaf text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">100% Natural</h3>
              <p className="text-gray-600">
                Pure, sun-dried Amla with no preservatives or artificial colors
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-accent-50 to-white hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-bolt text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fresh Processing</h3>
              <p className="text-gray-600">
                Processed within a day of harvest for maximum freshness and aroma
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-heart text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Health Benefits</h3>
              <p className="text-gray-600">
                Improves gut health, relieves bloating, and boosts immunity
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order: {selectedProduct?.name}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Success Message */}
              {orderSuccess && orderData && (
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-xl font-bold text-green-700">Order Placed Successfully!</h3>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Order Number: <span className="font-bold text-gray-800">{orderData.order?.orderNumber}</span></p>
                        <p className="text-sm text-gray-600">Total Amount: <span className="font-bold text-gray-800">₹{orderData.order?.totalAmount}</span></p>
                      </div>

                      {/* QR Code Display */}
                      {orderData.qrCode && (
                        <div className="bg-white p-4 rounded-lg border-2 border-green-200 inline-block">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Scan to Pay:</p>
                          <img
                            src={orderData.qrCode}
                            alt="Payment QR Code"
                            className="w-48 h-48 mx-auto"
                          />
                          <p className="text-xs text-gray-500 mt-2">Scan with any UPI app to complete payment</p>
                        </div>
                      )}

                      {/* Alternative payment info */}
                      {!orderData.qrCode && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-700">Payment instructions have been sent to your email.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {orderError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                  {orderError}
                </div>
              )}

              {!orderSuccess && (
                <form onSubmit={handleOrderSubmit} className="space-y-6">
                  {/* Product Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={selectedProduct?.imageUrl}
                        alt={selectedProduct?.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{selectedProduct?.name}</h3>
                        <p className="text-sm text-gray-600">{selectedProduct?.description}</p>
                        <p className="text-lg font-bold text-primary">₹{selectedProduct?.price}</p>
                      </div>
                      <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                          Qty
                        </label>
                        <select
                          id="quantity"
                          name="quantity"
                          value={orderFormData.quantity}
                          onChange={handleOrderFormChange}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        value={orderFormData.customerName}
                        onChange={handleOrderFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="customerEmail"
                        name="customerEmail"
                        value={orderFormData.customerEmail}
                        onChange={handleOrderFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        id="customerPhone"
                        name="customerPhone"
                        value={orderFormData.customerPhone}
                        onChange={handleOrderFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        value={orderFormData.pincode}
                        onChange={handleOrderFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      id="addressLine1"
                      name="addressLine1"
                      value={orderFormData.addressLine1}
                      onChange={handleOrderFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      id="addressLine2"
                      name="addressLine2"
                      value={orderFormData.addressLine2}
                      onChange={handleOrderFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={orderFormData.city}
                        onChange={handleOrderFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={orderFormData.state}
                        onChange={handleOrderFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Order Summary</h4>

                    <div className="mb-3 rounded-lg border border-accent-200 bg-accent-50 p-3">
                      <p className="text-xs font-semibold text-accent-700 mb-2">Apply Coupon</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          placeholder="Try FIRST50 or SACHIN10"
                          className="flex-1 px-3 py-2 border border-accent-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading}
                          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                          {couponLoading ? 'Checking...' : 'Apply'}
                        </button>
                      </div>
                      {appliedCoupon ? (
                        <p className="text-xs text-green-700 mt-2 font-medium">
                          Coupon {appliedCoupon.code} applied. You saved Rs {getDiscount()}.
                        </p>
                      ) : null}
                      {couponError ? (
                        <p className="text-xs text-red-600 mt-2">{couponError}</p>
                      ) : null}
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({orderFormData.quantity} × ₹{selectedProduct?.price})</span>
                      <span>₹{getSubtotal()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping</span>
                      <span>
                        {getShipping() === 0 ? 'FREE' : '₹40'}
                      </span>
                    </div>
                    {getDiscount() > 0 ? (
                      <div className="flex justify-between text-sm text-green-700">
                        <span>Coupon Discount ({appliedCoupon?.code})</span>
                        <span>-₹{getDiscount()}</span>
                      </div>
                    ) : null}
                    <hr className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>₹{getGrandTotal()}</span>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={orderLoading}
                      className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {orderLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Place Order'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {orderSuccess && (
                <div className="flex justify-center">
                  <button
                    onClick={closeModal}
                    className="btn-primary px-8"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
