'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Shield, Loader2, CheckCircle2, AlertTriangle, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Club {
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  stadium?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  similarity?: number;
  matched_alias?: string | null;
  parent_id?: string | null;
  parent_name?: string | null;
  is_verified?: boolean;
}

interface ParentSuggestion {
  id: string;
  name: string;
  city: string | null;
}

interface NearbyClub {
  id: string;
  name: string;
  city: string | null;
  distance_km: number;
}

interface ClubSearchInputProps {
  value: string;
  onSelect: (club: Club) => void;
  onCreate: (name: string, parentId?: string) => void;
  isPro?: boolean;
  placeholder?: string;
  city?: string;          // ville de référence pour tri + vérif GPS
  requireVerified?: boolean; // bloque la soumission si club non vérifié
}

export function ClubSearchInput({ value, onSelect, onCreate, isPro = true, placeholder = 'Rechercher votre club...', city, requireVerified = false }: ClubSearchInputProps) {
  const [query, setQuery]               = useState(value || '');
  const [results, setResults]           = useState<Club[]>([]);
  const [isOpen, setIsOpen]             = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [selected, setSelected]         = useState<Club | null>(null);
  const [nearbyClubs, setNearbyClubs]       = useState<NearbyClub[]>([]);
  const [isCheckingGps, setIsCheckingGps]   = useState(false);
  const [pendingCreate, setPendingCreate]   = useState<string | null>(null);
  const [parentSuggestion, setParentSuggestion] = useState<ParentSuggestion | null>(null);
  const debounceRef                     = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef                      = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setIsLoading(true);
    try {
      const { data } = await supabase.rpc('search_clubs_fuzzy', {
        p_query: q.trim(),
        p_limit: 8,
      });
      // Enrichir avec stadium + coords
      const ids = (data as Club[]).map(c => c.id);
      if (ids.length > 0) {
        const { data: full } = await supabase
          .from('clubs').select('id, stadium, latitude, longitude, is_verified').in('id', ids);
        const fullMap = Object.fromEntries((full || []).map(c => [c.id, c]));
        const enriched = (data as Club[]).map(c => ({ ...c, ...fullMap[c.id] }));

        // Tri : même ville en premier, puis vérifiés, puis similarité
        const cityNorm = city?.toLowerCase().trim() || '';
        enriched.sort((a, b) => {
          const aCity = (a.city || '').toLowerCase().trim() === cityNorm ? 1 : 0;
          const bCity = (b.city || '').toLowerCase().trim() === cityNorm ? 1 : 0;
          if (bCity !== aCity) return bCity - aCity;
          if ((b.is_verified ? 1 : 0) !== (a.is_verified ? 1 : 0))
            return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
          return (b.similarity || 0) - (a.similarity || 0);
        });
        setResults(enriched);
      } else {
        setResults([]);
      }
    } catch {
      // Fallback : recherche sur nom normalisé + ilike
      const norm = q.trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]/g, '').trim();
      const { data: byNorm } = await supabase
        .from('clubs')
        .select('id, name, city, stadium, logo_url, latitude, longitude')
        .ilike('name_normalized', `%${norm}%`)
        .limit(8);
      if (byNorm?.length) {
        setResults(byNorm as Club[]);
      } else {
        const { data } = await supabase
          .from('clubs')
          .select('id, name, city, stadium, logo_url, latitude, longitude')
          .ilike('name', `%${q.trim()}%`)
          .limit(8);
        setResults((data as Club[]) || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (club: Club) => {
    const searchTerm = query.trim();
    setQuery(club.name);
    setSelected(club);
    setIsOpen(false);
    onSelect(club);

    // Si le terme saisi est différent du nom officiel → sauvegarder comme alias
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (searchTerm && normalize(searchTerm) !== normalize(club.name)) {
      supabase.rpc('save_club_alias', {
        p_club_id: club.id,
        p_alias:   searchTerm,
      }).then(() => {}); // fire & forget, silencieux
    }
  };

  // Géocode une ville via Nominatim
  const geocodeCity = async (cityName: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&countrycodes=fr`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch { /* silencieux */ }
    return null;
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;

    // Vérification GPS si une ville est disponible
    const cityRef = city || '';
    if (cityRef) {
      setIsCheckingGps(true);
      setIsOpen(false);
      setPendingCreate(name);
      try {
        const coords = await geocodeCity(cityRef);
        if (coords) {
          const { data: nearby } = await supabase.rpc('find_nearby_clubs', {
            p_lat: coords.lat, p_lon: coords.lon, p_radius_km: 1,
          });
          if (nearby && (nearby as NearbyClub[]).length > 0) {
            setNearbyClubs(nearby as NearbyClub[]);
            setIsCheckingGps(false);
            return; // on attend que le coach choisisse
          }
        }
      } catch { /* silencieux */ }
      setIsCheckingGps(false);
    }

    // Vérification parent probable (ex: "AS Bobigny U13" → parent "AS Bobigny")
    try {
      const { data: parent } = await supabase.rpc('find_parent_club', { p_name: name });
      if (parent && (parent as ParentSuggestion[]).length > 0) {
        setParentSuggestion((parent as ParentSuggestion[])[0]);
        setIsCheckingGps(false);
        return; // on attend le choix du coach
      }
    } catch { /* silencieux */ }

    // Aucun club proche, aucun parent → création directe
    setPendingCreate(null);
    setNearbyClubs([]);
    setParentSuggestion(null);
    onCreate(name);
  };

  const confirmCreate = (withParentId?: string) => {
    const name = pendingCreate;
    setPendingCreate(null);
    setNearbyClubs([]);
    setParentSuggestion(null);
    if (name) onCreate(name, withParentId);
  };

  const selectNearby = (club: NearbyClub) => {
    setPendingCreate(null);
    setNearbyClubs([]);
    setParentSuggestion(null);
    onSelect({ id: club.id, name: club.name, city: club.city, logo_url: null });
  };

  const similarityColor = (s?: number) => {
    if (!s) return '';
    if (s > 0.7) return 'text-green-500';
    if (s > 0.4) return 'text-orange-500';
    return 'text-gray-400';
  };

  const similarityLabel = (s?: number) => {
    if (!s) return '';
    if (s > 0.7) return 'Correspondance exacte';
    if (s > 0.4) return 'Ressemblant';
    return 'Similaire';
  };

  return (
    <div ref={wrapperRef} className="relative">

      {/* INPUT */}
      <div className={`relative flex items-center rounded-2xl border-2 transition-all
        ${selected
          ? 'border-green-500 bg-green-500/5'
          : isPro ? 'border-gray-200 bg-white' : 'border-white/10 bg-white/5'}`}>
        <Search size={16} className="absolute left-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-4 bg-transparent text-sm font-bold outline-none rounded-2xl
            ${isPro ? 'text-gray-900 placeholder:text-gray-300' : 'text-white placeholder:text-gray-600'}`}
        />
        {isLoading && <Loader2 size={16} className="absolute right-4 animate-spin text-gray-400" />}
        {selected && <CheckCircle2 size={16} className="absolute right-4 text-green-500" />}
      </div>

      {/* BADGE club sélectionné */}
      {selected && (
        <div className="mt-2 px-1 space-y-1">
          <div className="flex items-center gap-2">
            {selected.is_verified
              ? <CheckCircle2 size={12} className="text-green-500 shrink-0" />
              : <AlertTriangle size={12} className="text-orange-400 shrink-0" />
            }
            <span className={`text-[10px] font-black uppercase tracking-widest truncate
              ${selected.is_verified ? 'text-green-500' : 'text-orange-400'}`}>
              {selected.name}
            </span>
          </div>
          {selected.is_verified
            ? (selected.city || selected.stadium) && (
                <p className="text-[9px] font-bold text-gray-400 uppercase pl-5">
                  📍 {[selected.city, selected.stadium].filter(Boolean).join(' • ')}
                </p>
              )
            : (
              <div className={`pl-5 space-y-1`}>
                <p className="text-[9px] font-bold text-orange-400 uppercase">
                  ⚠️ Ville et stade manquants — club non validé
                </p>
                {requireVerified && (
                  <p className="text-[9px] font-black text-red-500 uppercase">
                    🔒 Complétez ce club avant de continuer
                  </p>
                )}
              </div>
            )
          }
        </div>
      )}

      {/* DROPDOWN */}
      {isOpen && query.trim().length >= 2 && (
        <div className={`absolute z-[500] w-full mt-2 rounded-2xl border-2 overflow-hidden shadow-2xl
          ${isPro ? 'bg-white border-gray-100' : 'bg-[#111] border-white/10'}`}>

          {results.length > 0 ? (
            <>
              <div className={`px-4 py-2 border-b ${isPro ? 'border-gray-50 bg-gray-50' : 'border-white/5 bg-white/5'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Clubs trouvés</p>
              </div>

              {results.map(club => (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => handleSelect(club)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left border-b transition-colors active:scale-[0.98]
                    ${isPro ? 'border-gray-50 hover:bg-gray-50' : 'border-white/5 hover:bg-white/5'}`}
                >
                  {/* Logo ou shield */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden
                    ${isPro ? 'bg-gray-100' : 'bg-white/10'}`}>
                    {club.logo_url
                      ? <img src={club.logo_url} className="w-full h-full object-contain p-1" />
                      : <Shield size={18} className="text-gray-300" />}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-black uppercase truncate ${isPro ? 'text-gray-900' : 'text-white'}`}>
                        {club.name}
                      </p>
                      {club.is_verified
                        ? <CheckCircle2 size={11} className="text-green-500 shrink-0" />
                        : <AlertTriangle size={11} className="text-orange-400 shrink-0" />
                      }
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      {club.is_verified
                        ? [club.city, club.stadium].filter(Boolean).join(' • ')
                        : '⚠️ Ville / stade manquant'}
                    </p>
                    {club.parent_name && (
                      <p className="text-[9px] font-black text-purple-400 uppercase mt-0.5">
                        ↳ {club.parent_name}
                      </p>
                    )}
                    {club.matched_alias && (
                      <p className="text-[9px] font-black text-neon-cyan uppercase mt-0.5">
                        alias : {club.matched_alias}
                      </p>
                    )}
                  </div>

                  {/* Score de similarité */}
                  {club.similarity !== undefined && (
                    <span className={`text-[9px] font-black uppercase shrink-0 ${similarityColor(club.similarity)}`}>
                      {similarityLabel(club.similarity)}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : !isLoading ? (
            <div className={`px-4 py-3 flex items-center gap-2 ${isPro ? 'bg-orange-50' : 'bg-orange-500/10'}`}>
              <AlertTriangle size={14} className="text-orange-500 shrink-0" />
              <p className="text-[10px] font-black uppercase text-orange-500">
                Aucun club trouvé pour "{query}"
              </p>
            </div>
          ) : null}

          {/* Option créer */}
          {query.trim().length >= 2 && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCheckingGps}
              className={`w-full px-4 py-3 flex items-center gap-3 transition-colors
                ${isPro ? 'bg-orange-50 hover:bg-orange-100' : 'bg-neon-cyan/5 hover:bg-neon-cyan/10'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${isPro ? 'bg-orange-100' : 'bg-neon-cyan/20'}`}>
                {isCheckingGps
                  ? <Loader2 size={18} className={`animate-spin ${isPro ? 'text-orange-600' : 'text-neon-cyan'}`} />
                  : <Plus size={18} className={isPro ? 'text-orange-600' : 'text-neon-cyan'} />
                }
              </div>
              <div>
                <p className={`text-sm font-black uppercase ${isPro ? 'text-orange-600' : 'text-neon-cyan'}`}>
                  {isCheckingGps ? 'Vérification GPS...' : `Créer "${query.trim()}"`}
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">
                  {isCheckingGps ? 'Recherche de clubs proches' : 'Ce club n\'est pas encore référencé'}
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* PANNEAU CLUBS PROCHES — affiché hors dropdown */}
      {nearbyClubs.length > 0 && pendingCreate && (
        <div className={`mt-3 rounded-2xl border-2 overflow-hidden shadow-xl
          ${isPro ? 'bg-white border-orange-200' : 'bg-[#0A0A0A] border-orange-500/30'}`}>

          {/* En-tête avertissement */}
          <div className={`px-4 py-3 flex items-start gap-3 border-b
            ${isPro ? 'bg-orange-50 border-orange-100' : 'bg-orange-500/10 border-orange-500/20'}`}>
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest">
                {nearbyClubs.length} club{nearbyClubs.length > 1 ? 's' : ''} détecté{nearbyClubs.length > 1 ? 's' : ''} à moins d'1 km
              </p>
              <p className="text-[9px] font-bold text-orange-400/70 mt-0.5">
                Est-ce l'un de ces clubs ?
              </p>
            </div>
          </div>

          {/* Liste des clubs proches */}
          {nearbyClubs.map(club => (
            <button
              key={club.id}
              type="button"
              onClick={() => selectNearby(club)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left border-b transition-colors active:scale-[0.98]
                ${isPro ? 'border-gray-50 hover:bg-gray-50' : 'border-white/5 hover:bg-white/5'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${isPro ? 'bg-orange-50' : 'bg-orange-500/10'}`}>
                <MapPin size={16} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-black uppercase ${isPro ? 'text-gray-900' : 'text-white'}`}>
                  {club.name}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  {club.city} • à {club.distance_km} km
                </p>
              </div>
              <CheckCircle2 size={16} className="text-orange-500 shrink-0" />
            </button>
          ))}

          {/* Confirmer création malgré tout */}
          <button
            type="button"
            onClick={() => confirmCreate()}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors
              ${isPro ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${isPro ? 'bg-gray-100' : 'bg-white/10'}`}>
              <Plus size={16} className="text-gray-400" />
            </div>
            <div>
              <p className={`text-sm font-black uppercase ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>
                Non, créer "{pendingCreate}"
              </p>
              <p className="text-[9px] font-bold text-gray-400 uppercase">
                C'est bien un nouveau club
              </p>
            </div>
          </button>
        </div>
      )}
      {/* PANNEAU PARENT PROBABLE */}
      {parentSuggestion && pendingCreate && (
        <div className={`mt-3 rounded-2xl border-2 overflow-hidden shadow-xl
          ${isPro ? 'bg-white border-purple-200' : 'bg-[#0A0A0A] border-purple-500/30'}`}>

          <div className={`px-4 py-3 flex items-start gap-3 border-b
            ${isPro ? 'bg-purple-50 border-purple-100' : 'bg-purple-500/10 border-purple-500/20'}`}>
            <Shield size={16} className="text-purple-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-purple-500 tracking-widest">
                Club parent probable détecté
              </p>
              <p className="text-[9px] font-bold text-purple-400/70 mt-0.5">
                "{pendingCreate}" est-il une équipe de ce club ?
              </p>
            </div>
          </div>

          {/* Option : lier au parent */}
          <button
            type="button"
            onClick={() => confirmCreate(parentSuggestion.id)}
            className={`w-full px-4 py-3 flex items-center gap-3 text-left border-b transition-colors active:scale-[0.98]
              ${isPro ? 'border-gray-50 hover:bg-purple-50' : 'border-white/5 hover:bg-purple-500/10'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${isPro ? 'bg-purple-50' : 'bg-purple-500/10'}`}>
              <Shield size={16} className="text-purple-500" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-black uppercase ${isPro ? 'text-gray-900' : 'text-white'}`}>
                {parentSuggestion.name}
              </p>
              <p className="text-[10px] font-bold text-purple-500 uppercase">
                ✓ Créer "{pendingCreate}" comme équipe rattachée
              </p>
            </div>
          </button>

          {/* Option : club indépendant */}
          <button
            type="button"
            onClick={() => confirmCreate()}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors
              ${isPro ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${isPro ? 'bg-gray-100' : 'bg-white/10'}`}>
              <Plus size={16} className="text-gray-400" />
            </div>
            <div>
              <p className={`text-sm font-black uppercase ${isPro ? 'text-gray-500' : 'text-gray-400'}`}>
                Non, c'est un club indépendant
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
