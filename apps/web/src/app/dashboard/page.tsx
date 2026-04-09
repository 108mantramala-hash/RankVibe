'use client';

import { useState, useEffect } from 'react';

interface Business {
  id: string;
  name: string;
  google_place_id: string;
  avg_rating: number | null;
  review_count: number | null;
  created_at: string;
}

interface Review {
  id: string;
  author_name: string;
  rating: number;
  text: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  themes: string[] | null;
  created_at: string;
}

interface DashboardStats {
  totalBusinesses: number;
  totalReviews: number;
  avgRating: number;
  recentReviews: Review[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch businesses
      const businessesRes = await fetch('/api/dashboard/businesses');
      const businesses = await businessesRes.json();

      // Fetch reviews
      const reviewsRes = await fetch('/api/dashboard/reviews?limit=10');
      const reviews = await reviewsRes.json();

      // Calculate stats
      const totalBusinesses = businesses.length;
      const totalReviews = reviews.length;
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
        : 0;

      setStats({
        totalBusinesses,
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        recentReviews: reviews,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBusiness = async () => {
    if (!googleMapsUrl.trim()) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleMapsUrl }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully processed ${result.data.businessName} with ${result.data.reviewCount} reviews!`);
        setGoogleMapsUrl('');
        loadDashboardData(); // Refresh data
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to process business: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[var(--muted)] mt-1">Loading your reputation data...</p>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted)] mt-1">Your reputation at a glance.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Businesses Tracked</p>
          <p className="text-3xl font-bold mt-1">{stats?.totalBusinesses || 0}</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Total Reviews</p>
          <p className="text-3xl font-bold mt-1">{stats?.totalReviews || 0}</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">Average Rating</p>
          <p className="text-3xl font-bold mt-1">{stats?.avgRating || 0} ⭐</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm text-[var(--muted)]">AI Analysis</p>
          <p className="text-3xl font-bold mt-1 text-green-600">Active</p>
        </div>
      </div>

      {/* Add Business Section */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Business</h2>
        <div className="flex gap-4">
          <input
            type="url"
            placeholder="Paste Google Maps URL (e.g., https://maps.app.goo.gl/...)"
            value={googleMapsUrl}
            onChange={(e) => setGoogleMapsUrl(e.target.value)}
            className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={processing}
          />
          <button
            onClick={handleAddBusiness}
            disabled={processing || !googleMapsUrl.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Add Business'}
          </button>
        </div>
        <p className="text-sm text-[var(--muted)] mt-2">
          This will scrape reviews, analyze sentiment, and save everything to your database.
        </p>
      </div>

      {/* Recent Reviews */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Reviews</h2>
        {stats?.recentReviews && stats.recentReviews.length > 0 ? (
          <div className="space-y-4">
            {stats.recentReviews.map((review) => (
              <div key={review.id} className="border-b border-[var(--border)] pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{review.author_name}</span>
                    <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(review.sentiment)}`}>
                    {review.sentiment || 'analyzing'}
                  </span>
                </div>
                {review.text && (
                  <p className="text-[var(--muted)] text-sm mb-2">{review.text}</p>
                )}
                {review.themes && review.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {review.themes.map((theme, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--muted)]">No reviews yet. Add a business above to get started!</p>
        )}
      </div>
    </div>
  );
}

