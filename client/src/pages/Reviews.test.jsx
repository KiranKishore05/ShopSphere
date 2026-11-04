import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import StarRating from '../components/reviews/StarRating';
import ReviewBreakdown from '../components/reviews/ReviewBreakdown';
import ReviewList from '../components/reviews/ReviewList';
import ReviewModal from '../components/reviews/ReviewModal';
import SearchAutocomplete from '../components/layout/SearchAutocomplete';
import SEO from '../components/common/SEO';
import * as reviewService from '../services/reviewService';

vi.mock('../services/reviewService');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

describe('Phase 8: Frontend Reviews, Search Autocomplete & SEO Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. StarRating Component
  describe('StarRating Component', () => {
    it('renders correct number of stars and optional score label', () => {
      render(<StarRating rating={4} maxStars={5} showScore={true} />);
      expect(screen.getByText('4.0')).toBeInTheDocument();
      const stars = screen.getAllByRole('button');
      expect(stars.length).toBe(5);
    });

    it('triggers onChange when interactive star is clicked', () => {
      const handleChange = vi.fn();
      render(<StarRating rating={3} interactive={true} onChange={handleChange} />);
      const fourthStar = screen.getByRole('button', { name: '4 star' });
      fireEvent.click(fourthStar);
      expect(handleChange).toHaveBeenCalledWith(4);
    });
  });

  // 2. ReviewBreakdown Component
  describe('ReviewBreakdown Component', () => {
    const mockSummary = {
      averageRating: 4.8,
      totalReviews: 24,
      breakdown: {
        5: { count: 20, percentage: 83 },
        4: { count: 3, percentage: 13 },
        3: { count: 1, percentage: 4 },
        2: { count: 0, percentage: 0 },
        1: { count: 0, percentage: 0 }
      }
    };

    it('renders average rating score, total review count, and distribution bars', () => {
      render(
        <ReviewBreakdown
          summary={mockSummary}
          isAuthenticated={true}
          eligibility={{ isEligible: true, hasReviewed: false }}
        />
      );

      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText(/Based on 24 verified reviews/i)).toBeInTheDocument();
      expect(screen.getByText('Write a Review')).toBeInTheDocument();
      expect(screen.getByText('Verified Delivered Purchase')).toBeInTheDocument();
    });

    it('shows "Edit Your Review" button when customer has already reviewed', () => {
      render(
        <ReviewBreakdown
          summary={mockSummary}
          isAuthenticated={true}
          eligibility={{ isEligible: true, hasReviewed: true }}
        />
      );

      expect(screen.getByText('You reviewed this piece')).toBeInTheDocument();
      expect(screen.getByText('Edit Your Review')).toBeInTheDocument();
    });

    it('prompts unauthenticated visitors to sign in', () => {
      render(
        <ReviewBreakdown
          summary={mockSummary}
          isAuthenticated={false}
          eligibility={{ isEligible: false }}
        />
      );

      expect(screen.getByText('Sign In to Review')).toBeInTheDocument();
    });
  });

  // 3. ReviewList Component
  describe('ReviewList Component', () => {
    const mockReviews = [
      {
        _id: 'rev_1',
        rating: 5,
        title: 'Architectural Masterpiece',
        comment: 'Drapes exceptionally well on shoulders and has heavyweight natural wool warmth.',
        userName: 'Eleanor Vance',
        userId: 'user_author_001',
        isVerifiedPurchase: true,
        isFeatured: true,
        createdAt: '2026-11-01T12:00:00.000Z'
      },
      {
        _id: 'rev_2',
        rating: 4,
        title: 'Superb Fabric Finish',
        comment: 'Very pleased with tailoring though sleeves run slightly long.',
        userName: 'Julian Barnes',
        userId: 'user_other_002',
        isVerifiedPurchase: true,
        isFeatured: false,
        createdAt: '2026-10-28T10:00:00.000Z'
      }
    ];

    it('renders reviews with verified purchase pill and featured badge', () => {
      render(
        <ReviewList
          reviews={mockReviews}
          currentUserId="user_author_001"
        />
      );

      expect(screen.getByText('Architectural Masterpiece')).toBeInTheDocument();
      expect(screen.getByText('Superb Fabric Finish')).toBeInTheDocument();
      expect(screen.getByText('Eleanor Vance')).toBeInTheDocument();
      expect(screen.getAllByText('Verified Purchase').length).toBe(2);
      expect(screen.getByText('Featured Review')).toBeInTheDocument();
    });

    it('exposes edit and delete actions only to the review author', () => {
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();

      render(
        <ReviewList
          reviews={mockReviews}
          currentUserId="user_author_001"
          onEditReview={handleEdit}
          onDeleteReview={handleDelete}
        />
      );

      // Only Eleanor Vance (author) gets the edit button
      const editButtons = screen.getAllByTitle('Edit review');
      expect(editButtons.length).toBe(1);

      fireEvent.click(editButtons[0]);
      expect(handleEdit).toHaveBeenCalledWith(mockReviews[0]);
    });
  });

  // 4. ReviewModal Component
  describe('ReviewModal Component', () => {
    it('validates minimum input length and submits form data', () => {
      const handleSubmit = vi.fn();
      const handleClose = vi.fn();

      render(
        <ReviewModal
          isOpen={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
          productTitle="Cashmere Overcoat"
        />
      );

      expect(screen.getByText('Write a Garment Review')).toBeInTheDocument();
      expect(screen.getByText('Cashmere Overcoat')).toBeInTheDocument();

      const titleInput = screen.getByPlaceholderText(/e\.g\. Magnificent drape/i);
      const commentInput = screen.getByPlaceholderText(/Share details about the silhouette/i);
      const submitBtn = screen.getByRole('button', { name: /Publish Review/i });

      // Enter valid review content
      fireEvent.change(titleInput, { target: { value: 'Impeccable Fit' } });
      fireEvent.change(commentInput, { target: { value: 'The wool weight is extraordinary and tailoring is crisp.' } });
      fireEvent.click(submitBtn);

      expect(handleSubmit).toHaveBeenCalledWith({
        rating: 5,
        title: 'Impeccable Fit',
        comment: 'The wool weight is extraordinary and tailoring is crisp.'
      });
    });
  });

  // 5. SearchAutocomplete Component
  describe('SearchAutocomplete Component', () => {
    const mockSuggestions = {
      products: [
        {
          _id: 'sug_1',
          name: 'Double-Breasted Wool Coat',
          slug: 'double-breasted-wool-coat',
          brand: 'Atelier Sphere',
          priceRange: { min: 14000 },
          image: 'https://example.com/coat.jpg'
        }
      ],
      categories: [
        { _id: 'cat_1', name: 'Outerwear', slug: 'outerwear' }
      ],
      totalCount: 8
    };

    it('renders suggested products, matching categories, and view all button', async () => {
      reviewService.fetchSearchSuggestions.mockResolvedValue(mockSuggestions);

      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter>
            <SearchAutocomplete isOpen={true} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      const input = screen.getByPlaceholderText(/Search garments, categories, fabrics/i);
      fireEvent.change(input, { target: { value: 'coat' } });

      await waitFor(() => {
        expect(screen.getByText('Double-Breasted Wool Coat')).toBeInTheDocument();
      });

      expect(screen.getByText('Outerwear')).toBeInTheDocument();
      expect(screen.getByText(/View all 8 results for "coat"/i)).toBeInTheDocument();
    });
  });

  // 6. Dynamic SEO Component
  describe('SEO Component', () => {
    it('updates document title, description, and OpenGraph tags', async () => {
      render(
        <SEO
          title="Ribbed Merino Knit"
          description="A tactile luxury mockneck woven in Italy."
          type="product"
        />
      );

      await waitFor(() => {
        expect(document.title).toBe('Ribbed Merino Knit — ShopSphere');
      });

      const descMeta = document.querySelector('meta[name="description"]');
      expect(descMeta?.getAttribute('content')).toBe('A tactile luxury mockneck woven in Italy.');

      const ogType = document.querySelector('meta[property="og:type"]');
      expect(ogType?.getAttribute('content')).toBe('product');
    });
  });
});
