'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type Row = {
  user_id: string;
  name: string;
  role: string;
  total_points: number;
  exact_results: number;
  correct_picks: number;
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
          Classificação geral. Em caso de empate, conta primeiro quem tem mais resultados exatos.
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
                <th>Resultados exatos</th>
                <th>1X2 certos</th>
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
                  <td>{Number(row.exact_results || 0)}</td>
                  <td>{Number(row.correct_picks || 0)}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>Ainda não há participantes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h3>Critérios de desempate</h3>
          <p className="card-info">1.º Mais pontos totais</p>
          <p className="card-info">2.º Mais resultados exatos</p>
          <p className="card-info">3.º Mais palpites 1X2 certos</p>
          <p className="card-info">4.º Ordem alfabética</p>
        </div>

        <div className="card">
          <h3>Regra do jantar</h3>
          <p className="card-info">
            Quem ficar na metade de baixo paga o jantar à metade de cima.
          </p>
          <p className="card-info">
            Se houver um jogador a amarelo, esse jogador paga o seu próprio jantar.
          </p>
        </div>
      </main>
    </div>
  );
}