import axios from 'axios';
import { config } from '../config';

const GOOGLE_PLACE_DETAILS_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json';
const GOOGLE_REVIEW_LIMIT = 5;
const DEFAULT_CACHE_TTL_SECONDS = 10800;
const VALID_SORT_OPTIONS = new Set(['most_relevant', 'newest']);

type GooglePlaceReview = {
    author_name?: string;
    author_url?: string;
    profile_photo_url?: string;
    rating?: number;
    relative_time_description?: string;
    text?: string;
    time?: number;
    translated?: boolean;
    language?: string;
    original_language?: string;
};

type GooglePlaceDetailsResult = {
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: GooglePlaceReview[];
    url?: string;
};

type GooglePlaceDetailsResponse = {
    status?: string;
    error_message?: string;
    html_attributions?: string[];
    result?: GooglePlaceDetailsResult;
};

export type BusinessGoogleReview = {
    authorName: string;
    authorUrl: string;
    profilePhotoUrl: string;
    rating: number;
    relativeTimeDescription: string;
    text: string;
    time: number;
    translated: boolean;
    language: string;
    originalLanguage: string;
};

export type GoogleReviewsPayload = {
    placeId: string;
    businessName: string;
    rating: number;
    userRatingsTotal: number;
    reviewsSort: 'most_relevant' | 'newest';
    reviews: BusinessGoogleReview[];
    writeReviewUrl: string;
    googleMapsUrl: string;
    htmlAttributions: string[];
    fetchedAt: string;
};

type GoogleReviewsResponse = {
    data: GoogleReviewsPayload;
    meta: {
        fromCache: boolean;
        isStale: boolean;
        cacheTtlSeconds: number;
    };
};

type CacheEntry = {
    cacheKey: string;
    expiresAt: number;
    payload: GoogleReviewsPayload;
};

let googleReviewsCache: CacheEntry | null = null;

function normalizeSort(value: string): 'most_relevant' | 'newest' {
    const normalized = String(value || '').trim().toLowerCase();
    if (VALID_SORT_OPTIONS.has(normalized)) {
        return normalized as 'most_relevant' | 'newest';
    }
    return 'newest';
}

function buildCacheKey(placeId: string, language: string, sort: 'most_relevant' | 'newest') {
    return `${placeId}::${language}::${sort}`;
}

function mapGoogleReview(review: GooglePlaceReview): BusinessGoogleReview {
    return {
        authorName: String(review?.author_name || 'Google User'),
        authorUrl: String(review?.author_url || ''),
        profilePhotoUrl: String(review?.profile_photo_url || ''),
        rating: Number(review?.rating || 0),
        relativeTimeDescription: String(review?.relative_time_description || ''),
        text: String(review?.text || ''),
        time: Number(review?.time || 0),
        translated: Boolean(review?.translated),
        language: String(review?.language || ''),
        originalLanguage: String(review?.original_language || ''),
    };
}

export async function getGoogleReviews(forceRefresh = false): Promise<GoogleReviewsResponse> {
    const apiKey = String(config.googleReviews.apiKey || '').trim();
    const placeId = String(config.googleReviews.placeId || '').trim();
    const language = String(config.googleReviews.language || 'en').trim() || 'en';
    const sort = normalizeSort(config.googleReviews.reviewsSort);
    const cacheTtlSeconds = Math.max(300, Number(config.googleReviews.cacheTtlSeconds || DEFAULT_CACHE_TTL_SECONDS));
    const cacheKey = buildCacheKey(placeId, language, sort);

    if (!apiKey) {
        throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    if (!placeId) {
        throw new Error('GOOGLE_REVIEWS_PLACE_ID is not configured');
    }

    const now = Date.now();
    if (!forceRefresh && googleReviewsCache && googleReviewsCache.cacheKey === cacheKey && googleReviewsCache.expiresAt > now) {
        return {
            data: googleReviewsCache.payload,
            meta: {
                fromCache: true,
                isStale: false,
                cacheTtlSeconds,
            },
        };
    }

    try {
        const response = await axios.get<GooglePlaceDetailsResponse>(GOOGLE_PLACE_DETAILS_ENDPOINT, {
            params: {
                place_id: placeId,
                fields: 'name,rating,user_ratings_total,reviews,url',
                reviews_sort: sort,
                language,
                key: apiKey,
            },
            timeout: 10000,
        });

        const payload = response.data || {};
        const status = String(payload.status || '').toUpperCase();
        if (status !== 'OK') {
            const googleErrorMessage = String(payload.error_message || status || 'Unknown Google Places API error');
            throw new Error(googleErrorMessage);
        }

        const result = payload.result || {};
        const fetchedAt = new Date().toISOString();
        const reviews = Array.isArray(result.reviews)
            ? result.reviews.slice(0, GOOGLE_REVIEW_LIMIT).map(mapGoogleReview)
            : [];

        const output: GoogleReviewsPayload = {
            placeId,
            businessName: String(result.name || 'The Awla Company'),
            rating: Number(result.rating || 0),
            userRatingsTotal: Number(result.user_ratings_total || 0),
            reviewsSort: sort,
            reviews,
            writeReviewUrl: String(config.googleReviews.writeReviewUrl || ''),
            googleMapsUrl: String(result.url || ''),
            htmlAttributions: Array.isArray(payload.html_attributions) ? payload.html_attributions : [],
            fetchedAt,
        };

        googleReviewsCache = {
            cacheKey,
            expiresAt: now + cacheTtlSeconds * 1000,
            payload: output,
        };

        return {
            data: output,
            meta: {
                fromCache: false,
                isStale: false,
                cacheTtlSeconds,
            },
        };
    } catch (error: any) {
        if (googleReviewsCache && googleReviewsCache.cacheKey === cacheKey) {
            return {
                data: googleReviewsCache.payload,
                meta: {
                    fromCache: true,
                    isStale: true,
                    cacheTtlSeconds,
                },
            };
        }

        const statusCode = error?.response?.status;
        const providerError = error?.response?.data?.error_message || error?.response?.data?.error || error?.message;
        const message = statusCode
            ? `Google Places API request failed (${statusCode}): ${providerError || 'Unknown error'}`
            : `Google Places API request failed: ${providerError || 'Unknown error'}`;

        throw new Error(message);
    }
}

export default {
    getGoogleReviews,
};
