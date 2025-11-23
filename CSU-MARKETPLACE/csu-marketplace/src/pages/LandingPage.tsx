import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            CSU Marketplace
          </h1>
          <p className="text-lg text-gray-600">
            Welcome to the CSU Student Marketplace
          </p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Buy & Sell
            </h2>
            <p className="text-gray-600">
              Discover items from fellow CSU students or list your own products for sale.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Services
            </h2>
            <p className="text-gray-600">
              Find tutoring, project help, and other services offered by students.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Rentals
            </h2>
            <p className="text-gray-600">
              Rent textbooks, equipment, and other items from the CSU community.
            </p>
          </div>
        </main>

        <div className="text-center mt-12">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
