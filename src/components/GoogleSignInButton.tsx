import React from 'react';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  size = 'md',
  label = 'Sign in with Google',
  className = ''
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`gsi-material-button group relative inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg cursor-pointer ${
        isSm
          ? 'h-8 px-3 text-xs gap-2'
          : isLg
          ? 'h-11 px-5 text-sm gap-3'
          : 'h-9 px-3.5 text-xs gap-2.5'
      } bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-100 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <div className="gsi-material-button-state absolute inset-0 rounded-lg pointer-events-none group-hover:bg-white/[0.04]"></div>
      
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
      ) : (
        <div className="gsi-material-button-icon shrink-0">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className={isSm ? 'w-4 h-4' : 'w-4.5 h-4.5'}
            style={{ display: 'block' }}
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </div>
      )}
      
      <span className="gsi-material-button-contents font-sans tracking-wide">
        {isLoading ? 'Connecting...' : label}
      </span>
    </button>
  );
};
