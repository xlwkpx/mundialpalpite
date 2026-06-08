'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type Match = {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  deadline: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type Profile = {
  id: string;
  name: string;
  role: string;
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

type Round = {
  deadline: string;
  label: string;
  number: number;
};

export default function BetsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedDeadline, setSelectedDeadline] = useState('');
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

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('id, match_date, home_team, away_team, deadline, home_score, away_score, status')
      .order('deadline', { ascending: true })
      .order('match_date', { ascending: true });

    if (matchesError) {
      setMessage(`Erro a carregar jornadas: ${matchesError.message}`);
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
      .select('id, user_id, match_id, pick, predicted_home_score, predicted_away_score, points');

    if (predictionsError) {
      setMessage(`Erro a carregar apostas: ${predictionsError.message}`);
      return;
    }

    const typedMatches = (matchesData || []) as Match[];

    setMatches(typedMatches);
    setProfiles((profilesData || []) as Profile[]);
    setPredictions((predictionsData || []) as Prediction[]);

    if (typedMatches.length > 0) {
      const now = new Date().toISOString();
      const nextOpenMatch = typedMatches.find((match) => match.deadline > now);

      if (nextOpenMatch) {
        setSelectedDeadline(nextOpenMatch.deadline);
      } else {
        setSelectedDeadline(typedMatches[typedMatches.length - 1].deadline);
      }
    }
  }

  const rounds: Round[] = useMemo(() => {
    const uniqueDeadlines = Array.from(
      new Set(matches.map((match) => match.deadline))
    );

    return uniqueDeadlines.map((deadline, index) => {
      const roundMatches = matches.filter((match) => match.deadline === deadline);
      const dates = Array.from(new Set(roundMatches.map((match) => match.match_date)));

      const dayText =
        dates.length === 1
          ? `jogos dia ${dates[0]}`
          : `jogos dias ${dates[0]} a ${dates[dates.length - 1]}`;

      return {
        deadline,
        number: index + 1,
        label: `Jornada ${index + 1} — ${dayText} — prazo ${new Date(deadline).toLocaleString('pt-PT')}`,
      };
    });
  }, [matches]);

  const selectedMatches = matches.filter(
    (match) => match.deadline === selectedDeadline
  );

  const selectedRound = rounds.find((round) => round.deadline === selectedDeadline);

  function getPickLabel(match: Match, pick: string) {
    if (pick === 'home') return `Vitória ${match.home_team}`;
    if (pick === 'draw') return 'Empate';
    if (pick === 'away') return `Vitória ${match.away_team}`;
    return '-';
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

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Apostas</h1>

        <p className="page-subtitle">
          Consulta as apostas feitas pelos jogadores na jornada selecionada.
        </p>

        {message && <div className="message">{message}</div>}

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

          {selectedRound && (
            <p className="card-info" style={{ marginTop: 10 }}>
              A ver: <strong>Jornada {selectedRound.number}</strong>
            </p>
          )}
        </div>

        {selectedMatches.length === 0 && (
          <div className="card">Não há jogos para esta jornada.</div>
        )}

        {selectedMatches.map((match) => (
          <div className="card" key={match.id}>
            <h3>
              {match.match_date} — {match.home_team} vs {match.away_team}
            </h3>

            <p className="card-info">
              Estado: {match.status === 'final' ? 'Finalizado' : 'Aberto'}
            </p>

            {match.home_score !== null && match.away_score !== null && (
              <p className="card-info">
                Resultado: <strong>{match.home_score} - {match.away_score}</strong>
              </p>
            )}

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Jogador</th>
                    <th>Palpite</th>
                    <th>Resultado exato</th>
                    <th>Pontos no jogo</th>
                  </tr>
                </thead>

                <tbody>
                  {profiles.map((profile) => {
                    const prediction = getPrediction(profile.id, match.id);

                    return (
                      <tr key={`${profile.id}-${match.id}`}>
                        <td>{profile.name}</td>

                        {prediction ? (
                          <>
                            <td>{getPickLabel(match, prediction.pick)}</td>
                            <td>
                              {prediction.predicted_home_score} -{' '}
                              {prediction.predicted_away_score}
                            </td>
                            <td>{Number(prediction.points || 0).toFixed(2)}</td>
                          </>
                        ) : (
                          <td colSpan={3}>
                            <span className="status-pill">
                              {getShortStatusForPlayer(profile.id)}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {selectedMatches.length > 0 && (
          <div className="card">
            <h2>Resumo da jornada</h2>

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