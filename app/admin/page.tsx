'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type Match = {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  odd_home: number;
  odd_draw: number;
  odd_away: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  pick: string;
  predicted_home_score: number;
  predicted_away_score: number;
};

type ResultInput = {
  home_score: string;
  away_score: string;
};

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [results, setResults] = useState<Record<string, ResultInput>>({});
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setMessage('');
    setSuccess('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = '/login';
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      setMessage(`Erro a carregar perfil: ${profileError.message}`);
      return;
    }

    if (!profile || profile.role !== 'admin') {
      setMessage('Não tens permissões de admin.');
      return;
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true });

    if (error) {
      setMessage(`Erro a carregar jogos: ${error.message}`);
      return;
    }

    const typedMatches = (data || []) as Match[];

    setMatches(typedMatches);

    const initialResults: Record<string, ResultInput> = {};

    typedMatches.forEach((match) => {
      initialResults[match.id] = {
        home_score: match.home_score === null ? '' : String(match.home_score),
        away_score: match.away_score === null ? '' : String(match.away_score),
      };
    });

    setResults(initialResults);
  }

  function updateResult(matchId: string, field: keyof ResultInput, value: string) {
    setResults((prev) => ({
      ...prev,
      [matchId]: {
        home_score: prev[matchId]?.home_score || '',
        away_score: prev[matchId]?.away_score || '',
        [field]: value,
      },
    }));
  }

  function getActualPick(homeScore: number, awayScore: number) {
    if (homeScore > awayScore) return 'home';
    if (homeScore < awayScore) return 'away';
    return 'draw';
  }

  function getOdd(match: Match, pick: string) {
    if (pick === 'home') return Number(match.odd_home);
    if (pick === 'draw') return Number(match.odd_draw);
    if (pick === 'away') return Number(match.odd_away);
    return 0;
  }

  async function submitResultAndCalculate(match: Match) {
    setMessage('');
    setSuccess('');

    const result = results[match.id];

    if (!result || result.home_score === '' || result.away_score === '') {
      setMessage(
        'Erro a submeter resultado: preenche os golos da casa e os golos de fora.'
      );
      return;
    }

    const homeScore = Number(result.home_score);
    const awayScore = Number(result.away_score);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setMessage('Erro a submeter resultado: os golos têm de ser números.');
      return;
    }

    if (homeScore < 0 || awayScore < 0) {
      setMessage('Erro a submeter resultado: os golos não podem ser negativos.');
      return;
    }

    const { error: matchError } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'final',
      })
      .eq('id', match.id);

    if (matchError) {
      setMessage(`Erro a guardar resultado: ${matchError.message}`);
      return;
    }

    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id);

    if (predictionsError) {
      setMessage(
        `Resultado guardado, mas houve erro a carregar palpites: ${predictionsError.message}`
      );
      return;
    }

    const typedPredictions = (predictions || []) as Prediction[];
    const actualPick = getActualPick(homeScore, awayScore);

    const updates = typedPredictions.map((prediction) => {
      let points = 0;

      const correctPick = prediction.pick === actualPick;

      if (correctPick) {
        points = getOdd(match, prediction.pick);

        const exactScore =
          prediction.predicted_home_score === homeScore &&
          prediction.predicted_away_score === awayScore;

        if (exactScore) {
          points = points * 2;
        }
      }

      return supabase
        .from('predictions')
        .update({ points })
        .eq('id', prediction.id);
    });

    const updateResults = await Promise.all(updates);

    const failedUpdate = updateResults.find((res) => res.error);

    if (failedUpdate?.error) {
      setMessage(
        `Resultado guardado, mas houve erro a calcular pontos: ${failedUpdate.error.message}`
      );
      return;
    }

    setSuccess(
      `Resultado submetido com sucesso. Pontuações calculadas para ${match.home_team} vs ${match.away_team}.`
    );

    await load();
  }

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Administração</h1>

        <p className="page-subtitle">
          Submete o resultado final de cada jogo. Os pontos desse jogo são
          calculados automaticamente.
        </p>

        {message && <div className="message">{message}</div>}
        {success && <div className="success-message">{success}</div>}

        {matches.map((match) => (
          <div className="card" key={match.id}>
            <h3>
              {match.match_date} — {match.home_team} vs {match.away_team}
            </h3>

            <p className="card-info">
              Odds: Casa {Number(match.odd_home).toFixed(2)} | Empate{' '}
              {Number(match.odd_draw).toFixed(2)} | Fora{' '}
              {Number(match.odd_away).toFixed(2)}
            </p>

            <p className="card-info">
              Estado:{' '}
              <strong>
                {match.status === 'final' ? 'Finalizado' : 'Aberto'}
              </strong>
            </p>

            {match.home_score !== null && match.away_score !== null && (
              <p className="card-info">
                Resultado atual:{' '}
                <strong>
                  {match.home_score} - {match.away_score}
                </strong>
              </p>
            )}

            <div className="admin-result-row">
              <div className="score-inputs">
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Casa"
                  value={results[match.id]?.home_score || ''}
                  onChange={(e) =>
                    updateResult(match.id, 'home_score', e.target.value)
                  }
                />

                <span>-</span>

                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Fora"
                  value={results[match.id]?.away_score || ''}
                  onChange={(e) =>
                    updateResult(match.id, 'away_score', e.target.value)
                  }
                />
              </div>

              <button
                className="button"
                onClick={() => submitResultAndCalculate(match)}
              >
                {match.status === 'final'
                  ? 'Atualizar resultado e recalcular pontos'
                  : 'Submeter resultado e calcular pontos'}
              </button>
            </div>
          </div>
        ))}

        {matches.length === 0 && (
          <div className="card">Ainda não existem jogos importados.</div>
        )}
      </main>
    </div>
  );
}