'use client';

import { useEffect, useMemo, useState } from 'react';
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
  deadline: string;
};

type PredictionInput = {
  pick: string;
  predicted_home_score: string;
  predicted_away_score: string;
};

export default function PlayerPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, PredictionInput>>({});
  const [activeDeadline, setActiveDeadline] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

    setUserId(session.user.id);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .gt('deadline', now)
      .order('deadline', { ascending: true })
      .order('match_date', { ascending: true });

    if (error) {
      setMessage(`Erro a carregar jogos: ${error.message}`);
      return;
    }

    const upcomingMatches = (data || []) as Match[];

    if (upcomingMatches.length === 0) {
      setMatches([]);
      setActiveDeadline(null);
      setAlreadySubmitted(false);
      setIsEditing(false);
      return;
    }

    const nextDeadline = upcomingMatches[0].deadline;
    setActiveDeadline(nextDeadline);

    const nextDeadlineTime = new Date(nextDeadline).getTime();

    const matchesForNextDeadline = upcomingMatches.filter((match) => {
      return new Date(match.deadline).getTime() === nextDeadlineTime;
    });

    setMatches(matchesForNextDeadline);

    const matchIds = matchesForNextDeadline.map((match) => match.id);

    if (matchIds.length === 0) {
      setPredictions({});
      setAlreadySubmitted(false);
      setIsEditing(false);
      return;
    }

    const { data: existingPredictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('match_id, pick, predicted_home_score, predicted_away_score')
      .eq('user_id', session.user.id)
      .in('match_id', matchIds);

    if (predictionsError) {
      setMessage(`Erro a carregar palpites: ${predictionsError.message}`);
      return;
    }

    const existing: Record<string, PredictionInput> = {};

    existingPredictions?.forEach((p) => {
      existing[p.match_id] = {
        pick: p.pick,
        predicted_home_score: String(p.predicted_home_score),
        predicted_away_score: String(p.predicted_away_score),
      };
    });

    setPredictions(existing);

    const submittedAllMatches = matchIds.every((matchId) => Boolean(existing[matchId]));

    setAlreadySubmitted(submittedAllMatches);
    setIsEditing(!submittedAllMatches);
  }

  function updatePrediction(matchId: string, field: keyof PredictionInput, value: string) {
    if (alreadySubmitted && !isEditing) return;

    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        pick: prev[matchId]?.pick || '',
        predicted_home_score: prev[matchId]?.predicted_home_score || '',
        predicted_away_score: prev[matchId]?.predicted_away_score || '',
        [field]: value,
      },
    }));
  }

  function getOdd(match: Match, pick?: string) {
    if (pick === 'home') return Number(match.odd_home);
    if (pick === 'draw') return Number(match.odd_draw);
    if (pick === 'away') return Number(match.odd_away);
    return 0;
  }

  const totals = useMemo(() => {
    let normalTotal = 0;
    let exactTotal = 0;

    matches.forEach((match) => {
      const pick = predictions[match.id]?.pick;
      const odd = getOdd(match, pick);

      normalTotal += odd;

      if (odd > 0) {
        exactTotal += odd * 2;
      }
    });

    return {
      normalTotal,
      exactTotal,
    };
  }, [matches, predictions]);

  async function submitPredictions() {
    setMessage('');
    setSuccess('');

    if (!userId) return;

    if (matches.length === 0) {
      setMessage('Não há jogos abertos.');
      return;
    }

    if (alreadySubmitted && !isEditing) {
      setMessage('Já submeteste os palpites desta jornada. Carrega em “Alterar palpites de hoje” para modificar.');
      return;
    }

    for (const match of matches) {
      const p = predictions[match.id];

      if (
        !p ||
        !p.pick ||
        p.predicted_home_score === '' ||
        p.predicted_away_score === ''
      ) {
        setMessage('Erro a submeter: tens de preencher todos os jogos antes de submeter.');
        return;
      }
    }

    const rows = matches.map((match) => {
      const p = predictions[match.id];

      return {
        user_id: userId,
        match_id: match.id,
        pick: p.pick,
        predicted_home_score: Number(p.predicted_home_score),
        predicted_away_score: Number(p.predicted_away_score),
      };
    });

    const { error } = await supabase
      .from('predictions')
      .upsert(rows, { onConflict: 'user_id,match_id' });

    if (error) {
      setMessage(`Erro a submeter palpites: ${error.message}`);
      return;
    }

    setSuccess('Palpites submetidos com sucesso.');
    setAlreadySubmitted(true);
    setIsEditing(false);
  }

  function startEditing() {
    setMessage('');
    setSuccess('');
    setIsEditing(true);
  }

  const fieldsDisabled = alreadySubmitted && !isEditing;

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Jogos para adivinhar hoje</h1>

        <p className="page-subtitle">
          Só aparecem os jogos da próxima ronda aberta. Tens de preencher todos antes do prazo.
        </p>

        {activeDeadline && (
          <div className="card">
            <strong>Prazo desta ronda:</strong>{' '}
            {new Date(activeDeadline).toLocaleString('pt-PT')}
          </div>
        )}

        {alreadySubmitted && !isEditing && (
          <div className="prediction-status">
            Já submeteste os palpites desta jornada.

            <div className="notice-actions">
              <button className="button secondary" onClick={startEditing}>
                Alterar palpites de hoje
              </button>
            </div>
          </div>
        )}

        {alreadySubmitted && isEditing && (
          <div className="message">
            Estás a alterar os palpites desta jornada. Tens de voltar a submeter para guardar.
          </div>
        )}

        {matches.length > 0 && (
          <div className="round-total">
            <div>Total potencial da jornada</div>
            <p>
              Se acertares os vencedores/empates:{' '}
              <strong>{totals.normalTotal.toFixed(2)} pts</strong>
            </p>
            <p>
              Se acertares também todos os resultados exatos:{' '}
              <strong>{totals.exactTotal.toFixed(2)} pts</strong>
            </p>
          </div>
        )}

        {matches.length === 0 && (
          <div className="card">
            Não há jogos abertos para palpitar neste momento.
          </div>
        )}

        {matches.map((match) => {
          const selectedPick = predictions[match.id]?.pick;
          const selectedOdd = getOdd(match, selectedPick);
          const exactOdd = selectedOdd * 2;

          return (
            <div
              className={`card ${fieldsDisabled ? 'disabled-card' : ''}`}
              key={match.id}
            >
              <h3>
                {match.home_team} vs {match.away_team}
              </h3>

              <p className="card-info">Data do jogo: {match.match_date}</p>

              <p className="card-info">
                Odds: Casa {Number(match.odd_home).toFixed(2)} | Empate{' '}
                {Number(match.odd_draw).toFixed(2)} | Fora{' '}
                {Number(match.odd_away).toFixed(2)}
              </p>

              <div className="match-actions">
                <div>
                  <label>Palpite</label>
                  <select
                    className="select"
                    disabled={fieldsDisabled}
                    value={predictions[match.id]?.pick || ''}
                    onChange={(e) => updatePrediction(match.id, 'pick', e.target.value)}
                  >
                    <option value="">Escolher</option>
                    <option value="home">Vitória Casa</option>
                    <option value="draw">Empate</option>
                    <option value="away">Vitória Visitante</option>
                  </select>
                </div>

                <div>
                  <label>Golos casa</label>
                  <input
                    className="input"
                    disabled={fieldsDisabled}
                    type="number"
                    min="0"
                    value={predictions[match.id]?.predicted_home_score || ''}
                    onChange={(e) =>
                      updatePrediction(match.id, 'predicted_home_score', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Golos fora</label>
                  <input
                    className="input"
                    disabled={fieldsDisabled}
                    type="number"
                    min="0"
                    value={predictions[match.id]?.predicted_away_score || ''}
                    onChange={(e) =>
                      updatePrediction(match.id, 'predicted_away_score', e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="odds-box">
                {selectedOdd > 0 ? (
                  <>
                    <div>Estás a jogar para:</div>
                    <div className="odds-line">
                      <span className="odd-pill">
                        Odd: {selectedOdd.toFixed(2)}
                      </span>
                      <span className="odd-pill exact">
                        Odd com resultado correto: {exactOdd.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div>Escolhe um palpite para veres a odd.</div>
                )}
              </div>
            </div>
          );
        })}

        {matches.length > 0 && (!alreadySubmitted || isEditing) && (
          <button className="button" onClick={submitPredictions}>
            {alreadySubmitted ? 'Guardar alterações' : 'Submeter palpites desta ronda'}
          </button>
        )}

        {message && <div className="message">{message}</div>}
        {success && <div className="success-message">{success}</div>}
      </main>
    </div>
  );
}