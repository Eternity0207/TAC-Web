import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import {
  createGoogleReviewsFallbackData,
  getGoogleReviewsErrorMessage,
  normalizeGoogleReviewsPayload,
} from '../lib/googleReviewsUiUtils';

const useGoogleReviews = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(createGoogleReviewsFallbackData);

  useEffect(() => {
    let cancelled = false;

    const fetchReviews = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiService.reviews.getGoogle();
        if (cancelled) return;

        const payload = response?.data?.data;
        setData(normalizeGoogleReviewsPayload(payload));
      } catch {
        if (cancelled) return;
        setError(getGoogleReviewsErrorMessage());
        setData(createGoogleReviewsFallbackData());
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    error,
    data,
  };
};

export default useGoogleReviews;
