import React from 'react';

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#15171C] relative overflow-x-hidden">
      {/*
          COQUILLE_SETUP (Optimisée pour le Scroll)
          On utilise un conteneur simple pour laisser le scroll naturel du navigateur.
      */}

      {/* Fond avec une grille légère et chaleureuse (Orange par défaut) */}
      <div className="fixed inset-0 opacity-5 bg-[linear-gradient(rgba(249,115,22,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.1)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none z-0" />

      {/* Effet de lueur centrale pour focus (Orange par défaut) */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-orange/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Conteneur de contenu : On centre horizontalement avec mx-auto */}
      <div className="relative z-10 w-full max-w-md mx-auto p-6 py-12">
        {children}
      </div>
    </div>
  );
}
