'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type VisibleBet = {
  match_id: string;
  match_date: string;
  deadline: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  profile_id: string;
  player_name: string;
  player_role: string;
  has_bet: boolean;
  is_revealed: boolean;
  pick: string | null;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  points: number | null;
};

type Match = {
  id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  deadline: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  is_revealed: boolean;
};

type Profile = {
  id: string;
  name: string;
  role: string;
};

type Round = {
  deadline: string;
  label: string;
  number: number;
};

export default function BetsPage() {
  const [rows, setRows] = useState<VisibleBet[]>([]);
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

    const { data, error } = await supabase.rpc('get_visible_bets');

    if (error) {
      setMessage(`Erro a carregar apostas: ${error.message}`);
      return;
    }

    const typedRows = (data || []) as VisibleBet[];

    setRows(typedRows);

    const uniqueDeadlines = Array.from(
      new Set(typedRows.map((row) => row.deadline))
    ).sort();

    if (uniqueDeadlines.length > 0) {
      const now = new Date().toISOString();
      const nextOpenDeadline = uniqueDeadlines.find(
        (deadline) => deadline > now
      );

      if (nextOpenDeadline) {
        setSelectedDeadline(nextOpenDeadline);
      } else {
        setSelectedDeadline(uniqueDeadlines[uniqueDeadlines.length - 1]);
      }
    }
  }

  const matches: Match[] = useMemo(() => {
    const map = new Map<string, Match>();

    rows.forEach((row) => {
      if (!map.has(row.match_id)) {
        map.set(row.match_id, {
          id: row.match_id,
          match_date: row.match_date,
          home_team: row.home_team,
          away_team: row.away_team,
          deadline: row.deadline,
          home_score: row.home_score,
          away_score: row.away_score,
          status: row.status,
          is_revealed: row.is_revealed,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.deadline !== b.deadline) {
        return a.deadline.localeCompare(b.deadline);
      }

      return a.match_date.localeCompare(b.match_date);
    });
  }, [rows]);

  const profiles: Profile[] = useMemo(() => {
    const map = new Map<string, Profile>();

    rows.forEach((row) => {
      if (!map.has(row.profile_id)) {
        map.set(row.profile_id, {
          id: row.profile_id,
          name: row.player_name,
          role: row.player_role,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [rows]);

  const rounds: Round[] = useMemo(() => {
    const uniqueDeadlines = Array.from(
      new Set(matches.map((match) => match.deadline))
    );

    return uniqueDeadlines.map((deadline, index) => {
      const roundMatches = matches.filter(
        (match) => match.deadline === deadline
      );

      const dates = Array.from(
        new Set(roundMatches.map((match) => match.match_date))
      );

      const dayText =
        dates.length === 1
          ? `jogos dia ${dates[0]}`
          : `jogos dias ${dates[0]} a ${dates[dates.length - 1]}`;

      return {
        deadline,
        number: index + 1,
        label: `Jornada ${index + 1} — ${dayText} — prazo ${new Date(
          deadline
        ).toLocaleString('pt-PT')}`,
      };
    });
  }, [matches]);

  const selectedMatches = matches.filter(
    (match) => match.deadline === selectedDeadline
  );

  const selectedRound = rounds.find(
    (round) => round.deadline === selectedDeadline
  );

  function getPickLabel(match: Match, pick: string | null) {
    if (pick === 'home') return `Vitória ${match.home_team}`;
    if (pick === 'draw') return 'Empate';
    if (pick === 'away') return `Vitória ${match.away_team}`;
    return '-';
  }

  function getBet(userId: string, matchId: string) {
    return rows.find(
      (row) => row.profile_id === userId && row.match_id === matchId
    );
  }

  function getShortStatusForPlayer(userId: string) {
    const playerBets = selectedMatches.map((match) =>
      getBet(userId, match.id)
    );

    const hasAll = playerBets.every((bet) => bet?.has_bet);
    const selectedRoundClosed = selectedMatches.every(
      (match) => match.is_revealed
    );

    if (hasAll) return 'Apostou';

    if (selectedRoundClosed) {
      return 'Não apostou';
    }

    return 'Por apostar';
  }

  function getRoundPoints(userId: string) {
    const selectedRoundClosed = selectedMatches.every(
      (match) => match.is_revealed
    );

    if (!selectedRoundClosed) {
      return null;
    }

    return selectedMatches.reduce((sum, match) => {
      const bet = getBet(userId, match.id);
      return sum + Number(bet?.points || 0);
    }, 0);
  }

  const sortedProfilesForSummary = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const pointsA = getRoundPoints(a.id);
      const pointsB = getRoundPoints(b.id);

      if (pointsA !== null && pointsB !== null && pointsB !== pointsA) {
        return pointsB - pointsA;
      }

      return a.name.localeCompare(b.name);
    });
  }, [profiles, rows, selectedDeadline, matches]);

  const selectedRoundClosed =
    selectedMatches.length > 0 &&
    selectedMatches.every((match) => match.is_revealed);

  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Apostas</h1>

        <p className="page-subtitle">
          Consulta quem já apostou na jornada selecionada. Os palpites ficam
          ocultos até ao prazo da aposta fechar.
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

          {selectedMatches.length > 0 && !selectedRoundClosed && (
            <div className="prediction-status" style={{ marginTop: 14 }}>
              Palpites ocultos até ao prazo da aposta fechar.
            </div>
          )}

          {selectedMatches.length > 0 && selectedRoundClosed && (
            <div className="success-message" style={{ marginTop: 14 }}>
              Prazo fechado. Palpites revelados.
            </div>
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

            <p className="card-info">
              Prazo da aposta:{' '}
              <strong>{new Date(match.deadline).toLocaleString('pt-PT')}</strong>
            </p>

            {match.home_score !== null && match.away_score !== null && (
              <p className="card-info">
                Resultado:{' '}
                <strong>
                  {match.home_score} - {match.away_score}
                </strong>
              </p>
            )}

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Jogador</th>
                    <th>Estado</th>
                    <th>Palpite</th>
                    <th>Resultado exato</th>
                    <th>Pontos no jogo</th>
                  </tr>
                </thead>

                <tbody>
                  {profiles.map((profile) => {
                    const bet = getBet(profile.id, match.id);

                    return (
                      <tr key={`${profile.id}-${match.id}`}>
                        <td>{profile.name}</td>

                        <td>
                          {bet?.has_bet ? (
                            <span className="status-pill">Apostado</span>
                          ) : (
                            <span className="status-pill">
                              {getShortStatusForPlayer(profile.id)}
                            </span>
                          )}
                        </td>

                        <td>
                          {!bet?.has_bet && '-'}

                          {bet?.has_bet && !bet.is_revealed && (
                            <span className="hidden-bet">
                              Oculto até ao prazo da aposta
                            </span>
                          )}

                          {bet?.has_bet && bet.is_revealed && (
                            <strong>{getPickLabel(match, bet.pick)}</strong>
                          )}
                        </td>

                        <td>
                          {!bet?.has_bet && '-'}

                          {bet?.has_bet && !bet.is_revealed && (
                            <span className="hidden-bet">Oculto</span>
                          )}

                          {bet?.has_bet &&
                            bet.is_revealed &&
                            bet.predicted_home_score !== null &&
                            bet.predicted_away_score !== null && (
                              <strong>
                                {bet.predicted_home_score} -{' '}
                                {bet.predicted_away_score}
                              </strong>
                            )}
                        </td>

                        <td>
                          {!bet?.has_bet && '-'}

                          {bet?.has_bet && !bet.is_revealed && (
                            <span className="hidden-bet">Oculto</span>
                          )}

                          {bet?.has_bet && bet.is_revealed && (
                            <strong>{Number(bet.points || 0).toFixed(2)}</strong>
                          )}
                        </td>
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
                  {sortedProfilesForSummary.map((profile, index) => {
                    const roundPoints = getRoundPoints(profile.id);

                    return (
                      <tr key={profile.id}>
                        <td>{index + 1}</td>
                        <td>{profile.name}</td>
                        <td>
                          <span className="status-pill">
                            {getShortStatusForPlayer(profile.id)}
                          </span>
                        </td>
                        <td>
                          {roundPoints === null ? (
                            <span className="hidden-bet">Oculto</span>
                          ) : (
                            roundPoints.toFixed(2)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}