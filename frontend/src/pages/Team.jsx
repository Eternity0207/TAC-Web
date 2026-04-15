import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const Team = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [brokenImages, setBrokenImages] = useState({});

  const normalizeImageUrl = (url) => {
    if (!url) return '';
    // Backward-compatibility: old Supabase project host was replaced.
    return String(url).replace('fykvfmdkzvjitwafmlop.supabase.co', 'vamybrxldvxhfcklklds.supabase.co');
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await apiService.staff.getAll();
        if (response.data.success) {
          setStaff(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        setError('Failed to load team members');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Our Team | The Awla Company</title>
          <meta name="description" content="Meet the team behind The Awla Company." />
        </Helmet>

        <div className="section-padding">
          <div className="container-custom">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h1 className="heading-primary mb-4">Our Team</h1>
              <p className="text-gray-600">Loading team members...</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="w-36 h-36 rounded-full bg-gray-200 mx-auto mb-6" />
                  <div className="h-5 w-2/3 rounded bg-gray-200 mx-auto mb-3" />
                  <div className="h-4 w-1/3 rounded bg-gray-200 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const getDisplayPriority = (member) => {
    const email = String(member?.email || '').toLowerCase();
    const name = String(member?.name || '').toLowerCase();
    const designation = String(member?.designation || '').toLowerCase();
    const role = String(member?.role || '').toUpperCase();

    if (
      email === 'admin@theawlacompany.com' ||
      designation.includes('founder') ||
      name.includes('kuldeep')
    ) {
      return 0; // Kuldeep first
    }
    if (email === 'ramsachingurjar1102@gmail.com') return 1; // Sachin second
    if (role === 'INTERN') return 3; // Interns at the end
    return 2;
  };

  const sortedStaff = [...staff].sort((a, b) => {
    const priorityDiff = getDisplayPriority(a) - getDisplayPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });

  // Intern profiles are temporarily hidden on the Team page.
  const visibleStaff = sortedStaff.filter(
    (member) => String(member?.role || '').toUpperCase() !== 'INTERN'
  );

  return (
    <>
      <Helmet>
        <title>Our Team | The Awla Company</title>
        <meta name="description" content="Meet the team behind The Awla Company." />
      </Helmet>

      <div className="section-padding">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="heading-primary mb-6">Our Team</h1>
            <p className="text-gray-600 text-lg">
              Meet the passionate people behind The Awla Company who work tirelessly to bring you the finest Amla products
            </p>
          </div>

          {error && (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg inline-block">
                {error}
              </div>
            </div>
          )}

          {visibleStaff.length === 0 && !error ? (
            <div className="text-center">
              <p className="text-gray-600 text-lg">No team members found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleStaff.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Avatar */}
                  {member.profileImageUrl && !brokenImages[member.id] ? (
                    <div className="w-36 h-36 rounded-full bg-gray-50 mx-auto mb-6 border-2 border-primary-100 overflow-hidden">
                      <img
                        src={normalizeImageUrl(member.profileImageUrl)}
                        alt={member.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-center"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [member.id]: true }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-2xl font-bold text-white">
                        {(member.name || 'T').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {member.name}
                  </h3>

                  {/* Role Badge */}
                  <span className="inline-block bg-accent-100 text-accent-700 px-3 py-1 rounded-full text-sm font-medium">
                    {member.designation || member.role || 'Team Member'}
                  </span>

                  {member.bio ? (
                    <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                      {member.bio}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Company Values Section */}
          <div className="mt-20">
            <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-3xl p-12 text-center">
              <h2 className="heading-secondary mb-8">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-heart text-white text-xl"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Quality First</h3>
                  <p className="text-gray-600">
                    We prioritize the highest quality in every product we create
                  </p>
                </div>

                <div>
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-users text-white text-xl"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Customer Focus</h3>
                  <p className="text-gray-600">
                    Your health and satisfaction drive everything we do
                  </p>
                </div>

                <div>
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-leaf text-white text-xl"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Natural Approach</h3>
                  <p className="text-gray-600">
                    100% natural processes with no artificial additives
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Team;
