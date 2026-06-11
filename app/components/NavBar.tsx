'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Profile = {
  name: string;
  role: string;
};

export default function NavBar() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', session.user.id)
      .single();

    if (data) setProfile(data);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/player" className="brand">
          MundialPalpite
        </Link>

        <nav className="nav-links">
          <Link className="nav-link" href="/player">
            Jogos
          </Link>

          <Link className="nav-link" href="/bets">
            Apostas
          </Link>

          <Link className="nav-link" href="/leaderboard">
            Classificação
          </Link>

          <Link className="nav-link" href="/statistics">
            Estatísticas
          </Link>

          <Link className="nav-link" href="/rules">
            Regras
          </Link>

          {profile?.role === 'admin' && (
            <Link className="nav-link" href="/admin">
              Administração
            </Link>
          )}

          {profile && (
            <span className="nav-user">
              {profile.name} · {profile.role === 'admin' ? 'Admin' : 'Jogador'}
            </span>
          )}

          <button className="button danger" onClick={logout}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}