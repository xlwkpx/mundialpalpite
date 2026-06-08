'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function login() {
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const userId = data.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      setMessage('Login feito, mas não encontrei o teu perfil.');
      return;
    }

    if (profile.role === 'admin') {
      window.location.href = '/admin';
      return;
    }

    window.location.href = '/player';
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>MundialPalpite</h1>
        <p>Entra para submeter palpites e ver a classificação.</p>

        <div className="form-group">
          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="button" onClick={login}>
          Entrar
        </button>

        {message && <div className="message">{message}</div>}
      </div>
    </main>
  );
}