'use client';

import { useState, useEffect } from 'react';

interface ChannelPrices {
  cafePrice?: string;
  rappiPrice?: string;
  pedidosyaPrice?: string;
  uberPrice?: string;
}

interface ChannelPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prices: ChannelPrices) => void;
  initialPrices?: ChannelPrices;
  title?: string;
  isPriceAdjustment?: boolean; // If true, shows as +/- adjustment
}

export default function ChannelPricingModal({
  isOpen,
  onClose,
  onSave,
  initialPrices = {},
  title = 'Channel-Specific Pricing',
  isPriceAdjustment = false,
}: ChannelPricingModalProps) {
  const [prices, setPrices] = useState<ChannelPrices>(initialPrices);

  useEffect(() => {
    setPrices(initialPrices);
  }, [initialPrices, isOpen]);

  const handleSave = () => {
    onSave(prices);
    onClose();
  };

  const handleChange = (channel: keyof ChannelPrices, value: string) => {
    setPrices((prev) => ({ ...prev, [channel]: value }));
  };

  if (!isOpen) return null;

  const channels = [
    {
      key: 'cafePrice' as keyof ChannelPrices,
      label: 'Café',
      icon: '☕',
      color: 'bg-amber-100 text-amber-800',
    },
    {
      key: 'rappiPrice' as keyof ChannelPrices,
      label: 'Rappi',
      icon: '🛵',
      color: 'bg-orange-100 text-orange-800',
    },
    {
      key: 'pedidosyaPrice' as keyof ChannelPrices,
      label: 'PedidosYa',
      icon: '🍕',
      color: 'bg-red-100 text-red-800',
    },
    {
      key: 'uberPrice' as keyof ChannelPrices,
      label: 'Uber Eats',
      icon: '🚗',
      color: 'bg-green-100 text-green-800',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            {isPriceAdjustment
              ? 'Set price adjustments for each delivery platform. Leave empty to use the default.'
              : 'Set custom prices for each delivery platform. Leave empty to use the base price.'}
          </p>

          {channels.map((channel) => (
            <div key={channel.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded ${channel.color} text-xs font-medium mr-2`}>
                  {channel.icon} {channel.label}
                </span>
              </label>
              <div className="relative">
                {isPriceAdjustment && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ±
                  </span>
                )}
                <input
                  type="number"
                  value={prices[channel.key] || ''}
                  onChange={(e) => handleChange(channel.key, e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isPriceAdjustment ? 'pl-8' : ''
                  }`}
                  placeholder={isPriceAdjustment ? '0' : 'Use base price'}
                  step="0.01"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            type="button"
          >
            Save Prices
          </button>
        </div>
      </div>
    </div>
  );
}
