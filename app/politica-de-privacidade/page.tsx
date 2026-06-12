import Link from "next/link"
import { lightTheme } from "@/style/light"

export const metadata = {
  title: "Política de Privacidade | Seke",
  description: "Política de privacidade da plataforma Seke",
}

export default function PoliticaDePrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl prose prose-neutral">
      <h1
        className="text-3xl font-semibold mb-2"
        style={{ color: lightTheme.colors.text }}
      >
        Política de Privacidade
      </h1>
      <p className="text-sm mb-8" style={{ color: lightTheme.colors.textSecondary }}>
        Última atualização: junho de 2026
      </p>

      <section className="space-y-4 text-sm leading-relaxed" style={{ color: lightTheme.colors.text }}>
        <p>
          A Seke valoriza a sua privacidade. Esta política descreve como recolhemos, utilizamos e
          protegemos os seus dados pessoais.
        </p>

        <h2 className="text-lg font-semibold pt-2">1. Dados que recolhemos</h2>
        <p>
          Podemos recolher nome, e-mail, telefone, tipo de conta e outras informações fornecidas
          voluntariamente no cadastro ou utilização da plataforma.
        </p>

        <h2 className="text-lg font-semibold pt-2">2. Finalidade do tratamento</h2>
        <p>
          Utilizamos os seus dados para criar e gerir a sua conta, prestar os serviços da
          plataforma, melhorar a experiência do utilizador e cumprir obrigações legais.
        </p>

        <h2 className="text-lg font-semibold pt-2">3. Partilha de dados</h2>
        <p>
          Não vendemos os seus dados pessoais. Podemos partilhar informações apenas quando
          necessário para a prestação do serviço, com o seu consentimento ou por exigência legal.
        </p>

        <h2 className="text-lg font-semibold pt-2">4. Segurança</h2>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger os seus dados contra acesso
          não autorizado, perda ou alteração indevida.
        </p>

        <h2 className="text-lg font-semibold pt-2">5. Os seus direitos</h2>
        <p>
          Pode solicitar acesso, correção ou eliminação dos seus dados, bem como retirar
          consentimentos previamente concedidos, contactando-nos pelos canais oficiais da Seke.
        </p>

        <h2 className="text-lg font-semibold pt-2">6. Cookies e tecnologias similares</h2>
        <p>
          Podemos utilizar cookies e tecnologias semelhantes para manter sessões autenticadas e
          melhorar o funcionamento da aplicação.
        </p>
      </section>

      <p className="mt-10 text-sm" style={{ color: lightTheme.colors.textSecondary }}>
        Consulte também os{" "}
        <Link href="/termos-de-uso" style={{ color: lightTheme.colors.primary }}>
          Termos de Uso
        </Link>
        .
      </p>
    </article>
  )
}
