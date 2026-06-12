import Link from "next/link"
import { lightTheme } from "@/style/light"

export const metadata = {
  title: "Termos de Uso | Seke",
  description: "Termos de uso da plataforma Seke",
}

export default function TermosDeUsoPage() {
  return (
    <article className="mx-auto max-w-3xl prose prose-neutral">
      <h1
        className="text-3xl font-semibold mb-2"
        style={{ color: lightTheme.colors.text }}
      >
        Termos de Uso
      </h1>
      <p className="text-sm mb-8" style={{ color: lightTheme.colors.textSecondary }}>
        Última atualização: junho de 2026
      </p>

      <section className="space-y-4 text-sm leading-relaxed" style={{ color: lightTheme.colors.text }}>
        <p>
          Ao criar uma conta ou utilizar a plataforma Seke, você concorda com estes Termos de Uso.
          Leia-os com atenção antes de concluir o seu cadastro.
        </p>

        <h2 className="text-lg font-semibold pt-2">1. Aceitação dos termos</h2>
        <p>
          O uso da Seke implica a aceitação integral destes termos. Se não concordar com qualquer
          disposição, não deverá utilizar os nossos serviços.
        </p>

        <h2 className="text-lg font-semibold pt-2">2. Conta de utilizador</h2>
        <p>
          É responsável por manter a confidencialidade das suas credenciais e por todas as
          atividades realizadas na sua conta. Deve fornecer informações verdadeiras e atualizadas
          no momento do registo.
        </p>

        <h2 className="text-lg font-semibold pt-2">3. Utilização da plataforma</h2>
        <p>
          A Seke conecta clientes e profissionais. Compromete-se a utilizar a plataforma de forma
          legal, respeitosa e em conformidade com a legislação aplicável em Angola.
        </p>

        <h2 className="text-lg font-semibold pt-2">4. Conteúdo e conduta</h2>
        <p>
          Não é permitido publicar conteúdo ofensivo, fraudulento ou que viole direitos de terceiros.
          Reservamo-nos o direito de suspender ou encerrar contas que violem estas regras.
        </p>

        <h2 className="text-lg font-semibold pt-2">5. Limitação de responsabilidade</h2>
        <p>
          A Seke atua como intermediária entre utilizadores. Não nos responsabilizamos por acordos,
          pagamentos ou resultados obtidos fora dos mecanismos previstos na plataforma.
        </p>

        <h2 className="text-lg font-semibold pt-2">6. Alterações</h2>
        <p>
          Podemos atualizar estes termos periodicamente. O uso continuado da plataforma após
          alterações constitui aceitação da versão revista.
        </p>
      </section>

      <p className="mt-10 text-sm" style={{ color: lightTheme.colors.textSecondary }}>
        Consulte também a{" "}
        <Link href="/politica-de-privacidade" style={{ color: lightTheme.colors.primary }}>
          Política de Privacidade
        </Link>
        .
      </p>
    </article>
  )
}
