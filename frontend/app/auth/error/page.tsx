"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification token has expired or has already been used.",
    Default: "An error occurred during authentication. Please try again.",
    OAuthSignin: "Error in constructing an authorization URL.",
    OAuthCallback: "Error in handling the callback from an OAuth provider.",
    OAuthCreateAccount: "Could not create OAuth provider account in the database.",
    OAuthAccountNotLinked: "Email is already associated with another account.",
    EmailCreateAccount: "Could not create user account.",
    EmailSignin: "Failed to send verification email.",
    Callback: "Error in the OAuth callback handler.",
    OAuthProfile: "Failed to retrieve user profile from OAuth provider.",
    SessionRequired: "You must be signed in to access this page.",
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-8 shadow-xl">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Error Message */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
            <p className="text-neutral-400">{errorMessage}</p>
            {error && (
              <p className="text-xs text-neutral-500 mt-2 font-mono">Error code: {error}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors text-center shadow-lg shadow-blue-600/20"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full bg-neutral-700 hover:bg-neutral-600 text-white font-medium py-3 rounded-lg transition-colors text-center"
            >
              Return to Home
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-neutral-400 mt-6">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
