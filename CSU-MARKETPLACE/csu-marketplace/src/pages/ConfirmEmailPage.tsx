import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { useModal } from '../context/ModalContext';
import Footer from '../components/Footer';

export const ConfirmEmailPage: React.FC = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'expired'>('success');
  const navigate = useNavigate();
  const { showSuccess } = useModal();

  useEffect(() => {
    document.title = 'Confirm Email - CSU Marketplace';
  }, []);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        if (!supabase) {
          console.error('❌ Supabase not available');
          setVerificationStatus('error');
          setIsVerifying(false);
          return;
        }

        console.log('🔍 Confirm Email: Checking session after email verification...');

        // Get the session after email confirmation
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Verification error:', error);
          setVerificationStatus('error');
          setIsVerifying(false);
          return;
        }

        if (session && session.user) {
          console.log('✅ Email confirmed and user is logged in:', session.user.email);
          
          // Email confirmed successfully and user is logged in
          setVerificationStatus('success');
          setIsVerifying(false);

          // Show success message and redirect to dashboard
          showSuccess(
            'Email Confirmed!',
            'Your email has been verified successfully. Welcome to CSU Marketplace!\n\nRedirecting to your dashboard...',
            () => {
              // Navigate to dashboard - RouteGuard will handle role-based routing
              navigate('/dashboard', { replace: true });
            }
          );
          
          // Auto-redirect after 2 seconds even if user doesn't click OK
          const redirectTimer = setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
          
          return () => clearTimeout(redirectTimer);
        } else {
          // Session expired or invalid token
          console.log('⚠️ No session found - token may have expired');
          setVerificationStatus('expired');
          setIsVerifying(false);
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        setVerificationStatus('error');
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [navigate, showSuccess]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F9F2' }}>
        <div className="text-center">
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse" style={{ backgroundColor: '#219343' }}></div>
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl">
                <svg className="w-12 h-12 animate-spin" style={{ color: '#219343' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-black mb-4" style={{ color: '#219343' }}>Verifying Your Email</h1>
          <p className="text-gray-600 text-lg">Please wait while we confirm your account...</p>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F9F2' }}>
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse" style={{ backgroundColor: '#219343' }}></div>
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl">
                <svg className="w-12 h-12" style={{ color: '#219343' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-black mb-4" style={{ color: '#219343' }}>Email Confirmed!</h1>
          <p className="text-gray-600 text-lg mb-6">Your account has been verified successfully.</p>
          <div className="inline-flex items-center text-sm font-semibold" style={{ color: '#FF7F1C' }}>
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Redirecting to your dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F7F9F2' }}>
        <div className="text-center max-w-md bg-white rounded-2xl shadow-2xl p-8 border-2" style={{ borderColor: '#FFCF50' }}>
          <div className="mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full mx-auto" style={{ backgroundColor: 'rgba(255, 207, 80, 0.2)' }}>
              <svg className="w-8 h-8" style={{ color: '#FFCF50' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-black mb-4 text-gray-900">Link Expired</h1>
          <p className="text-gray-600 mb-6">This confirmation link has expired or is no longer valid.</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            style={{ background: 'linear-gradient(to right, #219343, #42D674)', color: 'white' }}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F7F9F2' }}>
      <div className="text-center max-w-md bg-white rounded-2xl shadow-2xl p-8 border-2 border-red-400">
        <div className="mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-black mb-4 text-gray-900">Verification Failed</h1>
        <p className="text-gray-600 mb-6">We couldn't verify your email. Please try registering again or contact support.</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          style={{ background: 'linear-gradient(to right, #219343, #42D674)', color: 'white' }}
        >
          Go to Homepage
        </button>
      </div>
      <Footer />
    </div>
  );
};
