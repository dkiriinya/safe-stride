'use client';

import React from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export const AuthWidget: React.FC = () => {
  return (
    <div className="flex items-center">
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8 rounded-full ring-2 ring-dark-accent/40',
            },
          }}
        />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui font-medium bg-dark-accent/15 text-dark-accent border border-dark-accent/30 hover:bg-dark-accent/25 transition-all cursor-pointer">
            <span>Sign In</span>
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  );
};
