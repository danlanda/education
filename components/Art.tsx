'use client';
import { LOGO, keeperSVG } from '@/lib/game/art.js';

export function Logo({ size = 64 }: { size?: number }) {
  return <div className="a-logo" style={{ width: size, height: size, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: LOGO }} />;
}
export function KeeperHead({ equipped }: { equipped?: Record<string, string> }) {
  return <div className="a-avatar" dangerouslySetInnerHTML={{ __html: keeperSVG(equipped || {}, { head: true }) }} />;
}
