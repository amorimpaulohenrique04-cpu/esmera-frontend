import type { Handlers, PageProps } from "$fresh/server.ts";
import StorefrontLayout from "../components/esmera/StorefrontLayout.tsx";
import { getPageChrome } from "../lib/payload/pageData.ts";

interface Data {
  chrome: Awaited<ReturnType<typeof getPageChrome>>;
  canonical: string;
}

interface PolicySectionProps {
  number: string;
  id: string;
  title: string;
  children: preact.ComponentChildren;
}

function PolicySection({ number, id, title, children }: PolicySectionProps) {
  return (
    <section class="esv-privacy-section" aria-labelledby={`${id}-title`}>
      <div class="esv-privacy-section-index" aria-hidden="true">{number}</div>
      <div class="esv-privacy-section-body">
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

const policyNavigation = [
  ["01", "Responsável pelos dados", "responsavel"],
  ["02", "Dados que tratamos", "dados"],
  ["03", "Como utilizamos", "finalidades"],
  ["04", "WhatsApp e atendimento", "whatsapp"],
  ["05", "Carrinho e favoritos", "armazenamento-local"],
  ["06", "Novidades", "comunicacoes"],
  ["07", "Cookies", "cookies"],
  ["08", "Compartilhamento", "compartilhamento"],
  ["09", "Transferências internacionais", "transferencias"],
  ["10", "Prazo de armazenamento", "retencao"],
  ["11", "Segurança", "seguranca"],
  ["12", "Seus direitos", "direitos"],
  ["13", "Decisões automatizadas", "automatizadas"],
  ["14", "Crianças e adolescentes", "criancas"],
  ["15", "Serviços de terceiros", "terceiros"],
  ["16", "Alterações desta política", "alteracoes"],
  ["17", "Fale conosco", "contato-privacidade"],
] as const;

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const chrome = await getPageChrome();
    const url = new URL(req.url);
    return ctx.render({ chrome, canonical: `${url.origin}${url.pathname}` });
  },
};

