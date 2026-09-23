import type { Handlers, PageProps } from "$fresh/server.ts";
import type { ComponentChildren } from "preact";
import StorefrontLayout from "../components/esmera/StorefrontLayout.tsx";
import { getPageChrome } from "../lib/payload/pageData.ts";

interface Data {
  chrome: Awaited<ReturnType<typeof getPageChrome>>;
  canonical: string;
}

interface TermsSectionProps {
  number: string;
  id: string;
  title: string;
  children: ComponentChildren;
}

function TermsSection({ number, id, title, children }: TermsSectionProps) {
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

const termsNavigation = [
  ["01", "Sobre a Esméra", "sobre"],
  ["02", "Uso do site", "uso"],
  ["03", "Informações sobre as peças", "pecas"],
  ["04", "Peças únicas e disponibilidade", "disponibilidade"],
  ["05", "Carrinho", "carrinho"],
  ["06", "Favoritos", "favoritos"],
  ["07", "Preços e condições", "precos"],
  ["08", "Finalização pelo WhatsApp", "whatsapp"],
  ["09", "Pagamento", "pagamento"],
  ["10", "Entrega", "entrega"],
  ["11", "Trocas e devoluções", "trocas"],
  ["12", "Sob encomenda", "encomenda"],
  ["13", "Garantia", "garantia"],
  ["14", "Propriedade intelectual", "propriedade"],
  ["15", "Serviços externos", "terceiros"],
  ["16", "Privacidade", "privacidade"],
  ["17", "Disponibilidade do site", "site"],
  ["18", "Segurança", "seguranca"],
  ["19", "Alterações dos termos", "alteracoes"],
  ["20", "Legislação aplicável", "legislacao"],
  ["21", "Fale com a Esméra", "contato-termos"],
] as const;

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const chrome = await getPageChrome();
    const url = new URL(req.url);
    return ctx.render({ chrome, canonical: `${url.origin}${url.pathname}` });
  },
};

