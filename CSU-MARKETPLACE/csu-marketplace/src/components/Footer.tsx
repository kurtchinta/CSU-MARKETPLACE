import React from 'react';
import { MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: '#1a1a1a' }} className="text-white mt-16 border-t border-gray-700">
      <div className="container mx-auto px-6 lg:px-12 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                  stroke="#FFCF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3 className="text-xl font-bold">CSU Marketplace</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your trusted blockchain-powered platform for buying, selling, and renting within the CSU community.
            </p>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">

            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#208756' }}>Navigation</h3>
            <ul className="space-y-3">
              <li>
                <a href="/browse" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  Browse Products
                </a>
              </li>
              <li>
                <a href="/create-listing" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  Create Listing
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/profile" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  My Profile
                </a>
              </li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#208756' }}>Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="/help" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  Help & Support
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#208756' }} />
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#208756' }}>Location</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                  <p className="text-sm text-gray-300">Caraga State University<br />Butuan City, Philippines</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6" />
        
        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6">
          <div className="flex items-center gap-4">
            <img 
              src="/Caraga_State_University1.png"
              alt="CSU Logo"
              className="w-10 h-12 object-contain"
            />
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} <span className="font-semibold text-white">CSU Marketplace</span>. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
