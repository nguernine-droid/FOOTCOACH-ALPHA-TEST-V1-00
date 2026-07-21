'use client';

import React, { useState, useEffect } from 'react';
import { useDialogA11y } from '@/lib/hooks/useDialogA11y';
import { X, Pencil, Mail, Trophy, Star, Handshake, Zap, Target, Activity, Cpu, Shield, Check, Plus, ShieldCheck, Brain, Flame, Rocket, ChevronLeft } from 'lucide-react';
import { NeonButton } from './ui/cyber/NeonButton';
import { GlitchText } from './ui/cyber/GlitchText';

interface FullPlayerCardProps {
  player: any;
  onClose: () => void;
  onUpdate: (updatedData: any) => void;
  onMessage: (player: any) => void;
}

const getAvatarUrl = (name: string, size = 300) =>
  `https://i.pravatar.cc/${size}?u=${encodeURIComponent(name || 'placeholder')}`;

export function FullPlayerCard({ player, onClose, onUpdate, onMessage }: FullPlayerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [activeSubGrid, setActiveSubGrid] = useState<'none' | 'tech' | 'tact' | 'phys' | 'ment'>('none');
  const [isSyncing, setIsSyncing] = useState(false);
  const dialogRef = useDialogA11y(true, onClose);

  // Moteur de données initialisées selon Vision 3.0
  const [formData, setFormData] = useState({
    ...player,
    eval_phys: player.eval_phys || 70,
    eval_tech: player.eval_tech || 70,
    eval_ment: player.eval_ment || 70,
    eval_tact: player.eval_tact || 70,
    xp_phys: player.xp_phys !== undefined ? player.xp_phys : 50,
    xp_tech: player.xp_tech !== undefined ? player.xp_tech : 50,
    xp_eng: player.xp_eng !== undefined ? player.xp_eng : 50,
    rating: player.rating || 70,
    // Critères ABA
    tech_jonglage: player.tech_jonglage || 70,
    tech_conduite: player.tech_conduite || 70,
    tech_passe: player.tech_passe || 70,
    tech_frappe: player.tech_frappe || 70,
    tact_lecture: player.tact_lecture || 60,
    tact_placement: player.tact_placement || 60,
    tact_info: player.tact_info || 60,
    tact_transition: player.tact_transition || 60,
    phys_vitesse: player.phys_vitesse || 70,
    phys_endurance: player.phys_endurance || 70,
    phys_puissance: player.phys_puissance || 70,
    phys_coordination: player.phys_coordination || 70,
    ment_focus: player.ment_focus || 80,
    ment_combat: player.ment_combat || 80,
    ment_respect: player.ment_respect || 80,
    ment_confiance: player.ment_confiance || 80,
  });

  useEffect(() => {
    setFormData({ ...player });
    setIsEditing(false);
  }, [player]);

  // LOGIQUE XP : 100 XP = +1% (V3.0)
  const applyXP = (type: 'phys' | 'tech' | 'eng', amount: number) => {
    setFormData(prev => ({
      ...prev,
      [`xp_${type}`]: (prev[`xp_${type}` as keyof typeof prev] as number || 0) + amount
    }));
  };

  // LOGIQUE SYNC : Transforme XP en Stats réelles (Level-Up)
  const handleSync = () => {
    setIsSyncing(true);

    const computeNewState = (currentData: any) => {
      let newState = { ...currentData };
      const types: ('phys' | 'tech' | 'eng')[] = ['phys', 'tech', 'eng'];

      types.forEach(t => {
        let xp = (newState[`xp_${t}` as keyof typeof newState] as number) || 0;
        let statKey = `eval_${t === 'eng' ? 'ment' : t}` as keyof typeof newState;
        let currentStat = (newState[statKey] as number) || 70;

        while (xp >= 100) {
          currentStat = Math.min(99, currentStat + 1);
          xp -= 100;
        }
        while (xp < 0 && currentStat > 60) {
          currentStat = Math.max(60, currentStat - 1);
          xp += 100;
        }

        newState = { ...newState, [`xp_${t}`]: xp, [statKey]: currentStat };
      });

      newState.rating = Math.round((newState.eval_phys + newState.eval_tech + newState.eval_ment + (newState.eval_tact || 70)) / 4);
      return newState;
    };

    setTimeout(() => {
      const nextState = computeNewState(formData);
      onUpdate(nextState);
      setFormData(nextState);
      setIsSyncing(false);
    }, 800);
  };

  const handleSaveEvaluation = () => {
    const techAvg = Math.round((formData.tech_jonglage + formData.tech_conduite + formData.tech_passe + formData.tech_frappe) / 4);
    const tactAvg = Math.round((formData.tact_lecture + formData.tact_placement + formData.tact_info + formData.tact_transition) / 4);
    const physAvg = Math.round((formData.phys_vitesse + formData.phys_endurance + formData.phys_puissance + formData.phys_coordination) / 4);
    const mentAvg = Math.round((formData.ment_focus + formData.ment_combat + formData.ment_respect + formData.ment_confiance) / 4);

    const updated = {
      ...formData,
      eval_tech: techAvg, eval_tact: tactAvg, eval_phys: physAvg, eval_ment: mentAvg,
      rating: Math.round((techAvg + tactAvg + physAvg + mentAvg) / 4)
    };
    onUpdate(updated);
    setFormData(updated);
    setShowEvaluation(false);
  };

  const potentialPoints = Math.floor(formData.xp_phys / 100) + Math.floor(formData.xp_tech / 100) + Math.floor(formData.xp_eng / 100);
  const globalXPProgress = ((formData.xp_phys % 100) + (formData.xp_tech % 100) + (formData.xp_eng % 100)) / 3;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-2" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche du joueur ${formData.name}`}
        tabIndex={-1}
        className={`w-full max-w-[360px] h-[94vh] bg-[#1D2027] rounded-[3rem] border-2 transition-all duration-500 overflow-hidden relative flex flex-col font-mono outline-none ${
          isSyncing ? 'animate-soft-pulse border-white/60' : 'border-neon-cyan/40 shadow-xl'
        }`}
      >
        {isSyncing && <div className="absolute inset-0 bg-white opacity-20 z-50 animate-pulse pointer-events-none" />}

        {/* 1. HEADER */}
        <div className="p-6 pb-2 flex justify-between items-start shrink-0">
           <div className="text-left">
              <span className="text-[7px] text-gray-500 uppercase tracking-[0.4em] block mb-1">UNIT_RATING</span>
              <div className="text-6xl font-black text-white leading-none tracking-tighter italic">{formData.rating}</div>
           </div>
           <div className="flex flex-col items-end gap-2 text-right">
              <div className={`px-2 py-0.5 rounded text-[7px] font-black border tracking-[0.2em] ${formData.rating < 65 ? 'border-neon-magenta text-neon-magenta animate-soft-pulse bg-neon-magenta/5' : formData.status === 'Actif' ? 'border-neon-green/40 text-neon-green bg-neon-green/5' : 'border-neon-magenta/40 text-neon-magenta bg-neon-magenta/5 animate-pulse'}`}>
                {formData.rating < 65 ? 'UNIT_CRITICAL' : formData.status === 'Actif' ? 'ONLINE' : 'OFFLINE'}
              </div>
              <button onClick={() => setIsEditing(!isEditing)} aria-label={isEditing ? 'Terminer la modification' : 'Modifier la fiche'} aria-pressed={isEditing} className="p-2 rounded-lg bg-white/5 border border-white/10 text-neon-cyan active:scale-90 transition-all"><Pencil size={16} aria-hidden="true" /></button>
           </div>
        </div>

        {/* 2. BOOSTER ACTIONS */}
        <div className="px-6 grid grid-cols-3 gap-2 py-4 shrink-0">
           <ImpulsionButton label="VITALITY" color="text-neon-orange" icon={<Zap size={18} />} onClick={() => { applyXP('phys', 100); applyXP('eng', 30); }} desc="+1% PHY" />
           <ImpulsionButton label="LOGIC" color="text-neon-cyan" icon={<Brain size={18} />} onClick={() => { applyXP('tech', 100); applyXP('eng', 30); }} desc="+1% TEC" />
           <ImpulsionButton label="SPIRIT" color="text-neon-magenta" icon={<Flame size={18} />} onClick={() => applyXP('eng', 130)} desc="+1% ENG" />
        </div>

        {/* 3. PHOTO & IDENTITY */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 min-h-0 relative">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.05] select-none text-[150px] font-black italic text-white leading-none">{formData.position}</div>
           <div className="w-32 h-32 rounded-[2.5rem] bg-gray-900 overflow-hidden border-2 border-neon-cyan/40 relative z-10 shadow-2xl mb-2">
              <img src={getAvatarUrl(formData.name, 400)} className="w-full h-full object-cover grayscale brightness-110" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
           </div>
           <div className="text-center z-10">
              <div className="text-2xl font-black text-neon-orange uppercase italic mb-1">{formData.position}</div>
              <div className="space-y-1">
                 <GlitchText text={formData.name.toUpperCase()} className="text-2xl font-black text-white italic tracking-tight" />
                 <p className="text-[7px] text-gray-500 font-bold tracking-[0.4em] uppercase">SERIAL: {formData.licence || 'UNKNOWN'}</p>
              </div>
           </div>
        </div>

        {/* 4. STATS PROGRESSION (PENDING STATE) */}
        <div className="px-6 space-y-4 shrink-0 py-4 bg-white/[0.02] border-y border-white/5">
           <StatProgressBar label="VITALITY" value={formData.eval_phys} xp={formData.xp_phys} color="bg-neon-orange" />
           <StatProgressBar label="LOGIC" value={formData.eval_tech} xp={formData.xp_tech} color="bg-neon-cyan" />
           <StatProgressBar label="SPIRIT" value={formData.eval_ment} xp={formData.xp_eng} color="bg-neon-magenta" />
        </div>

        {/* 5. EVOLUTION_TRACKER (SYNC MODULE) */}
        <div
          onClick={() => setShowEvaluation(true)}
          className={`mx-6 mt-4 p-5 rounded-2xl border-2 relative overflow-hidden group cursor-pointer active:scale-95 transition-all shrink-0 ${
            potentialPoints > 0 ? 'bg-neon-cyan/10 border-neon-cyan animate-pulse shadow-md' : 'bg-white/[0.03] border-white/5 opacity-50'
          }`}
        >
           <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                 <Cpu size={14} className={potentialPoints > 0 ? "text-neon-cyan animate-spin" : "text-gray-600"} />
                 <h3 className={`text-[10px] font-black uppercase italic tracking-widest ${potentialPoints > 0 ? 'text-white' : 'text-gray-500'}`}>EVOLUTION_TRACKER</h3>
              </div>
              {potentialPoints > 0 && <span className="text-[8px] font-black text-neon-cyan border border-neon-cyan/40 px-2 py-0.5 rounded bg-[#1D2027] tracking-[0.2em] shadow-sm animate-bounce">SYNC_AVAILABLE</span>}
           </div>
           <div className="flex items-center justify-between gap-4">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-700 ${potentialPoints > 0 ? 'bg-white' : 'bg-neon-cyan'}`} style={{ width: `${globalXPProgress % 100}%` }} />
              </div>
              <span className={`text-[9px] font-black italic ${potentialPoints > 0 ? 'text-neon-cyan' : 'text-gray-600'}`}>
                {potentialPoints > 0 ? `+${potentialPoints} POTENTIAL` : '0 PENDING'}
              </span>
           </div>
        </div>

        {/* 6. FOOTER ACTIONS */}
        <div className="p-6 shrink-0 flex gap-3">
           <button onClick={onClose} aria-label="Fermer" className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-500"><X size={20} aria-hidden="true" /></button>
           <NeonButton variant={potentialPoints > 0 ? "cyan" : "magenta"} className="flex-1 py-4 text-[10px]" onClick={potentialPoints > 0 ? handleSync : () => onMessage(player)}>
             {potentialPoints > 0 ? 'UPLOAD_SYNC_DB' : 'OPEN_COMMS'}
           </NeonButton>
        </div>

        {/* 7. EVALUATION MODAL (INTEGRATED) */}
        {showEvaluation && (
          <div className="absolute inset-0 bg-[#15171C]/98 z-[120] flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto no-scrollbar">
             {activeSubGrid === 'none' ? (
               <div className="space-y-10 pb-20 text-left">
                 <header className="flex justify-between items-center mb-10">
                    <div className="text-left">
                       <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Diagnostic_Pro</h2>
                       <p className="text-[9px] text-neon-cyan font-mono uppercase tracking-[0.4em] mt-2">Unit: {formData.name}</p>
                    </div>
                    <button onClick={() => setShowEvaluation(false)} aria-label="Fermer l'évaluation" className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-colors border border-white/10"><X size={24} strokeWidth={3} aria-hidden="true" /></button>
                 </header>
                 <EvaluationLink label="TECHNIQUE_SYSTEM" desc="Contrôle, Passe, Dribble, Tir" icon={<Zap size={16} />} value={formData.eval_tech} color="cyan" onClick={() => setActiveSubGrid('tech')} />
                 <EvaluationLink label="TACTICAL_LOGIC" desc="Lecture, Placement, Décision" icon={<ShieldCheck size={16} />} value={formData.eval_tact} color="orange" onClick={() => setActiveSubGrid('tact')} />
                 <EvaluationLink label="BIOMETRIC_POWER" desc="Vitesse, Endurance, Force" icon={<Activity size={16} />} value={formData.eval_phys} color="green" onClick={() => setActiveSubGrid('phys')} />
                 <EvaluationLink label="STABILITY_MENTAL" desc="Concentration, Stress, Respect" icon={<Brain size={16} />} value={formData.eval_ment} color="magenta" onClick={() => setActiveSubGrid('ment')} />
                 <NeonButton variant="cyan" className="w-full py-6 text-sm" onClick={handleSaveEvaluation}>SAVE_ANALYSIS_&_SYNC_DB</NeonButton>
               </div>
             ) : (
               <div className="animate-in slide-in-from-right duration-300">
                  <header className="flex items-center gap-4 mb-10 text-left">
                     <button onClick={() => setActiveSubGrid('none')} aria-label="Retour" className="p-3 bg-white/5 rounded-xl text-neon-cyan border border-white/10"><ChevronLeft size={24} aria-hidden="true" /></button>
                     <div className="text-left"><h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{activeSubGrid.toUpperCase()} Grid</h2></div>
                  </header>
                  <div className="space-y-10">
                     {activeSubGrid === 'tech' && <SubGridCriteria data={formData} onChange={setFormData} prefix="tech" criteria={[{k:'jonglage',l:'Jonglerie'},{k:'conduite',l:'Conduite'},{k:'passe',l:'Passes'},{k:'frappe',l:'Frappe'}]} color="cyan" />}
                     {activeSubGrid === 'tact' && <SubGridCriteria data={formData} onChange={setFormData} prefix="tact" criteria={[{k:'lecture',l:'Lecture'},{k:'placement',l:'Placement'},{k:'info',l:'Infos'},{k:'transition',l:'Transitions'}]} color="orange" />}
                     {activeSubGrid === 'phys' && <SubGridCriteria data={formData} onChange={setFormData} prefix="phys" criteria={[{k:'vitesse',l:'Vitesse'},{k:'endurance',l:'Endurance'},{k:'puissance',l:'Puissance'},{k:'coordination',l:'Coordination'}]} color="green" />}
                     {activeSubGrid === 'ment' && <SubGridCriteria data={formData} onChange={setFormData} prefix="ment" criteria={[{k:'focus',l:'Focus'},{k:'combat',l:'Combat'},{k:'respect',l:'Respect'},{k:'confiance',l:'Confiance'}]} color="magenta" />}
                     <NeonButton variant="cyan" className="w-full py-6 text-sm" onClick={() => setActiveSubGrid('none')}>VALIDATE_BLOCK</NeonButton>
                  </div>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubGridCriteria({ data, onChange, prefix, criteria, color }: any) {
  return criteria.map((c: any) => (
    <EvaluationSlider key={c.k} label={c.l} value={data[`${prefix}_${c.k}`]} onChange={(val: number) => onChange({...data, [`${prefix}_${c.k}`]: val})} color={color} />
  ));
}

function EvaluationLink({ label, desc, icon, value, color, onClick }: any) {
  const barColor = color === 'cyan' ? 'bg-neon-cyan' : color === 'orange' ? 'bg-neon-orange' : color === 'green' ? 'bg-neon-green' : 'bg-neon-magenta';
  return (
    <div onClick={onClick} className="space-y-4 cursor-pointer group active:scale-98 transition-all">
       <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-neon-cyan/50">{icon}</div>
          <div className="flex-1"><h4 className="text-[11px] font-black text-white uppercase italic">{label}</h4><p className="text-[8px] text-gray-600 font-bold uppercase">{desc}</p></div>
          <div className="text-xl font-black text-white font-mono">{value}%</div>
       </div>
       <div className="relative h-1.5 flex items-center"><div className="absolute w-full h-1 bg-white/5 rounded-full" /><div className={`absolute h-1 rounded-full ${barColor} shadow-sm`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function EvaluationSlider({ label, value, onChange, color }: any) {
  const barColor = color === 'cyan' ? 'bg-neon-cyan' : color === 'orange' ? 'bg-neon-orange' : color === 'green' ? 'bg-neon-green' : 'bg-neon-magenta';
  return (
    <div className="space-y-4 text-left">
       <div className="flex justify-between items-center"><h4 className="text-[11px] font-black text-white uppercase italic">{label}</h4><div className="text-xl font-black text-white font-mono">{value}%</div></div>
       <div className="relative h-2 flex items-center">
          <div className="absolute w-full h-1 bg-white/5 rounded-full" />
          <div className={`absolute h-1 rounded-full ${barColor} shadow-sm`} style={{ width: `${value}%` }} />
          <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 w-full h-8 opacity-0 cursor-pointer z-10" />
       </div>
    </div>
  );
}

function StatProgressBar({ label, value, xp, color }: any) {
  const pendingXP = xp % 100;
  return (
    <div className="space-y-1.5 relative group">
       <div className="flex justify-between items-end px-1">
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">{label}</span>
          <div className="flex items-center gap-2">
             {xp >= 100 && <span className="text-[7px] text-neon-cyan font-black animate-pulse">LEVEL_READY</span>}
             <span className="text-[11px] font-black text-white">{value}%</span>
          </div>
       </div>
       <div className="h-1.5 w-full bg-white/5 rounded-full relative overflow-hidden flex items-center">
          <div className={`h-full ${color} shadow-sm transition-all duration-1000`} style={{ width: `${value}%` }} />
          {/* Subtle pending XP indicator */}
          <div className={`h-full opacity-40 animate-pulse bg-white`} style={{ width: `${pendingXP / 2}%` }} />
       </div>
    </div>
  );
}

function ImpulsionButton({ label, icon, color, onClick, desc }: any) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-2 bg-white/5 py-3 rounded-2xl border border-white/5 hover:border-white/20 active:scale-95 transition-all group relative overflow-hidden">
       <div className={`absolute inset-0 opacity-0 group-active:opacity-10 transition-opacity bg-white`} />
       <span className={`text-xl ${color} group-hover:scale-110 transition-transform`}>{icon}</span>
       <div className="flex flex-col items-center"><span className={`text-[7px] font-black text-white tracking-widest uppercase`}>{label}</span><span className={`text-[6px] font-bold ${color} uppercase mt-0.5`}>{desc}</span></div>
    </button>
  );
}
