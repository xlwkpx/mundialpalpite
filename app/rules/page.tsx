'use client';

import NavBar from '@/app/components/NavBar';

export default function RulesPage() {
  return (
    <div className="page">
      <NavBar />

      <main className="container">
        <h1 className="page-title">Regras</h1>

        <p className="page-subtitle">
          Guia simples de funcionamento do MundialPalpite.
        </p>

        <div className="card">
          <h2>Guia rápido</h2>

          <p>
            Em cada jornada, os jogadores devem prever todos os jogos disponíveis antes do prazo.
          </p>

          <p>
            Para cada jogo, o jogador escolhe vitória da equipa da casa, empate ou vitória da equipa visitante.
            Também tem de indicar o resultado exato.
          </p>

          <p>
            O resultado indicado tem de ser compatível com o palpite escolhido.
          </p>

          <p>
            Depois de o prazo fechar, os palpites dessa jornada deixam de poder ser submetidos ou alterados.
          </p>

          <p>
            Quando os jogos terminam, o admin insere os resultados finais e o sistema calcula os pontos.
          </p>
        </div>

        <div className="card">
          <h2>Pontuação</h2>

          <p>
            Se o jogador falhar o 1X2, recebe <strong>0 pontos</strong>.
          </p>

          <p>
            Se o jogador acertar o 1X2, recebe a <strong>odd escolhida</strong>.
          </p>

          <p>
            Se o jogador acertar também o resultado exato, recebe a{' '}
            <strong>odd escolhida + 2 pontos</strong>.
          </p>

          <div className="rules-example">
            <h3>Exemplo</h3>
            <p>Jogo: Portugal vs Espanha</p>
            <p>Odd Portugal: 1.80</p>
            <p>Palpite: Portugal vence 2-1</p>
            <p>Resultado final: Portugal vence 2-1</p>
            <p>
              Pontuação: <strong>1.80 + 2 = 3.80 pontos</strong>
            </p>
          </div>
        </div>

        <div className="card">
          <h2>Validação dos palpites</h2>

          <p>
            Se o jogador escolher vitória da equipa da casa, o resultado indicado tem de dar vitória
            à equipa da casa.
          </p>

          <p>
            Se escolher empate, o resultado indicado tem de ser empate.
          </p>

          <p>
            Se escolher vitória da equipa visitante, o resultado indicado tem de dar vitória
            à equipa visitante.
          </p>

          <div className="rules-example">
            <h3>Exemplo inválido</h3>
            <p>Palpite: Vitória Espanha</p>
            <p>Resultado indicado: Portugal 1 - 0 Espanha</p>
            <p>
              Este palpite não é aceite, porque o resultado indicado dá vitória a Portugal.
            </p>
          </div>
        </div>

        <div className="card">
          <h2>Classificação</h2>

          <p>
            A classificação é ordenada por pontos totais.
          </p>

          <p>
            Em caso de empate, o primeiro critério de desempate é quem tem mais resultados exatos.
          </p>

          <p>
            Se continuar empatado, ganha vantagem quem tiver mais palpites 1X2 certos.
          </p>

          <p>
            Se ainda assim continuar empatado, a ordem é alfabética.
          </p>
        </div>

        <div className="card">
          <h2>Jantar</h2>

          <p>
            No final da competição, a tabela divide os jogadores em zonas.
          </p>

          <p>
            A metade de cima da tabela fica a verde.
          </p>

          <p>
            A metade de baixo da tabela fica a vermelho.
          </p>

          <p>
            Se o número de jogadores for ímpar, o jogador do meio fica a amarelo.
          </p>

          <p>
            Quem ficar na metade de baixo paga o jantar à metade de cima.
          </p>

          <p>
            Quem ficar a amarelo paga o seu próprio jantar.
          </p>
        </div>
      </main>
    </div>
  );
}