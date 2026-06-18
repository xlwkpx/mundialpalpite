'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type Match = {
  id: string;
  match_date: string;
  kickoff_at: string | null;
  home_team: string;
  away_team: string;
  odd_home: number;
  odd_draw: number;
  odd_away: number;
  deadline: string;
};

type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  pick: string;
  predicted_home_score: number;
  predicted_away_score: number;
  submitted_at: string | null;
};

type PredictionInput = {
  pick: string;
  predicted_home_score: string;
  predicted_away_score: string;
};

function formatPortugalDateTime(value: string | null) {
  if (!value) return 'Hora por definir';

  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatPortugalTime(value: string | null) {
  if (!value) return 'Hora por definir';

  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCountdown(milliseconds: number) {
  if (milliseconds <= 0) {
    return '00:00:00';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function PlayerPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, PredictionInput>>({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
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

    const now = new Date().toISOString();

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(
        'id, match_date, kickoff_at, home_team, away_team, odd_home, odd_draw, odd_away, deadline'
      )
      .gt('deadline', now)
      .order('deadline', { ascending: true })
      .order('match_date', { ascending: true })
      .order('kickoff_at', { ascending: true });

    if (matchesError) {
      setMessage(`Erro a carregar jogos: ${matchesError.message}`);
      return;
    }

    const upcomingMatches = (matchesData || []) as Match[];

    if (upcomingMatches.length === 0) {
      setMatches([]);
      setPredictions({});
      setAlreadySubmitted(false);
      setIsEditing(false);
      setLastSavedAt(null);
      return;
    }

    const firstDeadline = upcomingMatches[0].deadline;

    const roundMatches = upcomingMatches.filter(
      (match) => match.deadline === firstDeadline
    );

    setMatches(roundMatches);

    const matchIds = roundMatches.map((match) => match.id);

    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select(
        'id, user_id, match_id, pick, predicted_home_score, predicted_away_score, submitted_at'
      )
      .eq('user_id', session.user.id)
      .in('match_id', matchIds);

    if (predictionsError) {
      setMessage(`Erro a carregar os teus palpites: ${predictionsError.message}`);
      return;
    }

    const existingPredictions = (predictionsData || []) as Prediction[];

    const initialInputs: Record<string, PredictionInput> = {};

    roundMatches.forEach((match) => {
      const existing = existingPredictions.find(
        (prediction) => prediction.match_id === match.id
      );

      initialInputs[match.id] = {
        pick: existing?.pick || '',
        predicted_home_score:
          existing?.predicted_home_score === undefined
            ? ''
            : String(existing.predicted_home_score),
        predicted_away_score:
          existing?.predicted_away_score === undefined
            ? ''
            : String(existing.predicted_away_score),
      };
    });

    setPredictions(initialInputs);

    const hasAllPredictions =
      matchIds.length > 0 &&
      matchIds.every((matchId) =>
        existingPredictions.some((prediction) => prediction.match_id === matchId)
      );

    setAlreadySubmitted(hasAllPredictions);
    setIsEditing(!hasAllPredictions);

    const savedDates = existingPredictions
      .map((prediction) => prediction.submitted_at)
      .filter(Boolean) as string[];

    if (savedDates.length > 0) {
      const latestSavedAt = savedDates.sort().reverse()[0];
      setLastSavedAt(latestSavedAt);
    } else {
      setLastSavedAt(null);
    }
  }

  function updatePrediction(
    matchId: string,
    field: keyof PredictionInput,
    value: string
  ) {
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

  function getSelectedOdd(match: Match) {
    const prediction = predictions[match.id];

    if (!prediction) return 0;

    if (prediction.pick === 'home') return Number(match.odd_home);
    if (prediction.pick === 'draw') return Number(match.odd_draw);
    if (prediction.pick === 'away') return Number(match.odd_away);

    return 0;
  }

  function getSelectedPickLabel(match: Match) {
    const prediction = predictions[match.id];

    if (!prediction) return '';

    if (prediction.pick === 'home') return `Vitória ${match.home_team}`;
    if (prediction.pick === 'draw') return 'Empate';
    if (prediction.pick === 'away') return `Vitória ${match.away_team}`;

    return '';
  }

  function isRoundComplete() {
    return matches.every((match) => {
      const prediction = predictions[match.id];

      return (
        prediction &&
        prediction.pick !== '' &&
        prediction.predicted_home_score !== '' &&
        prediction.predicted_away_score !== ''
      );
    });
  }

  const remainingGames = useMemo(() => {
    return matches.filter((match) => {
      const prediction = predictions[match.id];

      return (
        !prediction ||
        prediction.pick === '' ||
        prediction.predicted_home_score === '' ||
        prediction.predicted_away_score === ''
      );
    }).length;
  }, [matches, predictions]);

  const normalPotential = useMemo(() => {
    return matches.reduce((sum, match) => {
      return sum + getSelectedOdd(match);
    }, 0);
  }, [matches, predictions]);

  const exactPotential = useMemo(() => {
    return matches.reduce((sum, match) => {
      return (matches.length)*2 + normalPotential;
    }, 0);
  }, [matches, predictions]);

  const roundDeadline = matches.length > 0 ? matches[0].deadline : null;

  const countdownMs = roundDeadline
    ? new Date(roundDeadline).getTime() - nowMs
    : 0;

  const deadlineHasPassed = countdownMs <= 0;

  async function submitPredictions() {
    setMessage('');
    setSuccess('');

    if (alreadySubmitted && !isEditing) {
      setMessage('Já submeteste os palpites desta jornada. Clica em alterar para editar.');
      return;
    }

    if (deadlineHasPassed) {
      setMessage('O prazo desta jornada já fechou. Já não é possível submeter ou alterar palpites.');
      return;
    }

    if (!isRoundComplete()) {
      setMessage(
        `Tens de preencher todos os jogos antes de submeter. Faltam ${remainingGames} jogo(s).`
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = '/login';
      return;
    }

    const now = new Date().toISOString();

    const rowsToSave = matches.map((match) => {
      const prediction = predictions[match.id];

      return {
        user_id: session.user.id,
        match_id: match.id,
        pick: prediction.pick,
        predicted_home_score: Number(prediction.predicted_home_score),
        predicted_away_score: Number(prediction.predicted_away_score),
        submitted_at: now,
      };
    });

    const { error } = await supabase
      .from('predictions')
      .upsert(rowsToSave, {
        onConflict: 'user_id,match_id',
      });

    if (error) {
      setMessage(`Erro a guardar palpites: ${error.message}`);
      return;
    }

    setSuccess('Apostas guardadas com sucesso.');
    setLastSavedAt(now);
    setAlreadySubmitted(true);
    setIsEditing(false);
  }

  const fieldsDisabled = alreadySubmitted && !isEditing;
  const submitDisabled = !isRoundComplete() || deadlineHasPassed;

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Jogos para adivinhar hoje</h1>

            <p className="page-subtitle">
              Faz os teus palpites para a próxima jornada aberta.
            </p>
          </div>

          {matches.length > 0 && (
            <div className="title-countdown-box">
  <div>
    <span>Apostas fecham em:</span>
    <strong>
      {deadlineHasPassed ? 'Fechado' : formatCountdown(countdownMs)}
    </strong>
  </div>
</div>
          )}
        </div>

        {message && <div className="message">{message}</div>}
        {success && <div className="success-message">{success}</div>}

        {matches.length === 0 && (
          <div className="card">
            Não existem jogos abertos para apostar neste momento.
          </div>
        )}

        {matches.length > 0 && (
          <>
            <div className="card">
              <div className="round-info-grid">
                <div className="round-info-card">
                  <span>Jogos da jornada</span>
                  <strong>{matches.length}</strong>
                </div>

                <div className="round-info-card">
                  <span>Por preencher</span>
                  <strong>{remainingGames}</strong>
                </div>

                <div className="round-info-card">
                  <span>Prazo</span>
                  <strong>{formatPortugalDateTime(matches[0].deadline)}</strong>
                </div>
              </div>

              {alreadySubmitted && !isEditing && (
                <div className="prediction-status" style={{ marginTop: 14 }}>
                  Já submeteste os teus palpites desta jornada.
                  {lastSavedAt && (
                    <>
                      {' '}
                      Aposta guardada às{' '}
                      <strong>{formatPortugalTime(lastSavedAt)}</strong>.
                    </>
                  )}

                  {!deadlineHasPassed && (
                    <div className="notice-actions">
                      <button
                        className="button secondary"
                        onClick={() => setIsEditing(true)}
                      >
                        Alterar palpites de hoje
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="message neutral-message" style={{ marginTop: 14 }}>
                  Preenche todos os jogos antes de submeter.
                  {remainingGames > 0 && (
                    <>
                      {' '}
                      Ainda faltam <strong>{remainingGames}</strong> jogo(s).
                    </>
                  )}
                </div>
              )}

              {deadlineHasPassed && (
                <div className="message" style={{ marginTop: 14 }}>
                  O prazo desta jornada já fechou. Já não é possível submeter ou alterar palpites.
                </div>
              )}
            </div>

            <div className="round-total">
              <p>Potencial da jornada</p>
              <strong>{normalPotential.toFixed(2)} pontos</strong>
              <span>
                {' '}
                se acertares os resultados escolhidos. Com resultados exatos:{' '}
                <strong>{exactPotential.toFixed(2)} pontos</strong>
              </span>
            </div>

            {matches.map((match) => {
              const prediction = predictions[match.id];
              const selectedOdd = getSelectedOdd(match);
              const selectedPickLabel = getSelectedPickLabel(match);

              return (
                <div
                  className={fieldsDisabled ? 'card disabled-card' : 'card'}
                  key={match.id}
                >
                  <h3>
                    {match.home_team} vs {match.away_team}
                  </h3>

                  <p className="card-info">
                    Data do jogo:{' '}
                    <strong>
                      {match.kickoff_at
                        ? formatPortugalDateTime(match.kickoff_at)
                        : match.match_date}
                    </strong>
                  </p>

                

                  <div className="form-grid">
                    <div>
                      <label>Resultado apostado</label>

                      <select
                        className="select"
                        value={prediction?.pick || ''}
                        disabled={fieldsDisabled || deadlineHasPassed}
                        onChange={(e) =>
                          updatePrediction(match.id, 'pick', e.target.value)
                        }
                      >
                        <option value="">Escolher...</option>
                        <option value="home">Vitória {match.home_team}</option>
                        <option value="draw">Empate</option>
                        <option value="away">Vitória {match.away_team}</option>
                      </select>
                    </div>

                    <div>
                      <label>Resultado exato</label>

                      <div className="score-inputs">
                        <input
                          className="input"
                          type="number"
                          min="0"
                          placeholder={match.home_team}
                          value={prediction?.predicted_home_score ?? ''}
                          disabled={fieldsDisabled || deadlineHasPassed}
                          onChange={(e) =>
                            updatePrediction(
                              match.id,
                              'predicted_home_score',
                              e.target.value
                            )
                          }
                        />

                        <span>-</span>

                        <input
                          className="input"
                          type="number"
                          min="0"
                          placeholder={match.away_team}
                          value={prediction?.predicted_away_score ?? ''}
                          disabled={fieldsDisabled || deadlineHasPassed}
                          onChange={(e) =>
                            updatePrediction(
                              match.id,
                              'predicted_away_score',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {prediction?.pick && (
                    <div className="odds-box">
                      <p>
                        Escolha: <strong>{selectedPickLabel}</strong>
                      </p>

                      <div className="odds-line">
                        <span className="odd-pill">
                          Odd: {selectedOdd.toFixed(2)}
                        </span>

                        <span className="odd-pill exact">
                          Odd com resultado correto:{' '}
                          {(selectedOdd + 2).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isEditing && (
              <div className="sticky-submit">
                <button
                  className="button"
                  onClick={submitPredictions}
                  disabled={submitDisabled}
                >
                  {alreadySubmitted ? 'Guardar alterações' : 'Submeter palpites'}
                </button>

                {deadlineHasPassed && (
                  <p>O prazo desta jornada já fechou.</p>
                )}

                {!deadlineHasPassed && submitDisabled && (
                  <p>
                    Preenche todos os jogos para poderes submeter. Faltam{' '}
                    <strong>{remainingGames}</strong>.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
