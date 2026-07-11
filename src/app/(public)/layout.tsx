import React from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#15171C] w-full">
      {children}
    </div>
  );
}
