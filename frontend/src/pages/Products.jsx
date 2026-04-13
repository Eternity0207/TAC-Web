import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiService.products.getPublic();
        const data = Array.isArray(response?.data?.data) ? response.data.data : [];
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    fetchProducts();
  }, []);

  return (
    <>
      <Helmet>
        <title>Our Products | The Awla Company</title>
        <meta name="description" content="Browse our premium range of natural Amla products including sun-dried powder and delicious candy." />
      </Helmet>

      <div className="section-padding">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="heading-primary mb-6">Our Products</h1>
            <p className="text-gray-600 text-lg">
              Explore our premium range of natural Amla products
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {products.map((product) => {
              const variants = Array.isArray(product?.variants) ? product.variants : [];
              const price = variants[0]?.price || 0;
              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="h-72 bg-gray-100">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                    <p className="text-gray-600 mb-4">{product.shortDescription || product.description}</p>
                    <div className="text-2xl font-bold text-primary">₹{price}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Products;
