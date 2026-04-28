import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { normalizeVideoUrl } from '../lib/reviewUtils';
import { GOOGLE_WRITE_REVIEW_URL } from '../lib/googleReviewConfig';

const MAX_PHOTOS = 3;
const MAX_PHOTO_SIZE_MB = 2;

const INITIAL_FORM = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  city: '',
  productName: '',
  orderNumber: '',
  rating: 5,
  reviewText: '',
  videoUrl: '',
};

const INITIAL_VERIFICATION = {
  state: 'idle',
  message: '',
  data: null,
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const normalizeProductName = (value, fallback) => {
  const direct = String(value || '').trim();
  if (direct) return direct;

  const fromProp = String(fallback || '').trim();
  if (fromProp) return fromProp;

  return 'Both Products';
};

const ReviewSubmissionForm = ({ productName = '', onSubmitted }) => {
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, productName }));
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingPurchase, setVerifyingPurchase] = useState(false);
  const [purchaseVerification, setPurchaseVerification] = useState(INITIAL_VERIFICATION);
  const [status, setStatus] = useState({ kind: 'idle', message: '' });
  const [lastSubmittedReviewText, setLastSubmittedReviewText] = useState('');
  const [googleShareHint, setGoogleShareHint] = useState('');

  useEffect(() => {
    setForm((prev) => ({ ...prev, productName: productName || prev.productName }));
  }, [productName]);

  const selectedPhotoNames = useMemo(() => {
    return photos.map((file) => file.name).join(', ');
  }, [photos]);

  const isProductLocked = Boolean(String(productName || '').trim());

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (['productName', 'orderNumber', 'customerPhone', 'customerEmail'].includes(name)) {
      setPurchaseVerification(INITIAL_VERIFICATION);
    }
  };

  const onPhotoChange = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      setPhotos([]);
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      setStatus({ kind: 'error', message: 'Only image files are allowed for review photos.' });
      return;
    }

    const oversized = imageFiles.find((file) => file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setStatus({ kind: 'error', message: `Each photo must be under ${MAX_PHOTO_SIZE_MB}MB.` });
      return;
    }

    setPhotos(imageFiles.slice(0, MAX_PHOTOS));
    if (imageFiles.length > MAX_PHOTOS) {
      setStatus({ kind: 'error', message: `Only first ${MAX_PHOTOS} photos were selected.` });
      return;
    }

    setStatus({ kind: 'idle', message: '' });
  };

  const verifyPurchase = async () => {
    if (verifyingPurchase) return;

    const orderNumber = String(form.orderNumber || '').trim();
    if (!orderNumber) {
      setPurchaseVerification({
        state: 'failed',
        message: 'Please enter your order number to verify purchase.',
        data: null,
      });
      return;
    }

    setVerifyingPurchase(true);
    setPurchaseVerification(INITIAL_VERIFICATION);

    try {
      const payload = {
        orderNumber,
        customerPhone: String(form.customerPhone || '').trim(),
        customerEmail: String(form.customerEmail || '').trim(),
        productName: normalizeProductName(form.productName, productName),
      };

      const response = await apiService.reviews.verifyPurchase(payload);
      const data = response?.data?.data || {};

      if (!data?.verified) {
        setPurchaseVerification({
          state: 'failed',
          message: data?.reason || 'Could not verify this order. Please check your details.',
          data: null,
        });
        return;
      }

      setPurchaseVerification({
        state: 'verified',
        message: `Verified purchase: ${data.orderNumber}`,
        data,
      });

      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || String(data.customerName || ''),
        customerEmail: prev.customerEmail || String(data.customerEmail || ''),
        customerPhone: prev.customerPhone || String(data.customerPhone || ''),
        city: prev.city || String(data.city || ''),
      }));
    } catch (error) {
      setPurchaseVerification({
        state: 'failed',
        message:
          error?.response?.data?.message ||
          error?.message ||
          'Purchase verification failed. Please try again.',
        data: null,
      });
    } finally {
      setVerifyingPurchase(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const customerName = String(form.customerName || '').trim();
    const customerEmail = String(form.customerEmail || '').trim();
    const customerPhone = String(form.customerPhone || '').trim();
    const city = String(form.city || '').trim();
    const product = normalizeProductName(form.productName, productName);
    const orderNumber = String(form.orderNumber || '').trim().toUpperCase();
    const reviewText = String(form.reviewText || '').trim();
    const rating = Number(form.rating || 0);
    const videoUrl = normalizeVideoUrl(form.videoUrl);

    if (!customerName || !reviewText || !rating) {
      setStatus({ kind: 'error', message: 'Name, rating and review text are required.' });
      return;
    }

    if (String(form.videoUrl || '').trim() && !videoUrl) {
      setStatus({ kind: 'error', message: 'Please enter a valid public video URL.' });
      return;
    }

    if (orderNumber && purchaseVerification.state !== 'verified') {
      setStatus({
        kind: 'error',
        message: 'Please verify your order number before submitting a verified purchase review.',
      });
      return;
    }

    setSubmitting(true);
    setStatus({ kind: 'idle', message: '' });

    try {
      const photoPayload = await Promise.all(
        photos.map(async (file) => {
          const dataUrl = await fileToBase64(file);
          const base64 = String(dataUrl).split(',')[1] || '';
          return {
            base64,
            mimeType: file.type || 'image/jpeg',
          };
        })
      );

      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        city,
        productName: product,
        orderNumber,
        purchaseVerified: purchaseVerification.state === 'verified',
        verifiedOrderNumber:
          purchaseVerification.state === 'verified'
            ? String(purchaseVerification.data?.orderNumber || orderNumber)
            : '',
        rating,
        reviewText,
        videoUrl,
        photos: photoPayload,
      };

      const response = await apiService.reviews.create(payload);
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Unable to submit review right now.');
      }

      setLastSubmittedReviewText(reviewText);
      setGoogleShareHint('');
      setForm({ ...INITIAL_FORM, productName });
      setPhotos([]);
      setPurchaseVerification(INITIAL_VERIFICATION);
      setStatus({
        kind: 'success',
        message: 'Thank you. Your review is submitted and will be visible after approval.',
      });

      if (typeof onSubmitted === 'function') {
        await onSubmitted();
      }
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error?.response?.data?.message ||
          error?.message ||
          'We could not submit your review. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const shareReviewOnGoogle = async () => {
    const reviewText = String(lastSubmittedReviewText || '').trim();

    try {
      if (reviewText && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(reviewText);
        setGoogleShareHint('Your review text is copied. Paste it on Google review page.');
      } else {
        setGoogleShareHint('Opening Google review page.');
      }
    } catch {
      setGoogleShareHint('Opening Google review page. You can write the same feedback there.');
    }

    window.open(GOOGLE_WRITE_REVIEW_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Share Your Review</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add written feedback and optional video link so other customers can decide confidently.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Name *</span>
            <input
              required
              type="text"
              name="customerName"
              value={form.customerName}
              onChange={onFieldChange}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-primary"
              placeholder="Your name"
            />
          </label>

          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Email (optional)</span>
            <input
              type="email"
              name="customerEmail"
              value={form.customerEmail}
              onChange={onFieldChange}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-primary"
              placeholder="you@example.com"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Phone (optional)</span>
            <input
              type="tel"
              name="customerPhone"
              value={form.customerPhone}
              onChange={onFieldChange}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-primary"
              placeholder="Your number"
            />
          </label>

          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">City (optional)</span>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={onFieldChange}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-primary"
              placeholder="Your city"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Product *</span>
            <input
              required
              type="text"
              name="productName"
              value={form.productName}
              onChange={onFieldChange}
              readOnly={isProductLocked}
              className={`w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition ${
                isProductLocked ? 'bg-gray-50 text-gray-600' : 'focus:border-primary'
              }`}
              placeholder="Product name"
            />
          </label>

          <div className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Order Number (optional)</span>
            <div className="flex gap-2">
              <input
                type="text"
                name="orderNumber"
                value={form.orderNumber}
                onChange={onFieldChange}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-primary"
                placeholder="ORD202600001"
              />
              <button
                type="button"
                onClick={verifyPurchase}
                disabled={verifyingPurchase || !String(form.orderNumber || '').trim()}
                className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-semibold text-white transition ${
                  verifyingPurchase || !String(form.orderNumber || '').trim()
                    ? 'bg-gray-400'
                    : 'bg-primary hover:bg-primary-800'
                }`}
              >
                {verifyingPurchase ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>

        {purchaseVerification.state === 'verified' ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {purchaseVerification.message}
          </p>
        ) : null}

        {purchaseVerification.state === 'failed' ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {purchaseVerification.message}
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Rating *</p>
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              const active = value <= Number(form.rating || 0);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, rating: value }))}
                  className={`h-9 w-9 rounded-lg border text-lg transition ${
                    active
                      ? 'border-amber-200 bg-amber-50 text-amber-400'
                      : 'border-gray-200 bg-white text-gray-300 hover:border-gray-300'
                  }`}
                  aria-label={`Set rating ${value}`}
                >
                  ★
                </button>
              );
            })}
          </div>
        </div>

        <label className="block text-sm text-gray-700">
          <span className="mb-1 block font-medium">Written Review *</span>
          <textarea
            required
            name="reviewText"
            rows={4}
            value={form.reviewText}
            onChange={onFieldChange}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-primary"
            placeholder="Tell us what you liked, taste, quality, and results"
          />
        </label>

        <label className="block text-sm text-gray-700">
          <span className="mb-1 block font-medium">Video Review URL (optional)</span>
          <input
            type="url"
            name="videoUrl"
            value={form.videoUrl}
            onChange={onFieldChange}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none transition focus:border-primary"
            placeholder="YouTube / Google Drive / direct video link"
          />
        </label>

        <label className="block text-sm text-gray-700">
          <span className="mb-1 block font-medium">Photos (optional, up to 3)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPhotoChange}
            className="block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
          />
          {selectedPhotoNames ? (
            <p className="mt-1 text-xs text-gray-500">Selected: {selectedPhotoNames}</p>
          ) : null}
        </label>

        {status.kind === 'error' ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{status.message}</p>
        ) : null}

        {status.kind === 'success' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
            <p>{status.message}</p>
            <p className="mt-2 text-xs text-emerald-800/90">
              This review is saved to our website review system. Google reviews can only be posted by you on Google.
            </p>
            <button
              type="button"
              onClick={shareReviewOnGoogle}
              className="mt-3 inline-flex items-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
            >
              Post Same Review on Google
            </button>
            {googleShareHint ? (
              <p className="mt-2 text-xs text-emerald-800">{googleShareHint}</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full rounded-full px-5 py-3 text-sm font-semibold text-white transition ${
            submitting ? 'bg-gray-400' : 'bg-primary hover:bg-primary-800'
          }`}
        >
          {submitting ? 'Submitting Review...' : 'Submit Review'}
        </button>
      </form>
    </section>
  );
};

export default ReviewSubmissionForm;
