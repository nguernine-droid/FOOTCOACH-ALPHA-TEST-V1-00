'use client';

import React from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trophy, MapPin, Star, Zap } from 'lucide-react';

interface SocialPostProps {
  author: string;
  role: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  image?: string | null;
  score?: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    scorers?: string;
    assists?: string;
  } | null;
  location?: string | null;
}

export function SocialPost({ author, role, time, content, likes, comments, image, score, location }: SocialPostProps) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Post Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-orange to-yellow-500 flex items-center justify-center font-black text-sm shadow-lg text-white">
            {author.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-black text-white tracking-tight italic uppercase">{author}</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{role} • {time}</p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-white transition-colors p-2 active:scale-90">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-5 pb-5 space-y-4">
        {content && <p className="text-[13px] text-gray-200 leading-relaxed font-medium">{content}</p>}

        {/* Attached Score Card */}
        {score && (
          <div className="bg-black/60 rounded-3xl p-5 border border-white/5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1 truncate">{score.homeTeam}</p>
                <span className="text-3xl font-black text-white italic">{score.homeScore}</span>
              </div>
              <div className="bg-brand-orange/20 px-3 py-1 rounded-full text-brand-orange font-black italic text-[10px] shadow-sm">VS</div>
              <div className="flex-1 text-center">
                <p className="text-[8px] font-black text-white/40 uppercase mb-1 truncate">{score.awayTeam || 'Adversaire'}</p>
                <span className="text-3xl font-black text-white italic">{score.awayScore}</span>
              </div>
            </div>

            {/* Scorers & Assists Grid */}
            {(score.scorers || score.assists) && (
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                {score.scorers && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-brand-orange uppercase tracking-widest">
                      <Trophy size={10} fill="currentColor" /> Buteurs
                    </div>
                    <p className="text-[10px] font-bold text-white/80 italic">{score.scorers}</p>
                  </div>
                )}
                {score.assists && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-sky-400 uppercase tracking-widest">
                      <Star size={10} fill="currentColor" /> Passes D.
                    </div>
                    <p className="text-[10px] font-bold text-white/80 italic">{score.assists}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attached Image */}
        {image && (
          <div className="rounded-[1.5rem] overflow-hidden border border-white/10 shadow-lg relative group">
            <img src={image} alt="Post content" className="w-full h-60 object-cover opacity-90 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          </div>
        )}

        {/* Attached Location */}
        {location && (
          <div className="flex items-center gap-2 text-grass-green text-[10px] font-black uppercase tracking-[0.2em] italic bg-grass-green/10 w-fit px-3 py-1.5 rounded-full border border-grass-green/20 shadow-sm">
            <MapPin size={12} className="fill-grass-green text-dark-bg" />
            {location}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button className="flex items-center gap-2 text-gray-400 hover:text-brand-orange transition-all active:scale-125 group">
            <div className="bg-white/5 p-2 rounded-xl group-hover:bg-brand-orange/20 transition-colors">
              <Heart size={18} />
            </div>
            <span className="text-xs font-black">{likes}</span>
          </button>
          <button className="flex items-center gap-2 text-gray-400 hover:text-sky-400 transition-all active:scale-125 group">
            <div className="bg-white/5 p-2 rounded-xl group-hover:bg-sky-400/20 transition-colors">
              <MessageCircle size={18} />
            </div>
            <span className="text-xs font-black">{comments}</span>
          </button>
        </div>
        <button className="text-gray-400 hover:text-white transition-colors p-2 bg-white/5 rounded-xl active:scale-90">
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
}
