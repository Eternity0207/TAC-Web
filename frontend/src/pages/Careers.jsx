import { Helmet } from 'react-helmet-async';

const Careers = () => {
  return (
    <>
      <Helmet>
        <title>Careers | The Awla Company</title>
        <meta name="description" content="Join our team at The Awla Company." />
      </Helmet>

      <div className="section-padding">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="heading-primary mb-6">Careers</h1>
            <p className="text-gray-600 text-lg">
              Join us in our mission to bring natural health to everyone
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Careers;