export default function PrivacyPage({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout
      {...data.chrome}
      canonical={data.canonical}
      seo={{
        title: "Política de Privacidade | Esméra",
        description:
          "Saiba como a Esméra coleta, utiliza, armazena e protege dados pessoais conforme a LGPD.",
        noindex: false,
      }}
    >
      <article class="esv-privacy-page">
        <header class="esv-privacy-hero">
          <div class="esv-shell esv-privacy-hero-grid">
            <div class="esv-privacy-hero-meta">
              <p class="esv-kicker">INSTITUCIONAL · PRIVACIDADE</p>
              <p class="esv-privacy-updated">
                Última atualização<br />
                <strong>23 de setembro de 2026</strong>
              </p>
            </div>
            <div class="esv-privacy-hero-copy">
              <h1>Política de<br />Privacidade</h1>
              <p class="esv-privacy-lead">
                Privacidade também é uma relação de confiança. Esta política
                explica, de forma clara, como a Esméra trata dados pessoais
                durante a navegação, o atendimento e a aquisição de nossas
                peças.
              </p>
            </div>
          </div>
        </header>

        <div class="esv-shell esv-privacy-layout">
          <aside class="esv-privacy-aside">
            <nav class="esv-privacy-nav" aria-label="Nesta política">
              <p>Nesta política</p>
              <ol>
                {policyNavigation.map(([number, label, id]) => (
                  <li>
                    <a href={`#${id}`}>
                      <span>{number}</span>
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div class="esv-privacy-content">
            <div class="esv-privacy-intro">
              <p>
                A Esméra procura tratar apenas os dados necessários para cada
                finalidade. O tratamento realizado por meio deste site e dos
                nossos canais oficiais observa a Lei nº 13.709/2018 — Lei Geral
                de Proteção de Dados Pessoais (LGPD) — e demais normas
                aplicáveis.
              </p>
            </div>

            <div id="responsavel">
              <PolicySection
                number="01"
                id="responsavel"
                title="Quem é responsável pelos seus dados"
              >
                <p>
                  A <strong>Esméra</strong> é responsável pelo tratamento dos
                  dados pessoais realizado por meio deste site e dos seus
                  canais oficiais de atendimento.
                </p>
                <p>
                  Para dúvidas sobre privacidade, tratamento de dados ou para
                  exercer seus direitos, entre em contato pelo e-mail{" "}
                  <a href="mailto:Esmera.decor@hotmail.com">
                    Esmera.decor@hotmail.com
                  </a>.
                </p>
              </PolicySection>
            </div>

            <div id="dados">
              <PolicySection number="02" id="dados" title="Quais dados podemos tratar">
                <p>
                  Coletamos apenas informações compatíveis com a relação que
                  você estabelece com a Esméra.
                </p>
                <ul>
                  <li>
                    <strong>Contato e relacionamento:</strong> nome, e-mail,
                    telefone ou WhatsApp e informações enviadas durante o
                    atendimento.
                  </li>
                  <li>
                    <strong>Compra e entrega:</strong> dados necessários para
                    pedido, faturamento, pagamento e entrega, quando aplicável.
                  </li>
                  <li>
                    <strong>Interesse em produtos:</strong> peças selecionadas,
                    itens adicionados ao carrinho, favoritos, reservas e
                    solicitações de disponibilidade.
                  </li>
                  <li>
                    <strong>Dados técnicos:</strong> informações como endereço
                    IP, navegador, dispositivo, data e horário de acesso quando
                    registradas pela infraestrutura necessária ao funcionamento
                    e à segurança do site.
                  </li>
                </ul>
                <p>
                  Não solicitamos intencionalmente dados pessoais sensíveis nos
                  formulários comuns do site. Evite enviar esse tipo de
                  informação quando ela não for necessária ao atendimento.
                </p>
              </PolicySection>
            </div>

            <div id="finalidades">
              <PolicySection number="03" id="finalidades" title="Para que utilizamos seus dados">
                <p>Os dados pessoais podem ser utilizados para:</p>
                <ul>
                  <li>responder dúvidas e solicitações;</li>
                  <li>apresentar informações sobre peças e disponibilidade;</li>
                  <li>administrar carrinho, reservas e pedidos;</li>
                  <li>concluir compras, pagamentos e entregas;</li>
                  <li>prestar atendimento antes e depois da aquisição;</li>
                  <li>manter registros necessários à relação com clientes;</li>
                  <li>prevenir fraudes e proteger nossos sistemas;</li>
                  <li>cumprir obrigações legais, fiscais ou regulatórias;</li>
                  <li>
                    enviar novidades e lançamentos quando houver uma base legal
                    adequada para essa comunicação.
                  </li>
                </ul>
                <p>
                  Conforme a finalidade, o tratamento poderá se apoiar em
                  execução de contrato ou procedimentos preliminares,
                  cumprimento de obrigação legal, legítimo interesse ou
                  consentimento, nos termos da LGPD.
                </p>
              </PolicySection>
            </div>

            <div id="whatsapp">
              <PolicySection number="04" id="whatsapp" title="WhatsApp e atendimento">
                <p>
                  A Esméra utiliza o WhatsApp como um dos seus canais de
                  atendimento e finalização de pedidos. Ao escolher finalizar um
                  carrinho pelo WhatsApp, o site pode preparar uma mensagem com
                  produtos, quantidades, variações e valores estimados e
                  direcioná-lo para a plataforma.
                </p>
                <p>
                  Dados enviados durante a conversa podem ser utilizados para
                  confirmar disponibilidade, preparar orçamento, concluir a
                  compra, organizar entrega e prestar atendimento relacionado ao
                  pedido.
                </p>
                <p>
                  Ao acessar o WhatsApp, o tratamento realizado pela plataforma
                  também estará sujeito às políticas e aos termos do próprio
                  serviço.
                </p>
              </PolicySection>
            </div>

            <div id="armazenamento-local">
              <PolicySection number="05" id="armazenamento-local" title="Carrinho e favoritos">
                <p>
                  Para tornar a navegação mais conveniente, o site utiliza o
                  armazenamento local do navegador em algumas funcionalidades.
                </p>
                <p>
                  Produtos adicionados ao <strong>carrinho</strong> e itens
                  marcados como <strong>favoritos</strong> podem permanecer
                  armazenados no dispositivo para que sua seleção não seja
                  perdida ao sair da página. Esse armazenamento não representa,
                  por si só, a criação de uma conta na Esméra.
                </p>
                <p>
                  Esses dados podem ser removidos ao limpar os dados do site ou
                  o armazenamento local nas configurações do navegador.
                </p>
              </PolicySection>
            </div>

            <div id="comunicacoes">
              <PolicySection number="06" id="comunicacoes" title="Novidades e comunicações">
                <p>
                  Quando você informa voluntariamente seu WhatsApp no campo de
                  novidades, podemos utilizar esse número para apresentar
                  lançamentos, seleções e conteúdos relacionados à Esméra.
                </p>
                <p>
                  Você pode solicitar a interrupção dessas comunicações a
                  qualquer momento pelo próprio canal utilizado no contato ou
                  pelo e-mail indicado nesta Política.
                </p>
              </PolicySection>
            </div>

            <div id="cookies">
              <PolicySection number="07" id="cookies" title="Cookies e tecnologias semelhantes">
                <p>
                  O site pode utilizar cookies e tecnologias semelhantes
                  necessários ao funcionamento, à segurança e à manutenção de
                  preferências. Também utilizamos armazenamento local para
                  funcionalidades como carrinho e favoritos.
                </p>
                <p>
                  Se a Esméra passar a utilizar tecnologias analíticas,
                  publicitárias ou outras ferramentas não estritamente
                  necessárias que dependam de consentimento, serão
                  disponibilizadas informações e controles adequados para
                  gerenciar essas escolhas.
                </p>
              </PolicySection>
            </div>

            <div id="compartilhamento">
              <PolicySection number="08" id="compartilhamento" title="Com quem os dados podem ser compartilhados">
                <p>
                  <strong>A Esméra não vende dados pessoais.</strong> O
                  compartilhamento ocorre somente quando necessário para uma
                  finalidade legítima relacionada à operação da marca.
                </p>
                <ul>
                  <li>fornecedores de infraestrutura, hospedagem e tecnologia;</li>
                  <li>plataformas de comunicação, como o WhatsApp;</li>
                  <li>
                    prestadores envolvidos em pagamento, entrega ou logística,
                    quando necessários à compra;
                  </li>
                  <li>
                    profissionais que apoiem obrigações contábeis, fiscais ou
                    jurídicas;
                  </li>
                  <li>
                    autoridades públicas quando houver obrigação legal ou
                    determinação válida.
                  </li>
                </ul>
              </PolicySection>
            </div>

            <div id="transferencias">
              <PolicySection number="09" id="transferencias" title="Transferências internacionais">
                <p>
                  Alguns fornecedores de tecnologia e comunicação podem possuir
                  infraestrutura ou realizar processamento de dados fora do
                  Brasil.
                </p>
                <p>
                  Quando houver transferência internacional de dados pessoais, a
                  Esméra adotará, quando aplicável, os mecanismos e salvaguardas
                  previstos na LGPD e na regulamentação da Autoridade Nacional
                  de Proteção de Dados.
                </p>
              </PolicySection>
            </div>

            <div id="retencao">
              <PolicySection number="10" id="retencao" title="Por quanto tempo armazenamos os dados">
                <p>
                  Mantemos dados pessoais pelo período necessário para cumprir a
                  finalidade que justificou seu tratamento.
                </p>
                <p>
                  Informações relacionadas a pedidos, pagamentos, documentos
                  fiscais, atendimento e obrigações comerciais poderão ser
                  mantidas pelos prazos exigidos pela legislação ou necessários
                  ao exercício regular de direitos. Quando a finalidade terminar,
                  os dados serão eliminados, anonimizados ou conservados apenas
                  quando houver fundamento legal para isso.
                </p>
              </PolicySection>
            </div>

            <div id="seguranca">
              <PolicySection number="11" id="seguranca" title="Segurança dos dados">
                <p>
                  A Esméra adota medidas técnicas e administrativas compatíveis
                  com sua operação para proteger dados pessoais contra acesso
                  não autorizado, perda, alteração, divulgação ou tratamento
                  indevido.
                </p>
                <p>
                  Nenhum ambiente digital é absolutamente imune a incidentes.
                  Caso ocorra um incidente que possa gerar risco ou dano
                  relevante aos titulares, serão adotadas as medidas cabíveis de
                  investigação, contenção e comunicação previstas na legislação.
                </p>
              </PolicySection>
            </div>

            <div id="direitos">
              <PolicySection number="12" id="direitos" title="Seus direitos">
                <p>
                  Nos termos da LGPD, você pode solicitar, conforme aplicável:
                </p>
                <ul>
                  <li>confirmação da existência de tratamento;</li>
                  <li>acesso aos seus dados pessoais;</li>
                  <li>correção de dados incompletos, inexatos ou desatualizados;</li>
                  <li>
                    anonimização, bloqueio ou eliminação de dados desnecessários,
                    excessivos ou tratados em desconformidade com a legislação;
                  </li>
                  <li>portabilidade, quando aplicável;</li>
                  <li>informações sobre compartilhamento de dados;</li>
                  <li>revogação do consentimento;</li>
                  <li>
                    eliminação de dados tratados com base no consentimento,
                    ressalvadas as hipóteses legais de conservação;
                  </li>
                  <li>
                    oposição a tratamento realizado em desconformidade com a
                    LGPD;
                  </li>
                  <li>
                    revisão de decisões tomadas unicamente com base em tratamento
                    automatizado, quando aplicável.
                  </li>
                </ul>
                <p>
                  O exercício desses direitos é gratuito. Para proteger sua
                  privacidade, poderemos solicitar informações suficientes para
                  confirmar sua identidade antes de atender determinados pedidos.
                </p>
              </PolicySection>
            </div>

            <div id="automatizadas">
              <PolicySection number="13" id="automatizadas" title="Decisões automatizadas">
                <p>
                  Atualmente, a Esméra não utiliza decisões tomadas
                  exclusivamente por sistemas automatizados que produzam efeitos
                  jurídicos ou afetem significativamente seus clientes.
                  Funcionalidades como busca, carrinho e favoritos servem apenas
                  para navegação e organização da experiência no site.
                </p>
              </PolicySection>
            </div>

            <div id="criancas">
              <PolicySection number="14" id="criancas" title="Crianças e adolescentes">
                <p>
                  Os produtos e serviços comerciais da Esméra não são
                  direcionados especificamente a crianças e não buscamos coletar
                  intencionalmente seus dados por meio deste site.
                </p>
                <p>
                  Caso seja identificado tratamento indevido de dados de criança
                  ou adolescente, serão adotadas as medidas necessárias,
                  considerando seu melhor interesse e a legislação aplicável.
                </p>
              </PolicySection>
            </div>

            <div id="terceiros">
              <PolicySection number="15" id="terceiros" title="Links e serviços de terceiros">
                <p>
                  Nosso site pode conter links ou integrações com serviços
                  externos, como WhatsApp e Instagram. Ao acessar uma plataforma
                  de terceiro, o tratamento realizado por esse serviço também
                  passa a ser regido por suas próprias políticas e termos.
                </p>
              </PolicySection>
            </div>

            <div id="alteracoes">
              <PolicySection number="16" id="alteracoes" title="Alterações nesta política">
                <p>
                  Esta Política poderá ser atualizada para refletir mudanças no
                  site, nos serviços utilizados pela Esméra, em nossas práticas
                  internas ou na legislação aplicável.
                </p>
                <p>
                  A versão vigente estará sempre disponível nesta página,
                  acompanhada da data de sua última atualização.
                </p>
              </PolicySection>
            </div>

            <div id="contato-privacidade">
              <PolicySection number="17" id="contato-privacidade" title="Fale conosco sobre seus dados">
                <div class="esv-privacy-contact">
                  <p class="esv-kicker">ESMÉRA · PRIVACIDADE</p>
                  <a href="mailto:Esmera.decor@hotmail.com">
                    Esmera.decor@hotmail.com
                  </a>
                  <p>
                    Use este canal para dúvidas, solicitações ou exercício de
                    direitos relacionados à privacidade e à proteção de dados
                    pessoais.
                  </p>
                </div>
              </PolicySection>
            </div>
          </div>
        </div>
      </article>
    </StorefrontLayout>
  );
}
