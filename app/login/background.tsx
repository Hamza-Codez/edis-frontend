'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, Search, Database, BookOpen, 
  File, Folder, Layers, PieChart, BrainCircuit, Files,
  MessageSquare, LayoutDashboard, Settings, Users,
  Globe, Shield, Key, Zap
} from 'lucide-react';

const ICONS = [
  FileText, Search, Database, BookOpen, File, Folder, Layers, 
  PieChart, BrainCircuit, Files, MessageSquare, LayoutDashboard, 
  Settings, Users, Globe, Shield, Key, Zap
];

// Deterministic random number generator to avoid hydration mismatches if ever SSR'd,
// but we'll also use a mounted check just in case.
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function LoginBackground() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const rand = mulberry32(12345); // Fixed seed for consistent pattern
  const items = Array.from({ length: 40 }).map((_, i) => {
    const Icon = ICONS[Math.floor(rand() * ICONS.length)];
    const x = rand() * 100;
    const y = rand() * 100;
    const size = 24 + rand() * 64; // sizes between 24 and 88
    const opacity = 4 + rand() * 8; // opacity between 4% and 12%
    const rotation = -45 + rand() * 90;
    
    return (
      <div 
        key={i} 
        className="absolute text-accent pointer-events-none"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          opacity: opacity / 100,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        <Icon size={size} strokeWidth={1.5} />
      </div>
    );
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items}
    </div>
  );
}
