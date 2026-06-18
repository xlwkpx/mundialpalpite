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
  points: number | null;
};

type Profile = {
  id: string;
  name: string;
  role: string;
};

type ResultInput = {
  home_score: string;
  away_score: string;
};

type Round = {
  deadline: string;
  label: string;
  number: number;
};

function getPortugalTodayDateString() {
  const parts = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  return `${year}-${month}-${day}`;
}

function formatPortugalDate(value: string | null) {
  if (!value) return 'Data por definir';

  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    dateStyle: 'short',
  }).format(new Date(value));
}

function formatPortugalDateTime(value: string | null) {
  if (!value) return 'Data/hora por definir';

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

function sortMatchesByKickoff(a: Match, b: Match) {
  if (a.kickoff_at && b.kickoff_at) {
    return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
  }

  if (a.kickoff_at && !b.kickoff_at) return -1;
  if (!a.kickoff_at && b.kickoff_at) return 1;

  if (a.match_date !== b.match_date) {
    return a.match_date.localeCompare(b.match_date);
  }

  return a.home_team.localeCompare(b.home_team);
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedDeadline, setSelectedDeadline] = useState('');
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

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(
        'id, match_date, kickoff_at, home_team, away_team, odd_home, odd_draw, odd_away, deadline, home_score, away_score, status'
      )
      .order('match_date', { ascending: true })
      .order('kickoff_at', { ascending: true })
      .order('deadline', { ascending: true });

    if (matchesError) {
      setMessage(`Erro a carregar jogos: ${matchesError.message}`);
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, role')
      .order('name', { ascending: true });

    if (profilesError) {
      setMessage(`Erro a carregar jogadores: ${profilesError.message}`);
      return;
    }

    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .select('*');

    if (predictionsError) {
      setMessage(`Erro a carregar apostas: ${predictionsError.message}`);
      return;
    }

    const typedMatches = (matchesData || []) as Match[];

    setMatches(typedMatches);
    setProfiles((profilesData || []) as Profile[]);
    setPredictions((predictionsData || []) as Prediction[]);

    const initialResults: Record<string, ResultInput> = {};

    typedMatches.forEach((match) => {
      initialResults[match.id] = {
        home_score: match.home_score === null ? '' : String(match.home_score),
        away_score: match.away_score === null ? '' : String(match.away_score),
      };
    });

    setResults(initialResults);

    if (typedMatches.length > 0 && !selectedDeadline) {
      const todayPortugal = getPortugalTodayDateString();

      const todayMatches = typedMatches
        .filter((match) => match.match_date === todayPortugal)
        .sort(sortMatchesByKickoff);

      if (todayMatches.length > 0) {
        setSelectedDeadline(todayMatches[0].deadline);
        return;
      }

      const futureMatches = typedMatches
        .filter((match) => match.match_date > todayPortugal)
        .sort(sortMatchesByKickoff);

      if (futureMatches.length > 0) {
        setSelectedDeadline(futureMatches[0].deadline);
        return;
      }

      setSelectedDeadline(typedMatches[typedMatches.length - 1].deadline);
    }
  }

  const rounds: Round[] = useMemo(() => {
    const uniqueDeadlines = Array.from(
      new Set(matches.map((match) => match.deadline))
    );

    return uniqueDeadlines.map((deadline, index) => {
      const roundMatches = matches
        .filter((match) => match.deadline === deadline)
        .sort(sortMatchesByKickoff);

      const dates = Array.from(
        new Set(roundMatches.map((match) => match.match_date))
      );

      const dayText =
        dates.length === 1
          ? `dia ${formatPortugalDate(
              roundMatches[0]?.kickoff_at || `${dates[0]}T12:00:00`
            )}`
          : `dias ${formatPortugalDate(
              roundMatches[0]?.kickoff_at || `${dates[0]}T12:00:00`
            )} a ${formatPortugalDate(
              roundMatches[roundMatches.length - 1]?.kickoff_at ||
                `${dates[dates.length - 1]}T12:00:00`
            )}`;

      return {
        deadline,
        number: index + 1,
        label: `Jornada ${index + 1} — ${dayText}`,
      };
    });
  }, [matches]);

  const selectedMatches = useMemo(() => {
    return matches
      .filter((match) => match.deadline === selectedDeadline)
      .sort(sortMatchesByKickoff);
  }, [matches, selectedDeadline]);

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

  function getPrediction(userId: string, matchId: string) {
    return predictions.find(
      (prediction) =>
        prediction.user_id === userId && prediction.match_id === matchId
    );
  }

  function getShortStatusForPlayer(userId: string) {
    const now = new Date();
    const deadline = selectedDeadline ? new Date(selectedDeadline) : null;

    const playerPredictions = selectedMatches.map((match) =>
      getPrediction(userId, match.id)
    );

    const hasAll = playerPredictions.every(Boolean);

    if (hasAll) return 'Apostou';

    if (deadline && now > deadline) {
      return 'Não apostou';
    }

    return 'Por apostar';
  }

  function getRoundPoints(userId: string) {
    return selectedMatches.reduce((sum, match) => {
      const prediction = getPrediction(userId, match.id);
      return sum + Number(prediction?.points || 0);
    }, 0);
  }

  const sortedProfilesForSummary = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const pointsA = getRoundPoints(a.id);
      const pointsB = getRoundPoints(b.id);

      if (pointsB !== pointsA) {
        return pointsB - pointsA;
      }

      return a.name.localeCompare(b.name);
    });
  }, [profiles, predictions, selectedDeadline, matches]);

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

    const { data: matchPredictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', match.id);

    if (predictionsError) {
      setMessage(
        `Resultado guardado, mas houve erro a carregar apostas: ${predictionsError.message}`
      );
      return;
    }

    const actualPick = getActualPick(homeScore, awayScore);
    const typedPredictions = (matchPredictions || []) as Prediction[];

    const updates = typedPredictions.map((prediction) => {
      let points = 0;

      const correctPick = prediction.pick === actualPick;

      if (correctPick) {
        points = getOdd(match, prediction.pick);

        const exactScore =
          prediction.predicted_home_score === homeScore &&
          prediction.predicted_away_score === awayScore;

        if (exactScore) {
          points = points + 2;
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

  async function reopenMatch(match: Match) {
    setMessage('');
    setSuccess('');

    const confirmed = window.confirm(
      `Tens a certeza que queres reabrir ${match.home_team} vs ${match.away_team}? O resultado será apagado e os pontos deste jogo voltam a 0.`
    );

    if (!confirmed) return;

    const { error: matchError } = await supabase
      .from('matches')
      .update({
        home_score: null,
        away_score: null,
        status: 'open',
      })
      .eq('id', match.id);

    if (matchError) {
      setMessage(`Erro ao reabrir jogo: ${matchError.message}`);
      return;
    }

    const { error: predictionsError } = await supabase
      .from('predictions')
      .update({ points: 0 })
      .eq('match_id', match.id);

    if (predictionsError) {
      setMessage(
        `Jogo reaberto, mas houve erro ao limpar pontos: ${predictionsError.message}`
      );
      return;
    }

    setSuccess(
      `Jogo reaberto com sucesso. Resultado apagado e pontos de ${match.home_team} vs ${match.away_team} repostos a 0.`
    );

    await load();
  }

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Administração</h1>

        <p className="page-subtitle">
          Seleciona uma jornada, submete resultados e consulta os pontos feitos nessa jornada.
        </p>

        {message && <div className="message">{message}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="card">
          <label>Selecionar jornada</label>

          <select
            className="select"
            value={selectedDeadline}
            onChange={(e) => setSelectedDeadline(e.target.value)}
          >
            {rounds.map((round) => (
              <option key={round.deadline} value={round.deadline}>
                {round.label}
              </option>
            ))}
          </select>


        </div>

        {selectedMatches.map((match) => (
          <div className="card" key={match.id}>
            <h3>
              {formatPortugalTime(match.kickoff_at)} — {match.home_team} vs {match.away_team}
            </h3>



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
                  placeholder={match.home_team}
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
                  placeholder={match.away_team}
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

              {match.status === 'final' && (
                <button
                  className="button secondary"
                  onClick={() => reopenMatch(match)}
                >
                  Reabrir jogo
                </button>
              )}
            </div>
          </div>
        ))}

        {selectedMatches.length === 0 && (
          <div className="card">Não há jogos nesta jornada.</div>
        )}

        {selectedMatches.length > 0 && (
          <div className="card">
            <h2>Pontos desta jornada</h2>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Jogador</th>
                    <th>Estado</th>
                    <th>Pontos da jornada</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedProfilesForSummary.map((profile, index) => (
                    <tr key={profile.id}>
                      <td>{index + 1}</td>
                      <td>{profile.name}</td>
                      <td>
                        <span className="status-pill">
                          {getShortStatusForPlayer(profile.id)}
                        </span>
                      </td>
                      <td>{getRoundPoints(profile.id).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
