'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type LeaderboardRow = {
  user_id: string;
  name: string;
  role: string;
  total_points: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
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

    const { data, error } = await supabase.rpc('get_leaderboard');

    if (error) {
      setMessage(`Erro a carregar classificação: ${error.message}`);
      return;
    }

    setRows((data || []) as LeaderboardRow[]);
  }

  function getRowClass(index: number, total: number) {
    if (total === 0) return '';

    const position = index + 1;

    if (total % 2 === 1) {
      const middle = Math.ceil(total / 2);

      if (position < middle) return 'leaderboard-top';
      if (position === middle) return 'leaderboard-middle';
      return 'leaderboard-bottom';
    }

    if (position <= total / 2) return 'leaderboard-top';

    return 'leaderboard-bottom';
  }

  function getMedal(index: number) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  }

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Tabelas Classificativas</h1>

        <p className="page-subtitle">
          Classificação geral dos jogadores.
        </p>

        {message && <div className="message">{message}</div>}

        <div className="card">
          <div className="table-wrapper leaderboard-wrapper">
            <table className="leaderboard-table">
              <colgroup>
                <col className="leaderboard-col-position" />
                <col className="leaderboard-col-player" />
                <col className="leaderboard-col-points" />
              </colgroup>

              <thead>
                <tr>
                  <th>#</th>
                  <th>Jogador</th>
                  <th>Pontos</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.user_id}
                    className={getRowClass(index, rows.length)}
                  >
                    <td>
                      <span className="position-cell leaderboard-position-cell">
                        <span>{index + 1}</span>
                        {getMedal(index) && (
                          <span className="medal">{getMedal(index)}</span>
                        )}
                      </span>
                    </td>

                    <td>
                      <strong className="leaderboard-player-name">
                        {row.name}
                      </strong>
                    </td>

                    <td>
                      <strong className="leaderboard-points">
                        {Number(row.total_points || 0).toFixed(2)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="card-info">Ainda não existem jogadores.</p>
          )}
        </div>
      </main>
    </div>
  );
}
