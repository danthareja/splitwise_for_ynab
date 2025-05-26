"use client";

import { useState } from "react";
import { YNABFlag } from "@/components/ynab-flag";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export function InteractiveTransactionDemo() {
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showFlagSelector, setShowFlagSelector] = useState(false);

  const flagColors = [
    { id: "red", name: "Red" },
    { id: "orange", name: "Orange" },
    { id: "yellow", name: "Yellow" },
    { id: "green", name: "Green" },
    { id: "blue", name: "Blue" },
    { id: "purple", name: "Purple" },
  ];

  const handleFlagSelect = (colorId: string) => {
    setSelectedFlag(colorId);
    setShowFlagSelector(false);
    setShowCongrats(true);
  };

  const handleFlagClick = () => {
    if (!selectedFlag) {
      setShowFlagSelector(true);
    }
  };

  const resetDemo = () => {
    setSelectedFlag(null);
    setShowCongrats(false);
    setShowFlagSelector(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop view */}
          <div className="hidden md:block">
            {/* YNAB-style transaction header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                <div className="col-span-1"></div>
                <div className="col-span-1">FLAG</div>
                <div className="col-span-2">DATE</div>
                <div className="col-span-3">PAYEE</div>
                <div className="col-span-2">CATEGORY</div>
                <div className="col-span-1">MEMO</div>
                <div className="col-span-2 text-right">OUTFLOW</div>
              </div>
            </div>

            {/* Transaction row */}
            <div className="px-6 py-4 bg-white">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  <div className="w-4 h-4 border border-gray-300 rounded"></div>
                </div>
                <div className="col-span-1">
                  <button
                    onClick={handleFlagClick}
                    className="hover:bg-gray-100 p-1 rounded transition-colors"
                    disabled={showCongrats}
                  >
                    {selectedFlag ? (
                      <YNABFlag colorId={selectedFlag} size="sm" />
                    ) : (
                      <svg
                        width="16"
                        height="10"
                        viewBox="0 0 16 10"
                        className="cursor-pointer transition-colors"
                      >
                        <path
                          d="M 0 0 L 16 0 L 13.6 5 L 16 10 L 0 10 Z"
                          fill="none"
                          stroke="rgb(156, 163, 175)"
                          strokeWidth="1"
                          strokeDasharray="2,1"
                          className="hover:stroke-blue-500 transition-colors"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="col-span-2 text-sm text-gray-900">
                  05/26/2025
                </div>
                <div className="col-span-3 text-sm text-gray-900">
                  Gas Station
                </div>
                <div className="col-span-2 text-sm text-gray-900">
                  🚗 Transportation
                </div>
                <div className="col-span-1 text-sm text-gray-900">I Paid</div>
                <div className="col-span-2 text-sm text-gray-900 text-right">
                  $50.00
                </div>
              </div>
            </div>
          </div>

          {/* Mobile view */}
          <div className="md:hidden">
            <div className="p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleFlagClick}
                    className="hover:bg-gray-100 p-2 rounded transition-colors"
                    disabled={showCongrats}
                  >
                    {selectedFlag ? (
                      <YNABFlag colorId={selectedFlag} size="sm" />
                    ) : (
                      <svg
                        width="16"
                        height="10"
                        viewBox="0 0 16 10"
                        className="cursor-pointer transition-colors"
                      >
                        <path
                          d="M 0 0 L 16 0 L 13.6 5 L 16 10 L 0 10 Z"
                          fill="none"
                          stroke="rgb(156, 163, 175)"
                          strokeWidth="1.5"
                          strokeDasharray="2,1"
                          className="hover:stroke-blue-500 transition-colors"
                        />
                      </svg>
                    )}
                  </button>
                  <div>
                    <div className="font-medium text-gray-900">Gas Station</div>
                    <div className="text-sm text-gray-500">05/26/2025</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">$50.00</div>
                  <div className="text-sm text-gray-500">Outflow</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  <span>🚗</span>
                  <span className="text-gray-700">Transportation</span>
                </div>
                <div className="text-gray-500">I Paid</div>
              </div>
            </div>
          </div>

          {/* Flag selector dropdown */}
          {showFlagSelector && (
            <div className="px-4 md:px-6 py-4 bg-blue-50 border-t border-blue-100">
              <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Choose a flag color to mark this as shared:
              </h4>
              <div className="grid grid-cols-3 md:flex md:justify-center gap-3 md:space-x-4 md:gap-0">
                {flagColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleFlagSelect(color.id)}
                    className="flex flex-col items-center p-3 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 group"
                  >
                    <YNABFlag
                      colorId={color.id}
                      size="md"
                      className="mb-2 group-hover:scale-110 transition-transform"
                    />
                    <span className="text-xs text-gray-600 font-medium">
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowFlagSelector(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success message */}
          {showCongrats && (
            <div className="px-4 md:px-6 py-6 md:py-8 bg-green-50 border-t border-green-100 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-green-800 mb-2">
                That&apos;s it!
              </h4>
              <p className="text-base md:text-lg text-green-700 mb-4">
                We&apos;ll take care of the rest. No more manual data entry.
              </p>
              <div className="bg-white p-4 rounded-lg shadow-sm max-w-md mx-auto">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>What happens next automatically:</strong>
                </p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>✅ Creates $50 expense in Splitwise</p>
                  <p>✅ Adds $25 adjustment to your YNAB</p>
                  <p>✅ Maintains Transportation category</p>
                  <p>✅ Updates account balances</p>
                </div>
              </div>
              <button
                onClick={resetDemo}
                className="mt-4 text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Try again with a different color →
              </button>
            </div>
          )}

          {/* Initial instruction for both mobile and desktop */}
          {!showFlagSelector && !showCongrats && (
            <div className="px-4 py-4 bg-blue-50 border-t border-blue-100 text-center">
              <p className="text-sm text-blue-800 font-medium">
                👆 Click the dashed flag outline above to mark this as a shared
                expense
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
