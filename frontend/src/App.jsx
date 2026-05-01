import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { CartProvider } from './context/CartContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import BlogAdmin from './pages/BlogAdmin';
import Team from './pages/Team';
import Careers from './pages/Careers';
import BulkEnquiry from './pages/BulkEnquiry';
import GlobalLoader from './components/GlobalLoader';
import Donation from './pages/Donation';

function App() {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLoader(false);
    }, 1300);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <HelmetProvider>
      <CartProvider>
        <GlobalLoader isVisible={showLoader} />
        <Router>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/blog-admin" element={<BlogAdmin />} />
              <Route path="/team" element={<Team />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/donation" element={<Donation />} />
              <Route path="/bulk-enquiry" element={<BulkEnquiry />} />
            </Routes>
          </MainLayout>
        </Router>
      </CartProvider>
    </HelmetProvider>
  );
}

export default App;
