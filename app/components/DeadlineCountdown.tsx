'use client';

import { useEffect, useState } from 'react';

type DeadlineCountdownProps = {
  deadline: string;
};

function getTimeLeft(deadline: string) {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return {
      closed: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    closed: false,
    days,
    hours,
    minutes,
    seconds,
  };
}

export default function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(deadline));

  useEffect(() => {
    setTimeLeft(getTimeLeft(deadline));

    const interval = window.setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [deadline]);

  if (timeLeft.closed) {
    return (
      <div className="countdown-box countdown-closed">
        <span>Apostas fechadas</span>
        <strong>Prazo terminado</strong>
      </div>
    );
  }

  return (
    <div className="countdown-box">
      <span>Tempo para fechar as apostas</span>

      <div className="countdown-grid">
        <div>
          <strong>{timeLeft.days}</strong>
          <small>dias</small>
        </div>

        <div>
          <strong>{String(timeLeft.hours).padStart(2, '0')}</strong>
          <small>horas</small>
        </div>

        <div>
          <strong>{String(timeLeft.minutes).padStart(2, '0')}</strong>
          <small>min</small>
        </div>

        <div>
          <strong>{String(timeLeft.seconds).padStart(2, '0')}</strong>
          <small>seg</small>
        </div>
      </div>
    </div>
  );
}