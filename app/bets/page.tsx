'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/app/components/NavBar';

type VisibleBet = {
  match_id: string;
  match_date: string;
  kickoff_at: string | null;
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
  kickoff_at: string | null;
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
      const todayPortugal = getPortugalTodayDateString();

      const todayRows = typedRows.filter(
        (row) => row.match_date === todayPortugal
      );

      if (todayRows.length > 0) {
        setSelectedDeadline(todayRows[0].deadline);
        return;
      }

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
          kickoff_at: row.kickoff_at,
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

      return sortMatchesByKickoff(a, b);
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

  const selectedRound = rounds.find(
    (round) => round.deadline === selectedDeadline
  );

  const selectedRoundClosed =
    selectedMatches.length > 0 &&
    selectedMatches.every((match) => match.is_revealed);

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

  function playerHasFullRoundBet(userId: string) {
    if (selectedMatches.length === 0) return false;

    return selectedMatches.every((match) => {
      const bet = getBet(userId, match.id);
      return bet?.has_bet;
    });
  }

  function getShortStatusForPlayer(userId: string) {
    if (playerHasFullRoundBet(userId)) return 'Apostou';

    if (selectedRoundClosed) {
      return 'Não apostou';
    }

    return 'Por apostar';
  }

  function getRoundPoints(userId: string) {
    if (!selectedRoundClosed) {
      return null;
    }

    return selectedMatches.reduce((sum, match) => {
      const bet = getBet(userId, match.id);
      return sum + Number(bet?.points || 0);
    }, 0);
  }

  const playersWhoBet = profiles.filter((profile) =>
    playerHasFullRoundBet(profile.id)
  ).length;

  const totalPlayers = profiles.length;

  const sortedProfilesForSummary = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const pointsA = getRoundPoints(a.id);
      const pointsB = getRoundPoints(b.id);

      if (pointsA !== null && pointsB !== null && pointsB !== pointsA) {
        return pointsB - pointsA;
      }

      const aHasBet = playerHasFullRoundBet(a.id);
      const bHasBet = playerHasFullRoundBet(b.id);

      if (aHasBet !== bHasBet) {
        return aHasBet ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });
  }, [profiles, rows, selectedDeadline, matches]);

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
            <div className="round-info-grid">
              <div className="round-info-card">
                <span>Jornada</span>
                <strong>{selectedRound.number}</strong>
              </div>

              <div className="round-info-card">
                <span>Apostas feitas</span>
                <strong>
                  {playersWhoBet}/{totalPlayers}
                </strong>
              </div>

              <div className="round-info-card">
                <span>Fecha em</span>
                <strong>{formatPortugalDateTime(selectedDeadline)}</strong>
              </div>
            </div>
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

          <button className="button secondary" style={{ marginTop: 12 }} onClick={load}>
            Atualizar
          </button>
        </div>

        {selectedMatches.length === 0 && (
          <div className="card">Não há jogos para esta jornada.</div>
        )}

        {selectedMatches.map((match) => (
          <div className="card" key={match.id}>
            <h3>
              {formatPortugalTime(match.kickoff_at)} — {match.home_team} vs {match.away_team}
            </h3>


            <p className="card-info">
              Estado: {match.status === 'final' ? 'Finalizado' : 'Aberto'}
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
                    const rowClass = bet?.has_bet ? 'bet-row-done' : 'bet-row-pending';

                    return (
                      <tr key={`${profile.id}-${match.id}`} className={rowClass}>
                        <td>{profile.name}</td>

                        <td>
                          {bet?.has_bet ? (
                            <span className="status-pill status-success">Apostado</span>
                          ) : (
                            <span className="status-pill status-warning">
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

            <p className="card-info">
              <strong>{playersWhoBet}/{totalPlayers}</strong> jogadores já apostaram nesta jornada.
            </p>

            <p className="card-info">
              A jornada fecha em:{' '}
              <strong>{formatPortugalDateTime(selectedDeadline)}</strong>
            </p>

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
                    const hasBet = playerHasFullRoundBet(profile.id);

                    return (
                      <tr
                        key={profile.id}
                        className={hasBet ? 'bet-row-done' : 'bet-row-pending'}
                      >
                        <td>{index + 1}</td>
                        <td>{profile.name}</td>
                        <td>
                          <span
                            className={
                              hasBet
                                ? 'status-pill status-success'
                                : 'status-pill status-warning'
                            }
                          >
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
