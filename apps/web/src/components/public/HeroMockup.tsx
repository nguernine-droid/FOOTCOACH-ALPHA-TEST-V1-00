"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, MapPin, Users } from "lucide-react";
import { AppPreview } from "@/components/public/AppPreview";

/** Inclinaison au repos de la dalle */
const BASE_Y = -9;
const BASE_X = 5;
/** Amplitude de la parallaxe, en degrés, de part et d'autre du repos */
const SWING = 4;

/**
 * Le produit, en volume.
 *
 * La dalle est inclinée au repos et suit légèrement la souris sur un grand
 * écran. Trois cartes satellites en dépassent, chacune à sa propre profondeur :
 * ce sont elles qui donnent l'épaisseur, parce qu'elles portent leur ombre
 * propre et se détachent donc de la dalle au lieu d'y être peintes.
 *
 * ── Ce qui est désactivé, et pourquoi ───────────────────────────────────
 * La parallaxe ne s'installe que si le pointeur est FIN et l'écran large. Sur
 * un téléphone, il n'y a pas de survol — la feuille de style remet d'ailleurs
 * la dalle à plat sous 768 px, et un `transform` posé en ligne par ce script
 * l'emporterait sur elle. On ne l'écrit donc jamais dans ce cas.
 */
export function HeroMockup() {
  const scene = useRef<HTMLDivElement>(null);
  const slab = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sceneNode = scene.current;
    const slabNode = slab.current;
    if (!sceneNode || !slabNode) return;

    const pointerFine = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!pointerFine.matches || calm.matches) return;

    let frame = 0;
    slabNode.style.willChange = "transform";

    const onMove = (event: MouseEvent) => {
      const box = sceneNode.getBoundingClientRect();
      // Position du curseur ramenée à [-1, 1] depuis le centre de la scène
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        slabNode.style.transform =
          `rotateY(${BASE_Y + x * SWING * 2}deg) rotateX(${BASE_X - y * SWING * 2}deg)`;
      });
    };

    // Retour au repos : on retire le style en ligne plutôt que de réécrire les
    // valeurs de base, pour que la feuille de style redevienne la seule source
    // de vérité — y compris si l'on franchit le seuil mobile entre-temps.
    const onLeave = () => {
      cancelAnimationFrame(frame);
      slabNode.style.transform = "";
    };

    sceneNode.addEventListener("mousemove", onMove);
    sceneNode.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      sceneNode.removeEventListener("mousemove", onMove);
      sceneNode.removeEventListener("mouseleave", onLeave);
      slabNode.style.willChange = "";
      slabNode.style.transform = "";
    };
  }, []);

  return (
    // L'ensemble est une illustration : ce qu'il montre est dit en toutes
    // lettres par le titre et le paragraphe à côté.
    <div ref={scene} className="v-scene relative mx-auto w-full max-w-[320px]" aria-hidden>
      {/* Le halo, DERRIÈRE la dalle : c'est la seule source de couleur de tout
          le haut de page, avec le bouton. */}
      <div className="v-halo -inset-16" />

      <div ref={slab} className="v-slab relative">
        <AppPreview />

        <Satellite className="-top-5 -right-8 md:-right-14" depth={70}>
          <CheckCircle2 size={13} className="text-success shrink-0" />
          Match confirmé
        </Satellite>

        <Satellite className="top-1/3 -left-10 md:-left-16" depth={95}>
          <MapPin size={13} className="text-accent shrink-0" />7 km
        </Satellite>

        <Satellite className="-bottom-6 -right-4 md:-right-10 hidden min-[420px]:flex" depth={50}>
          <Users size={13} className="text-accent shrink-0" />3 équipes libres dimanche
        </Satellite>
      </div>
    </div>
  );
}

/**
 * Une carte détachée. `translateZ` la sort du plan de la dalle — d'où le
 * `preserve-3d` porté par `.v-slab`, sans lequel elle serait simplement
 * aplatie dessus.
 */
function Satellite({
  children,
  className,
  depth,
}: {
  children: React.ReactNode;
  className?: string;
  depth: number;
}) {
  return (
    <span
      className={`v-satellite flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-primary whitespace-nowrap ${className ?? ""}`}
      style={{ transform: `translateZ(${depth}px)` }}
    >
      {children}
    </span>
  );
}
