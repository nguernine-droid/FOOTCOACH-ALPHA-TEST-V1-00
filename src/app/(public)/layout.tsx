import React from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center">
      {/*
          COQUILLE_PUBLIQUE (Vitrine / Onboarding)
          Structure épurée sans navigation pour focus maximal sur le message.
      */}
      <div className="w-full max-w-6xl">
        {children}
      </div>
    </div>
  );
}
