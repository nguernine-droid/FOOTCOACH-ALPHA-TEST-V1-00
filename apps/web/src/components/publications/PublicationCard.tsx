"use client";

import Link from "next/link";
import type { PublicationDto } from "@footcoach/shared";
import { Avatar } from "@/components/Avatar";
import { timeAgo, useNow } from "@/lib/time";

/** Un billet du fil de publications — écran « Publications » */
export function PublicationCard({ publication }: { publication: PublicationDto }) {
  const now = useNow(60000);

  return (
    <Link
      href={`/coach/publications/${publication.id}`}
      className="card block p-5 space-y-3 transition hover:border-blue/40 active:scale-[0.995]"
    >
      <div className="flex items-center gap-3">
        <Avatar
          firstName={publication.author.firstName}
          lastName={publication.author.lastName}
          avatarUrl={publication.author.avatarUrl}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">
            {publication.author.firstName} {publication.author.lastName}
          </p>
          <p className="text-[11px] text-ink-soft">{timeAgo(publication.createdAt, now)}</p>
        </div>
        {publication.isMine && <span className="chip bg-accent-surface text-accent shrink-0">Vous</span>}
      </div>
      <div className="space-y-1">
        <p className="display text-lg leading-tight line-clamp-2">{publication.title}</p>
        <p className="text-sm text-ink-soft line-clamp-3 whitespace-pre-line">{publication.body}</p>
      </div>
    </Link>
  );
}
