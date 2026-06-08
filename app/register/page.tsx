'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');

  async function register() {
    setMessage('');
    setSuccess('');

    if (!name.trim()) {
      setMessage('Tens de preencher o nome de jogador.');
      return;
    }

    if (!email.trim()) {
      setMessage('Tens de preencher o email.');
      return;
    }

    if (password.length < 6) {
      setMessage('A password deve ter pelo menos 6 caracteres.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Erro no registo: ${error.message}`);
      return;
    }

    if (!data.user) {
      setMessage('Erro no registo: não foi criado utilizador.');
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name: name.trim(),
      role: 'player',
    });

    if (profileError) {
      setMessage(`Conta criada, mas houve erro ao criar perfil: ${profileError.message}`);
      return;
    }

    setSuccess('Registo criado com sucesso. A entrar...');

    setTimeout(() => {
      window.location.href = '/player';
    }, 800);
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Criar registo</h1>
        <p>Cria a tua conta para participar no MundialPalpite.</p>

        <div className="form-group">
          <input
            className="input"
            placeholder="Nome de jogador"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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

        <button className="button" onClick={register}>
          Criar conta
        </button>

        <p style={{ marginTop: 18 }}>
          Já tens conta? <Link href="/login">Entrar</Link>
        </p>

        {message && <div className="message">{message}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </main>
  );
}