import { Helmet } from 'react-helmet-async';

const Blog = () => {
  return (
    <>
      <Helmet>
        <title>Blog | The Awla Company</title>
        <meta name="description" content="Learn about the health benefits of Amla and natural wellness tips." />
      </Helmet>

      <div className="section-padding">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="heading-primary mb-6">Blog</h1>
            <p className="text-gray-600 text-lg">
              Discover health tips and the amazing benefits of Amla
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Blog;
