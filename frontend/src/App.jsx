import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Blog from './pages/Blog';
import Team from './pages/Team';
import Careers from './pages/Careers';
import BulkEnquiry from './pages/BulkEnquiry';
import GlobalLoader from './components/GlobalLoader';

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
      <GlobalLoader isVisible={showLoader} />
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/team" element={<Team />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/bulk-enquiry" element={<BulkEnquiry />} />
            <Route path="/bulk-inquiry" element={<BulkEnquiry />} />
          </Routes>
        </MainLayout>
      </Router>
    </HelmetProvider>
  );
}

export default App;
