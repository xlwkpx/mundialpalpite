'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type Row = {
  user_id: string;
  name: string;
  role: string;
  total_points: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
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
      setMessage(`Erro a carregar tabela: ${error.message}`);
      return;
    }

    setRows((data || []) as Row[]);
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

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Tabelas Classificativas</h1>

        <p className="page-subtitle">
          Classificação geral atualizada com todos os participantes.
        </p>

        {message && <div className="message">{message}</div>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Posição</th>
                <th>Jogador</th>
                <th>Tipo</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.user_id}
                  className={getRowClass(index, rows.length)}
                >
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td>
                    <span className={`badge ${row.role}`}>
                      {row.role === 'admin' ? 'Admin' : 'Jogador'}
                    </span>
                  </td>
                  <td>{Number(row.total_points || 0).toFixed(2)}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4}>Ainda não há participantes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}