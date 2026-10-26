"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { es } from "@/i18n/es";

const SHOTS = [
  { src: "/app/inicio.png", label: es.preview.shots.home },
  { src: "/app/lugar.png", label: es.preview.shots.place },
  { src: "/app/mapa.png", label: es.preview.shots.map },
] as const;

const EVERY_MS = 4500;

/** The app on a drawn phone. It moves on by itself, can be paused, and stays still for reduced motion. */
export function AppPreview() {
  const t = es.preview;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % SHOTS.length),
      EVERY_MS,
    );
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div className="app-preview">
      <div className="phone">
        {SHOTS.map((shot, i) => (
          <Image
            key={shot.src}
            src={shot.src}
            alt={shot.label}
            width={603}
            height={1311}
            sizes="(min-width: 46rem) 280px, 70vw"
            className="phone-shot"
            aria-hidden={i !== index}
            data-active={i === index}
          />
        ))}
      </div>
      <div className="preview-controls">
        <div role="group" aria-label={t.label} className="dots">
          {SHOTS.map((shot, i) => (
            <button
              key={shot.src}
              type="button"
              aria-label={shot.label}
              aria-pressed={i === index}
              onClick={() => {
                setIndex(i);
                setPaused(true);
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={paused ? t.play : t.pause}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? (
            <Play size={18} aria-hidden="true" />
          ) : (
            <Pause size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      <p className="muted">{SHOTS[index]?.label}</p>
    </div>
  );
}
