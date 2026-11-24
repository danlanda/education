'use client';
import { LOGO } from '@/lib/game/art.js';
import { keeperSVG } from '@/lib/game/avatar.js';

export function Logo({ size = 64 }: { size?: number }) {
  return <div className="a-logo" style={{ width: size, height: size, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: LOGO }} />;
}
export function KeeperHead({ equipped, look }: { equipped?: Record<string, string>; look?: Record<string, unknown> }) {
  return <div className="a-avatar" dangerouslySetInnerHTML={{ __html: keeperSVG(equipped || {}, { head: true, look }) }} />;
}
