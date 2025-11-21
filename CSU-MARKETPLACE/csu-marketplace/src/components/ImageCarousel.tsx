import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageCarouselProps {
  images?: { image_id: number; storage_path: string; image_order: number }[];
  productName: string;
  className?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, productName, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get public URLs for images
  const imageUrls = images && images.length > 0
    ? images
        .sort((a, b) => a.image_order - b.image_order)
        .map(img => {
          if (!supabase) return '';
          const { data } = supabase.storage.from('product-images').getPublicUrl(img.storage_path);
          return data.publicUrl;
        })
    : [];

  const hasImages = imageUrls.length > 0;

  // Reset currentIndex when images change
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Main Image Display */}
      <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
        {hasImages ? (
          <>
            {/* Image */}
            <img
              src={imageUrls[currentIndex]}
              alt={`${productName} - Image ${currentIndex + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E';
              }}
            />

            {/* Navigation Arrows (only if multiple images) */}
            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => goToPrevious(e)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white p-2 rounded-full transition-all z-10 hover:bg-black/30"
                  style={{ backgroundColor: 'transparent' }}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => goToNext(e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white p-2 rounded-full transition-all z-10 hover:bg-black/30"
                  style={{ backgroundColor: 'transparent' }}
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

          </>
        ) : (
          // Placeholder when no images
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <Camera className="w-16 h-16 mb-2" />
            <p className="text-sm">No images available</p>
          </div>
        )}
      </div>

      {/* Dot Indicators (only if multiple images) */}
      {hasImages && imageUrls.length > 1 && (
        <div className="flex justify-center gap-2 mt-3 mb-3">
          {imageUrls.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToSlide(e, index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'hover:opacity-80' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              style={index === currentIndex ? { backgroundColor: '#208756' } : {}}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