export default function TermsPage({ data }: PageProps<Data>) {
  return (
    <StorefrontLayout
      {...data.chrome}
      canonical={data.canonical}
      seo={{
        title: "Termos de Uso | Esméra",
        description:
          "Conheça as condições de uso do site, carrinho, atendimento, compras, entregas e serviços da Esméra.",
        noindex: false,
      }}
    >
      <article class="esv-privacy-page">
        <header class="esv-privacy-hero">
          <div class="esv-shell esv-privacy-hero-grid">
            <div class="esv-privacy-hero-meta">
              <p class="esv-kicker">INSTITUCIONAL · TERMOS DE USO</p>
              <p class="esv-privacy-updated">
                Última atualização<br />
                <strong>23 de setembro de 2026</strong>
              </p>
            </div>

            <div class="esv-privacy-hero-copy">
              <h1>Termos<br />de Uso</h1>
              <p class="esv-privacy-lead">
                Estes Termos estabelecem as condições para acesso e utilização
                do site da Esméra, incluindo navegação, carrinho, favoritos,
                atendimento, reservas e aquisição de peças.
              </p>
            </div>
          </div>
        </header>

        <div class="esv-shell esv-privacy-layout">
          <aside class="esv-privacy-aside">
            <nav class="esv-privacy-nav" aria-label="Nestes termos">
              <p>Nestes termos</p>
              <ol>
                {termsNavigation.map(([number, label, id]) => (
                  <li key={id}>
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
                Ao utilizar este site, você declara estar ciente destes Termos.
                Nas relações de consumo, permanecem integralmente assegurados os
                direitos previstos na legislação brasileira, especialmente no
                Código de Defesa do Consumidor.
              </p>
            </div>

            <div id="sobre">
              <TermsSection number="01" id="sobre" title="Sobre a Esméra">
                <p>
                  A Esméra cria e seleciona peças em pedras naturais, reunindo
                  design, trabalho artesanal e características próprias de cada
                  matéria.
                </p>
                <p>
                  Por meio deste site, apresentamos nosso acervo, disponibilizamos
                  informações sobre produtos e oferecemos recursos para facilitar
                  o contato, a seleção e a aquisição de peças.
                </p>
                <p>
                  Para atendimento, utilize os canais oficiais disponíveis no
                  site ou o e-mail{" "}
                  <a href="mailto:Esmera.decor@hotmail.com">
                    Esmera.decor@hotmail.com
                  </a>.
                </p>
              </TermsSection>
            </div>

            <div id="uso">
              <TermsSection number="02" id="uso" title="Uso do site">
                <p>O site pode ser utilizado para:</p>
                <ul>
                  <li>conhecer a Esméra e suas peças;</li>
                  <li>consultar produtos, preços e disponibilidade;</li>
                  <li>visualizar detalhes e características dos produtos;</li>
                  <li>adicionar itens ao carrinho ou aos favoritos;</li>
                  <li>solicitar informações e atendimento;</li>
                  <li>iniciar ou concluir uma compra pelos canais disponíveis.</li>
                </ul>
                <p>
                  O usuário deve utilizar o site de forma lícita e compatível
                  com sua finalidade. Não é permitido tentar comprometer a
                  segurança ou integridade do serviço, acessar áreas restritas
                  sem autorização ou utilizar mecanismos automatizados de forma
                  abusiva.
                </p>
              </TermsSection>
            </div>

            <div id="pecas">
              <TermsSection number="03" id="pecas" title="Informações sobre as peças">
                <p>
                  Buscamos apresentar cada produto com informações e imagens que
                  representem adequadamente suas características.
                </p>
                <p>
                  Por trabalharmos com <strong>pedras naturais e processos
                  artesanais</strong>, cada peça pode apresentar particularidades
                  próprias da matéria, como diferenças de tonalidade, veios,
                  desenhos, pequenas irregularidades de superfície e outras
                  variações naturais.
                </p>
                <p>
                  Essas características fazem parte da identidade do material e
                  não significam, por si só, defeito do produto. As cores também
                  podem apresentar pequenas diferenças conforme iluminação,
                  tela e configurações do dispositivo utilizado.
                </p>
              </TermsSection>
            </div>

            <div id="disponibilidade">
              <TermsSection number="04" id="disponibilidade" title="Peças únicas, edições e disponibilidade">
                <p>
                  Algumas criações da Esméra podem ser apresentadas como peça
                  única, edição limitada ou produto sujeito à disponibilidade.
                </p>
                <p>
                  Adicionar um produto ao carrinho ou aos favoritos não garante
                  sua disponibilidade definitiva. Especialmente no caso de
                  peças únicas, outro cliente poderá concluir uma aquisição
                  enquanto o produto estiver sendo visualizado ou permanecer no
                  carrinho.
                </p>
                <p>
                  Quando houver mecanismo de reserva temporária, o prazo e as
                  condições correspondentes serão apresentados durante o
                  processo. A compra será considerada confirmada após a conclusão
                  das etapas aplicáveis e a respectiva confirmação.
                </p>
              </TermsSection>
            </div>

            <div id="carrinho">
              <TermsSection number="05" id="carrinho" title="Carrinho">
                <p>
                  O carrinho é uma ferramenta para organizar as peças que o
                  usuário pretende adquirir. Os itens adicionados podem permanecer
                  armazenados no próprio navegador para facilitar uma visita
                  posterior.
                </p>
                <p>A inclusão de um produto no carrinho:</p>
                <ul>
                  <li>não representa confirmação da compra;</li>
                  <li>não garante estoque;</li>
                  <li>não reserva indefinidamente a peça;</li>
                  <li>não impede sua aquisição por outro cliente.</li>
                </ul>
                <p>
                  Antes da conclusão do pedido, informações como disponibilidade
                  e valores poderão ser novamente verificadas.
                </p>
              </TermsSection>
            </div>

            <div id="favoritos">
              <TermsSection number="06" id="favoritos" title="Favoritos">
                <p>
                  A funcionalidade de favoritos permite salvar peças de
                  interesse e vinculá-las ao atendimento Esméra. No primeiro
                  uso, podemos solicitar nome e WhatsApp para identificar sua
                  seleção. Essas informações e a lista local podem ser
                  armazenadas no navegador para evitar que os mesmos dados sejam
                  solicitados novamente.
                </p>
                <p>
                  As peças favoritedas passam a constar como produtos de
                  interesse associados ao contato no sistema da Esméra. Favoritar
                  não constitui reserva, compra ou garantia de disponibilidade.
                  A limpeza dos dados do navegador poderá remover a identificação
                  local e a lista exibida no dispositivo.
                </p>
              </TermsSection>
            </div>

            <div id="precos">
              <TermsSection number="07" id="precos" title="Preços e condições comerciais">
                <p>
                  Os valores exibidos no site são apresentados em reais (R$),
                  salvo indicação expressa em contrário. Quando houver
                  parcelamento, as condições serão apresentadas junto ao produto
                  ou durante o processo de aquisição.
                </p>
                <p>
                  Peças sob consulta ou sob encomenda poderão ter preço, prazo,
                  disponibilidade e especificações confirmados antes da
                  contratação.
                </p>
                <p>
                  Caso seja identificado erro evidente de informação, preço ou
                  disponibilidade antes da conclusão da contratação, a Esméra
                  entrará em contato para esclarecer a situação e apresentar as
                  opções aplicáveis, observando a legislação de defesa do
                  consumidor.
                </p>
              </TermsSection>
            </div>

            <div id="whatsapp">
              <TermsSection number="08" id="whatsapp" title="Finalização pelo WhatsApp">
                <p>
                  Em determinadas situações, o site poderá direcionar o cliente
                  ao WhatsApp da Esméra para continuidade do atendimento ou
                  conclusão do pedido.
                </p>
                <p>
                  O site pode preparar automaticamente uma mensagem contendo
                  produtos selecionados, quantidades, variações e valores
                  estimados. O cliente poderá revisar a mensagem antes de
                  enviá-la.
                </p>
                <p>
                  A conversa poderá ser utilizada para confirmar estoque,
                  características da peça, condições de pagamento, endereço,
                  entrega e demais informações necessárias à contratação.
                </p>
              </TermsSection>
            </div>

            <div id="pagamento">
              <TermsSection number="09" id="pagamento" title="Pagamento">
                <p>
                  As formas de pagamento disponíveis serão apresentadas durante
                  o processo de compra ou informadas pela equipe da Esméra antes
                  da conclusão do pedido.
                </p>
                <p>
                  A confirmação poderá depender da aprovação da instituição
                  financeira ou plataforma responsável pela transação.
                </p>
                <p>
                  A Esméra não solicita senhas bancárias, códigos de autenticação
                  ou outras credenciais privadas de acesso a contas financeiras.
                  Utilize apenas os canais e dados de pagamento oficialmente
                  fornecidos pela marca.
                </p>
              </TermsSection>
            </div>

            <div id="entrega">
              <TermsSection number="10" id="entrega" title="Entrega">
                <p>
                  Prazo, valor e modalidade de entrega poderão variar conforme o
                  produto, o destino e as condições específicas do pedido.
                </p>
                <p>
                  As informações aplicáveis serão apresentadas ao cliente antes
                  da conclusão da compra sempre que necessárias. O cliente é
                  responsável por fornecer corretamente os dados de entrega.
                </p>
                <p>
                  Situações externas que afetem o transporte serão tratadas de
                  acordo com as circunstâncias do pedido e os direitos
                  assegurados pela legislação aplicável.
                </p>
              </TermsSection>
            </div>

            <div id="trocas">
              <TermsSection number="11" id="trocas" title="Trocas, devoluções e direito de arrependimento">
                <p>
                  A Esméra respeita os direitos assegurados pelo Código de Defesa
                  do Consumidor.
                </p>
                <p>
                  Nas contratações realizadas fora do estabelecimento comercial,
                  inclusive pela internet, o consumidor poderá exercer o direito
                  de arrependimento dentro do prazo legal aplicável, contado na
                  forma prevista pela legislação.
                </p>
                <p>
                  Para solicitar cancelamento, devolução ou exercer esse direito,
                  entre em contato pelos canais oficiais da Esméra. O exercício
                  de direitos legalmente assegurados ao consumidor não será
                  limitado por estes Termos.
                </p>
              </TermsSection>
            </div>

            <div id="encomenda">
              <TermsSection number="12" id="encomenda" title="Produtos sob encomenda e projetos especiais">
                <p>
                  A Esméra também pode desenvolver peças sob encomenda ou
                  projetos com especificações definidas em conjunto com o
                  cliente.
                </p>
                <p>Antes da produção, poderão ser definidos:</p>
                <ul>
                  <li>medidas e desenho;</li>
                  <li>tipo de pedra e acabamento;</li>
                  <li>quantidade;</li>
                  <li>preço e condições de pagamento;</li>
                  <li>prazo estimado.</li>
                </ul>
                <p>
                  Alterações solicitadas após o início da produção podem impactar
                  prazo, viabilidade técnica e custo. Eventuais condições
                  específicas serão informadas previamente e aplicadas em
                  conformidade com a legislação vigente.
                </p>
              </TermsSection>
            </div>

            <div id="garantia">
              <TermsSection number="13" id="garantia" title="Garantia e problemas com o produto">
                <p>
                  Caso o cliente identifique avaria, defeito ou divergência
                  relevante em relação ao produto adquirido, deverá entrar em
                  contato com a Esméra para análise da situação.
                </p>
                <p>
                  As garantias e soluções serão oferecidas conforme o Código de
                  Defesa do Consumidor e demais normas aplicáveis.
                </p>
                <p>
                  Variações próprias de pedras naturais — como veios, tonalidades
                  e desenhos inerentes ao material — serão avaliadas considerando
                  a natureza do produto e as informações apresentadas no momento
                  da compra.
                </p>
              </TermsSection>
            </div>

            <div id="propriedade">
              <TermsSection number="14" id="propriedade" title="Conteúdo e propriedade intelectual">
                <p>
                  Salvo quando indicado de outra forma, pertencem à Esméra ou são
                  utilizados mediante autorização os conteúdos presentes neste
                  site, incluindo identidade visual, logotipo, fotografias,
                  vídeos, textos, ilustrações, elementos gráficos, desenhos de
                  produtos e materiais editoriais.
                </p>
                <p>
                  O acesso ao site não transfere ao usuário direitos de
                  propriedade intelectual sobre esses materiais. Não é permitido
                  reproduzir, modificar, distribuir ou explorar comercialmente
                  conteúdos da Esméra de maneira que viole direitos aplicáveis,
                  salvo autorização ou hipótese permitida por lei.
                </p>
              </TermsSection>
            </div>

            <div id="terceiros">
              <TermsSection number="15" id="terceiros" title="Links e serviços externos">
                <p>
                  O site pode disponibilizar links para plataformas ou serviços
                  de terceiros, incluindo WhatsApp e Instagram.
                </p>
                <p>
                  Esses ambientes são administrados por seus respectivos
                  responsáveis e possuem termos, políticas e práticas próprias.
                  A Esméra não controla o funcionamento dessas plataformas.
                </p>
              </TermsSection>
            </div>

            <div id="privacidade">
              <TermsSection number="16" id="privacidade" title="Privacidade e dados pessoais">
                <p>
                  O tratamento de dados pessoais relacionado ao site, atendimento
                  e relacionamento com a Esméra é descrito em nossa{" "}
                  <a href="/politica-de-privacidade">
                    Política de Privacidade
                  </a>.
                </p>
                <p>
                  Ela explica quais dados podem ser tratados, suas finalidades,
                  compartilhamentos, armazenamento e os direitos dos titulares
                  de acordo com a Lei Geral de Proteção de Dados Pessoais —
                  LGPD.
                </p>
              </TermsSection>
            </div>

            <div id="site">
              <TermsSection number="17" id="site" title="Disponibilidade do site">
                <p>
                  Trabalhamos para manter o site disponível e funcionando
                  adequadamente. No entanto, podem ocorrer interrupções
                  temporárias por manutenção, atualização, falhas de
                  infraestrutura, indisponibilidade de fornecedores, problemas
                  de conexão ou eventos fora do controle razoável da Esméra.
                </p>
                <p>
                  A indisponibilidade temporária do site não afeta direitos já
                  adquiridos pelo consumidor em relação a pedidos ou contratos
                  concluídos.
                </p>
              </TermsSection>
            </div>

            <div id="seguranca">
              <TermsSection number="18" id="seguranca" title="Segurança">
                <p>
                  Adotamos medidas razoáveis para preservar a segurança e a
                  integridade do ambiente digital.
                </p>
                <p>
                  O usuário também deve evitar compartilhar dados de pagamento
                  ou informações pessoais com perfis, números ou canais não
                  reconhecidos como oficiais da Esméra. Em caso de dúvida sobre
                  uma comunicação, confirme sua autenticidade pelos canais
                  publicados neste site.
                </p>
              </TermsSection>
            </div>

            <div id="alteracoes">
              <TermsSection number="19" id="alteracoes" title="Alterações destes Termos">
                <p>
                  Estes Termos poderão ser atualizados para acompanhar mudanças
                  no funcionamento do site, nos serviços oferecidos, na operação
                  da Esméra ou na legislação.
                </p>
                <p>
                  A versão vigente permanecerá disponível nesta página,
                  acompanhada da data da última atualização. Mudanças não serão
                  aplicadas retroativamente de forma a retirar direitos já
                  adquiridos pelo consumidor.
                </p>
              </TermsSection>
            </div>

            <div id="legislacao">
              <TermsSection number="20" id="legislacao" title="Legislação aplicável">
                <p>
                  Estes Termos são interpretados de acordo com a legislação
                  brasileira.
                </p>
                <p>
                  Nas relações de consumo, aplicam-se especialmente as normas do
                  Código de Defesa do Consumidor e demais regras obrigatórias de
                  proteção ao consumidor. Eventuais controvérsias serão tratadas
                  perante o foro competente definido pela legislação aplicável,
                  preservados os direitos legalmente assegurados ao consumidor.
                </p>
              </TermsSection>
            </div>

            <div id="contato-termos">
              <TermsSection number="21" id="contato-termos" title="Fale com a Esméra">
                <div class="esv-privacy-contact">
                  <p class="esv-kicker">ESMÉRA · ATENDIMENTO</p>
                  <a href="mailto:Esmera.decor@hotmail.com">
                    Esmera.decor@hotmail.com
                  </a>
                  <p>
                    Para dúvidas sobre estes Termos, uma compra, uma peça ou o
                    funcionamento do site, entre em contato conosco. Você também
                    pode utilizar o canal oficial de WhatsApp disponível no site.
                  </p>
                </div>
              </TermsSection>
            </div>
          </div>
        </div>
      </article>
    </StorefrontLayout>
  );
}
