'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type PlayerStatistic = {
  profile_id: string;
  player_name: string;
  player_role: string;
  games_bet: number;
  finished_games_bet: number;
  correct_picks: number;
  accuracy_percent: number;
  max_round_points: number;
  highest_odd_hit: number;
};

export default function StatisticsPage() {
  const [rows, setRows] = useState<PlayerStatistic[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setMessage('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = '/login';
      return;
    }

    const { data, error } = await supabase.rpc('get_player_statistics');

    if (error) {
      setMessage(`Erro a carregar estatísticas: ${error.message}`);
      return;
    }

    setRows((data || []) as PlayerStatistic[]);
  }

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Estatísticas</h1>

        <p className="page-subtitle">
          Estatísticas gerais dos jogadores com base nos jogos já finalizados.
        </p>

        {message && <div className="message">{message}</div>}

        <div className="stats-grid">
          {rows.map((row, index) => (
            <div className="stat-player-card" key={row.profile_id}>
              <div className="stat-card-header">
                <div>
                  <span className="stat-position">#{index + 1}</span>
                  <h2>{row.player_name}</h2>
                </div>

                <span className="status-pill">
                  {row.player_role === 'admin' ? 'Admin' : 'Jogador'}
                </span>
              </div>

              <div className="stat-metrics-grid">
                <div className="stat-metric">
                  <span>Jogos apostados</span>
                  <strong>{row.games_bet}</strong>
                </div>

                <div className="stat-metric">
                  <span>Jogos já finalizados</span>
                  <strong>{row.finished_games_bet}</strong>
                </div>

                <div className="stat-metric">
                  <span>Acertos</span>
                  <strong>{row.correct_picks}</strong>
                </div>

                <div className="stat-metric">
                  <span>Percentagem de acerto</span>
                  <strong>{Number(row.accuracy_percent || 0).toFixed(2)}%</strong>
                </div>

                <div className="stat-metric">
                  <span>Maior pontuação numa jornada</span>
                  <strong>{Number(row.max_round_points || 0).toFixed(2)}</strong>
                </div>

                <div className="stat-metric">
                  <span>Odd mais alta acertada</span>
                  <strong>{Number(row.highest_odd_hit || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <div className="card">
            Ainda não existem estatísticas para mostrar.
          </div>
        )}
      </main>
    </div>
  );
}