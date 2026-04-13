import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Products from './pages/Products';
import Blog from './pages/Blog';
import Team from './pages/Team';
import Careers from './pages/Careers';
import BulkEnquiry from './pages/BulkEnquiry';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/team" element={<Team />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/bulk-enquiry" element={<BulkEnquiry />} />
          </Routes>
        </MainLayout>
      </Router>
    </HelmetProvider>
  );
}

export default App;
