'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardCheck, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  Printer, Save, RotateCcw, FileText, Shield, Leaf,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Avaliacao = 'OK' | 'OM' | 'NC' | 'NA' | '';

interface ChecklistItem {
  id: string;
  section: string;
  question: string;
  norma_ref: string;
  requisito: string;
  evidencias: string[];
}

interface ItemState {
  avaliacao: Avaliacao;
  evidencia_observada: string;
  parecer: string;
}

interface AuditInfo {
  auditor: string;
  data: string;
  tipo: 'Inicial' | 'Periódica' | 'Extraordinária';
  modalidade: 'Presencial' | 'Remota' | 'Híbrida';
}

// ─── Checklist Data (extraído do Checklist_QSMS_TigerRentank_v4.1.xlsx) ─────

const QUALIDADE: ChecklistItem[] = [
  // 1. Contexto da Organização
  { id:'Q1', section:'1. Contexto da Organização (Seção 4)', question:'A organização determina questões internas e externas pertinentes ao seu propósito que afetam o SGQ?', norma_ref:'ISO 9001:2015 – 4.1', requisito:'A norma exige que a organização identifique e monitore as questões internas (cultura, valores, recursos) e externas (ambiente legal, tecnológico, competitivo) relevantes ao seu contexto e aos seus objetivos estratégicos.', evidencias:['Análise de contexto documentada (SWOT, PESTEL)','Registro de revisão periódica das questões internas e externas','Ata de reunião de análise crítica abordando o contexto'] },
  { id:'Q2', section:'1. Contexto da Organização (Seção 4)', question:'O escopo do SGQ está definido, documentado e considera questões do contexto e requisitos das partes interessadas?', norma_ref:'ISO 9001:2015 – 4.3', requisito:'O escopo do SGQ deve ser determinado, documentado e disponível, informando os produtos e serviços cobertos e justificando quaisquer requisitos da norma que não se apliquem.', evidencias:['Documento de escopo do SGQ (manual ou documento específico)','Certificado ISO 9001 com escopo descrito','Exclusões justificadas quando aplicável'] },
  { id:'Q3', section:'1. Contexto da Organização (Seção 4)', question:'A organização possui mapeamento de processos com entradas, saídas, interações e responsáveis definidos?', norma_ref:'ISO 9001:2015 – 4.4', requisito:'A organização deve estabelecer, implementar, manter e melhorar o SGQ incluindo os processos necessários e suas interações, determinando entradas e saídas esperadas, sequência, critérios e responsabilidades.', evidencias:['Mapa de processos / fluxogramas documentados','Folhas de processo com entradas, saídas e responsáveis','Indicadores de processo definidos e monitorados'] },
  // 2. Liderança
  { id:'Q4', section:'2. Liderança e Comprometimento (Seção 5)', question:'Responsabilidades e autoridades para funções relevantes ao SGQ estão atribuídas, comunicadas e compreendidas?', norma_ref:'ISO 9001:2015 – 5.3', requisito:'A alta direção deve assegurar que as responsabilidades e autoridades para funções relevantes são atribuídas, comunicadas e entendidas na organização, incluindo a designação de responsável pelo SGQ.', evidencias:['Organograma atualizado','Descrições de cargo com responsabilidades do SGQ','Designação formal do representante da qualidade'] },
  // 3. Planejamento
  { id:'Q5', section:'3. Planejamento (Seção 6)', question:'Mudanças no SGQ são planejadas e executadas de forma controlada (Gestão de Mudanças)?', norma_ref:'ISO 9001:2015 – 6.3', requisito:'Quando a organização determina a necessidade de mudanças no SGQ, as mudanças devem ser realizadas de maneira planejada, considerando o propósito, a integridade do SGQ, a disponibilidade de recursos e a alocação de responsabilidades.', evidencias:['Procedimento de Gestão de Mudanças documentado','Registros de solicitações de mudança aprovadas (GM/FAM)','Evidência de avaliação de impacto antes da implementação'] },
  // 4. Apoio / Suporte
  { id:'Q6', section:'4. Apoio / Suporte (Seção 7)', question:'Os recursos necessários (pessoas, infraestrutura, ambiente) estão determinados e disponibilizados?', norma_ref:'ISO 9001:2015 – 7.1', requisito:'A organização deve determinar e prover os recursos necessários para estabelecer, implementar, manter e melhorar continuamente o SGQ, incluindo recursos humanos, infraestrutura e ambiente para operação dos processos.', evidencias:['Plano de manutenção de infraestrutura','Registros de manutenção preventiva e corretiva de equipamentos','Condições adequadas observadas in loco (iluminação, limpeza, organização)'] },
  { id:'Q7', section:'4. Apoio / Suporte (Seção 7)', question:'Instrumentos de monitoramento e medição são calibrados e certificados? Registros estão válidos?', norma_ref:'ISO 9001:2015 – 7.1.5', requisito:'A organização deve determinar o monitoramento e a medição a ser realizado e os recursos necessários para assegurar resultados válidos e confiáveis. Equipamentos de medição devem ser calibrados em intervalos especificados.', evidencias:['Lista/inventário de equipamentos de medição com status de calibração','Certificados de calibração vigentes (rastreáveis ao INMETRO/RBC)','Procedimento de controle de instrumentos documentado'] },
  { id:'Q8', section:'4. Apoio / Suporte (Seção 7)', question:'A informação documentada (procedimentos, registros) é controlada, atualizada e acessível?', norma_ref:'ISO 9001:2015 – 7.5', requisito:'A organização deve controlar a informação documentada necessária para o SGQ, assegurando que está disponível, adequada para uso, protegida e retida pelo tempo necessário.', evidencias:['Procedimento de controle de documentos e registros','Lista mestre de documentos com revisões e aprovações','Evidência de controle de acesso e distribuição de documentos'] },
  { id:'Q9', section:'4. Apoio / Suporte (Seção 7)', question:'Os canais de comunicação interna e externa estão estabelecidos e funcionando?', norma_ref:'ISO 9001:2015 – 7.4', requisito:'A organização deve determinar as comunicações internas e externas pertinentes ao SGQ, incluindo o quê, quando, com quem, como e quem comunica.', evidencias:['Plano ou matriz de comunicação documentado','Exemplos de comunicações internas (murais, e-mails, reuniões, DDS)','Registros de comunicações externas com clientes e fornecedores'] },
  // 5. Operação
  { id:'Q10', section:'5. Operação (Seção 8)', question:'O planejamento e controle operacional estão definidos para os processos de realização do produto/serviço?', norma_ref:'ISO 9001:2015 – 8.1', requisito:'A organização deve planejar, implementar, controlar, manter e reter informação documentada para ter confiança de que os processos foram realizados conforme planejado e para demonstrar a conformidade de produtos e serviços.', evidencias:['Instruções de trabalho / procedimentos operacionais por processo','Critérios de aceitação de produtos e serviços definidos','Registros de controle operacional'] },
  { id:'Q11', section:'5. Operação (Seção 8)', question:'Os requisitos de clientes são determinados, revisados e comunicados antes do fornecimento do produto/serviço?', norma_ref:'ISO 9001:2015 – 8.2', requisito:'A organização deve assegurar que tem a capacidade de atender os requisitos de produtos e serviços a serem oferecidos aos clientes, realizando análise crítica antes de se comprometer com o fornecimento.', evidencias:['Contratos/pedidos com requisitos do cliente documentados','Registros de análise crítica de contratos','Evidência de comunicação de requisitos alterados'] },
  { id:'Q12', section:'5. Operação (Seção 8)', question:'Fornecedores externos são controlados? Há critérios de qualificação e avaliação periódica?', norma_ref:'ISO 9001:2015 – 8.4', requisito:'A organização deve assegurar que os processos, produtos e serviços fornecidos externamente não afetam de forma adversa sua capacidade de atender os requisitos dos clientes, avaliando fornecedores criticamente.', evidencias:['Lista de fornecedores qualificados/aprovados','Procedimento de qualificação e avaliação de fornecedores críticos','Registros de avaliação periódica de desempenho de fornecedores'] },
  { id:'Q13', section:'5. Operação (Seção 8)', question:'Produtos não conformes são identificados, segregados e tratados para evitar uso não intencional?', norma_ref:'ISO 9001:2015 – 8.7', requisito:'A organização deve assegurar que as saídas que não estejam conformes com seus requisitos sejam identificadas e controladas para prevenir seu uso ou entrega não intencionais.', evidencias:['Procedimento de controle de produto não conforme','Área de segregação de material NC identificada (etiquetas, local físico)','Registros de disposição de produtos NCs (retrabalho, descarte, concessão)'] },
  // 6. Avaliação de Desempenho
  { id:'Q14', section:'6. Avaliação de Desempenho (Seção 9)', question:'A satisfação dos clientes é monitorada com metodologia e indicadores definidos?', norma_ref:'ISO 9001:2015 – 9.1.2', requisito:'A organização deve monitorar a percepção dos clientes do grau em que seus requisitos foram atendidos, determinando os métodos para obter, monitorar e analisar criticamente essa informação.', evidencias:['Pesquisa de satisfação de clientes com resultados documentados','Indicador de satisfação com meta definida e histórico de resultados','Análise de reclamações e elogios de clientes'] },
  { id:'Q15', section:'6. Avaliação de Desempenho (Seção 9)', question:'A alta direção realiza Análise Crítica do SGQ periodicamente com registros (atas)?', norma_ref:'ISO 9001:2015 – 9.3', requisito:'A alta direção deve analisar criticamente o SGQ da organização, em intervalos planejados, para assegurar sua contínua conveniência, adequação, eficácia e alinhamento com a direção estratégica.', evidencias:['Atas de reunião de Análise Crítica (mínimo anual)','Evidência de análise das entradas obrigatórias (indicadores, auditorias, reclamações, riscos)','Registro de saídas da análise crítica com decisões e ações'] },
  // 7. Melhoria Contínua
  { id:'Q16', section:'7. Melhoria Contínua (Seção 10)', question:'São tomadas ações corretivas eficazes para reclamações de clientes com rastreamento até a causa raiz?', norma_ref:'ISO 9001:2015 – 10.2', requisito:'A organização deve reagir à não conformidade, tomar ação para controlá-la e corrigi-la, investigar a causa raiz e implementar ações para que não se repita ou ocorra em outro local.', evidencias:['Registro de reclamações de clientes com data de abertura e fechamento','Respostas formais aos clientes com ações tomadas','Evidência de análise de causa raiz (5 Porquês, Ishikawa)'] },
  { id:'Q17', section:'7. Melhoria Contínua (Seção 10)', question:'A organização busca proativamente a melhoria contínua do SGQ?', norma_ref:'ISO 9001:2015 – 10.3', requisito:'A organização deve continuamente melhorar a conveniência, a adequação e a eficácia do SGQ, considerando os resultados da análise e avaliação e as saídas da análise crítica pela direção.', evidencias:['Projetos de melhoria contínua em andamento ou concluídos (Kaizen, 5S, PDCA)','Evidência de melhoria nos indicadores de qualidade ao longo do tempo','Ações proativas de melhoria não decorrentes apenas de NCs'] },
  // 8. Requisitos Específicos Tiger Rentank
  { id:'Q18', section:'8. Requisitos Específicos – Tiger Rentank', question:'O fornecedor possui critérios para prevenção de trabalho infantil e trabalho análogo à escravidão?', norma_ref:'NBR 16001 / ODS 8 / Legislação Trabalhista', requisito:'A organização deve ter política de responsabilidade social e controles de recrutamento que impeçam o uso de trabalho infantil (menores de 18 anos em atividades noturnas, perigosas ou insalubres) ou análogo à escravidão.', evidencias:['Política de Responsabilidade Social ou código de conduta com cláusula específica','Procedimento de recrutamento com checagem de documentos','Declaração do fornecedor sobre não utilização de trabalho irregular'] },
  { id:'Q19', section:'8. Requisitos Específicos – Tiger Rentank', question:'O fornecedor controla subcontratados que atuam em seu nome para a Tiger Rentank?', norma_ref:'ISO 9001:2015 – 8.4 / Contrato Tiger Rentank', requisito:'A organização deve assegurar que os processos, produtos e serviços de fornecedores externos não afetam negativamente sua entrega ao cliente Tiger Rentank, aplicando os mesmos requisitos QSMS à cadeia de subcontratação.', evidencias:['Lista de subcontratados com qualificação documentada','Cláusulas contratuais com subcontratados sobre requisitos QSMS','Evidência de avaliação e monitoramento dos subcontratados'] },
  { id:'Q20', section:'8. Requisitos Específicos – Tiger Rentank', question:'O fornecedor cumpre com todo o licenciamento legal aplicável ao escopo de atividades?', norma_ref:'Legislação Brasileira', requisito:'A organização deve manter atualizados todos os alvarás, licenças e registros legais exigidos para o exercício de suas atividades, em conformidade com a legislação federal, estadual e municipal aplicável.', evidencias:['Alvará de funcionamento vigente','Licenças técnicas aplicáveis (CREA, ABNT, INMETRO, órgão ambiental)','Certidões de regularidade fiscal e trabalhista (CND, FGTS, Trabalhista)'] },
];

const SEGURANCA: ChecklistItem[] = [
  { id:'S1', section:'1. Liderança e Política de SSO (Seção 5)', question:'Trabalhadores participam e são consultados nos processos de SSO (CIPA, comitês de segurança)?', norma_ref:'ISO 45001:2018 – 5.4', requisito:'A organização deve estabelecer, implementar e manter processos para consulta e participação dos trabalhadores e representantes dos trabalhadores no desenvolvimento, planejamento, implementação, avaliação de desempenho e ações de melhoria do SGS.', evidencias:['Ata de posse e reuniões mensais da CIPA','Registros de participação dos trabalhadores em análise de risco (APR, ART)','Evidência de consulta aos trabalhadores em mudanças de procedimentos de SSO'] },
  { id:'S2', section:'2. Gestão de Perigos e Riscos Ocupacionais', question:'O PGR (Programa de Gerenciamento de Riscos) está elaborado, atualizado e implementado conforme NR-01:2024?', norma_ref:'NR-01:2024', requisito:'O empregador deve elaborar, implementar, monitorar e revisar o PGR, contendo o inventário de riscos (físicos, químicos, biológicos, ergonômicos e acidentes) e o plano de ação para eliminação ou controle dos riscos identificados.', evidencias:['PGR documentado com inventário de riscos e plano de ação','Data de elaboração/revisão compatível com NR-01:2024','Responsável técnico identificado (profissional de SSO habilitado)','Evidência de revisão após mudanças relevantes no processo'] },
  { id:'S3', section:'2. Gestão de Perigos e Riscos Ocupacionais', question:'Perigos graves e iminentes são tratados com prioridade? Há procedimento de paralisação de atividade?', norma_ref:'ISO 45001:2018 – 7.3 / NR-01', requisito:'A organização deve assegurar que os trabalhadores têm autoridade para se afastar de situações que considerem que apresentam perigo grave e iminente à vida ou à saúde, sem retaliação.', evidencias:['Procedimento de paralisação de atividades por risco grave documentado','Treinamento dos trabalhadores sobre o direito de recusa','Registro de acionamento do procedimento de emergência (quando aplicável)'] },
  { id:'S4', section:'3. Saúde Ocupacional', question:'A organização possui PCMSO elaborado por médico do trabalho e implementado?', norma_ref:'NR-07', requisito:'A empresa deve elaborar e implementar o PCMSO com o objetivo de promoção e preservação da saúde dos trabalhadores, assinado por médico do trabalho coordenador.', evidencias:['PCMSO documentado com assinatura do médico do trabalho responsável','Data de elaboração/revisão (deve ser anual)','Identificação dos riscos e exames previstos por função'] },
  { id:'S5', section:'3. Saúde Ocupacional', question:'Os ASOs (Admissional, Periódico, Retorno, Mudança de Função, Demissional) estão em dia para todos os colaboradores?', norma_ref:'NR-07', requisito:'O empregador deve garantir a realização dos exames médicos previstos no PCMSO, mantendo os ASOs arquivados e respeitando as periodicidades mínimas estabelecidas pela norma.', evidencias:['Amostragem de ASOs de colaboradores (verificar validade e exames realizados)','Controle de vencimento de ASOs (planilha ou sistema)','Ausência de colaboradores com ASO vencido em atividade'] },
  { id:'S6', section:'3. Saúde Ocupacional', question:'Monitoramento biológico (IBMP) é realizado para trabalhadores expostos a agentes químicos que exigem?', norma_ref:'NR-07 / NR-15', requisito:'Para os agentes químicos que possuem Índice Biológico Máximo Permitido (IBMP), o PCMSO deve prever e executar o monitoramento biológico dos trabalhadores expostos.', evidencias:['Identificação dos agentes químicos com IBMP no PCMSO','Resultados de exames biológicos realizados (BEI/IBMP)','Ações tomadas quando IBMP foi ultrapassado'] },
  { id:'S7', section:'4. Equipamentos de Proteção', question:'A organização fornece EPIs certificados (CA INMETRO) adequados para cada função/risco, com controle de entrega?', norma_ref:'NR-06', requisito:'A empresa é obrigada a fornecer aos empregados, gratuitamente, EPI adequado ao risco, em perfeito estado de conservação e funcionamento, com CA válido emitido pelo MTE/SINMETRO.', evidencias:['Ficha de controle de entrega de EPIs por colaborador (assinada)','Lista de EPIs com números de CA e validade','Evidência de substituição de EPIs vencidos ou danificados'] },
  { id:'S8', section:'4. Equipamentos de Proteção', question:'EPCs estão instalados e em bom estado? (Guardas de máquinas, proteções coletivas, sinalização de segurança)', norma_ref:'NR-12 / NR-26', requisito:'As máquinas e equipamentos devem ter dispositivos de proteção coletiva para proteger as zonas perigosas, e as áreas de risco devem estar devidamente sinalizadas conforme NR-26.', evidencias:['Inspeção visual de guardas e proteções de máquinas e equipamentos','Sinalização de segurança adequada (NR-26) nas áreas de risco','Registros de inspeção periódica dos EPCs instalados'] },
  { id:'S9', section:'4. Equipamentos de Proteção', question:'Equipamentos de combate a incêndio são inspecionados periodicamente com registros?', norma_ref:'NR-23 / ABNT NBR 12693', requisito:'Os equipamentos de combate a incêndio devem ser mantidos em condições de uso, inspecionados periodicamente por empresa especializada, com registros atualizados.', evidencias:['Tags de inspeção nos extintores com data de validade dentro do prazo','Contrato com empresa especializada em manutenção de extintores','Relatório de inspeção do sistema de hidrantes (quando aplicável)'] },
  { id:'S10', section:'5. Treinamento e Capacitação em SSO', question:'Colaboradores recebem treinamentos específicos conforme NRs aplicáveis às suas atividades?', norma_ref:'NR-10, NR-33, NR-35, NR-12 etc.', requisito:'O empregador deve capacitar os trabalhadores, antes de seu início nas atividades, sobre os riscos a que estão expostos e as medidas de prevenção e proteção existentes, conforme as NRs aplicáveis a cada função.', evidencias:['Matriz de treinamentos obrigatórios por cargo/função','Certificados de treinamento individuais (verificar carga horária, conteúdo e validade)','Controle de vencimento de treinamentos obrigatórios'] },
  { id:'S11', section:'6. CIPA e Representação dos Trabalhadores', question:'A CIPA está constituída, treinada e em funcionamento conforme NR-05?', norma_ref:'NR-05', requisito:'As empresas com número de empregados acima dos limites estabelecidos no Quadro I da NR-05 são obrigadas a organizar e manter em funcionamento a CIPA, com membros eleitos e designados, treinados conforme a norma.', evidencias:['Ata de eleição e posse da CIPA vigente','Certificados de treinamento de 20h dos cipeiros','Mapa de riscos elaborado pela CIPA'] },
  { id:'S12', section:'6. CIPA e Representação dos Trabalhadores', question:'As reuniões mensais da CIPA ocorrem regularmente com atas registradas?', norma_ref:'NR-05', requisito:'A CIPA reunir-se-á, ordinariamente, uma vez por mês, em local apropriado e durante o expediente normal da empresa. As reuniões serão registradas em livro ou sistema informatizado.', evidencias:['Livro de atas ou arquivo de atas dos últimos 12 meses','Frequência das reuniões (mínimo mensal)','Pauta abordando indicadores de SSO, acidentes e ações preventivas'] },
  { id:'S13', section:'7. Plano de Emergência e Brigada', question:'Há brigada de emergência treinada e dimensionada conforme ABNT NBR 14276?', norma_ref:'ABNT NBR 14276', requisito:'A brigada de emergência deve ser dimensionada conforme a NBR 14276, com brigadistas treinados para combate a incêndio, primeiros socorros, abandono de área e comunicação de emergências.', evidencias:['Lista de brigadistas com certificados de treinamento válidos','Dimensionamento da brigada conforme NBR 14276','Plano de emergência documentado com fluxo de acionamento'] },
  { id:'S14', section:'8. Investigação de Acidentes e Indicadores', question:'O fornecedor notifica a Tiger Rentank sobre acidentes/incidentes que envolvam seus colaboradores em atividades contratadas?', norma_ref:'Contrato Tiger Rentank / ISO 45001:2018', requisito:'A organização deve assegurar a comunicação imediata de acidentes, doenças ocupacionais e incidentes com alto potencial de dano ao cliente contratante, conforme cláusulas contratuais e requisitos da norma.', evidencias:['Cláusula contratual de notificação de acidentes','Procedimento interno de notificação ao cliente','Registro de notificações realizadas nos últimos 12 meses (quando aplicável)'] },
  { id:'S15', section:'8. Investigação de Acidentes e Indicadores', question:'Indicadores de SSO são monitorados e analisados periodicamente?', norma_ref:'ISO 45001:2018 – 9.1', requisito:'A organização deve monitorar, medir, analisar e avaliar o desempenho de SSO, incluindo o cumprimento de requisitos legais e outros, o progresso na consecução dos objetivos e a eficácia dos controles.', evidencias:['Painel de indicadores de SSO (Taxa de Frequência, Taxa de Gravidade, quase-acidentes, DDS realizados)','Relatórios mensais/trimestrais de desempenho de SSO','Evidência de análise crítica dos indicadores pela direção'] },
  { id:'S16', section:'9. Normas Regulamentadoras Específicas', question:'NR-12 (Segurança em Máquinas e Equipamentos) é atendida?', norma_ref:'NR-12', requisito:'As máquinas e equipamentos utilizados nas atividades devem atender aos requisitos de segurança da NR-12, incluindo dispositivos de proteção, sinalização, aterramento e laudo de conformidade quando exigível.', evidencias:['Laudo de conformidade NR-12 por responsável técnico habilitado','Proteções de máquinas instaladas e íntegras (inspeção visual)','Procedimentos de lockout/tagout implementados'] },
  { id:'S17', section:'9. Normas Regulamentadoras Específicas', question:'NR-33 (Espaço Confinado) é atendida quando aplicável?', norma_ref:'NR-33', requisito:'Para atividades em espaços confinados, a organização deve elaborar e implementar o Programa de Espaço Confinado (PEC), garantindo que apenas trabalhadores treinados e autorizados realizem essas atividades.', evidencias:['Inventário de espaços confinados identificados','PET preenchida para atividades em espaço confinado','Certificados de treinamento em NR-33 dos trabalhadores envolvidos'] },
  { id:'S18', section:'9. Normas Regulamentadoras Específicas', question:'NR-35 (Trabalho em Altura) é atendida quando aplicável?', norma_ref:'NR-35', requisito:'Para trabalhos em altura acima de 2 metros, onde haja risco de queda, a organização deve garantir treinamento específico, emissão de Permissão de Trabalho e uso adequado dos EPIs contra queda.', evidencias:['Permissão de Trabalho em Altura preenchida para atividades aplicáveis','Certificados de treinamento NR-35 válidos (máximo 2 anos)','Checklist de inspeção de EPIs contra queda (talabarte, trava-queda, cinto)'] },
];

const AMBIENTAL: ChecklistItem[] = [
  { id:'A1', section:'1. Licenciamento e Requisitos Legais Ambientais', question:'A organização possui todas as licenças ambientais aplicáveis ao seu escopo (LI, LO, LAS)?', norma_ref:'CONAMA 237/97 / Legislação Estadual', requisito:'O empreendedor é obrigado a obter licença ambiental do órgão competente para construção, instalação, ampliação e funcionamento de estabelecimentos e atividades utilizadoras de recursos ambientais consideradas efetiva ou potencialmente poluidoras.', evidencias:['Licenças ambientais vigentes (LI, LO, LAS) – verificar número, validade e condicionantes','Protocolo de renovação (quando em processo de renovação)','Atendimento às condicionantes das licenças vigentes'] },
  { id:'A2', section:'2. Gestão de Resíduos Sólidos', question:'A organização possui PGRS (Plano de Gerenciamento de Resíduos Sólidos) implementado?', norma_ref:'Lei 12.305/2010 – PNRS', requisito:'Os geradores de resíduos sólidos industriais e de serviços de saúde são obrigados a elaborar e implementar o PGRS, com as medidas necessárias para o gerenciamento ambientalmente adequado dos resíduos gerados.', evidencias:['Documento do PGRS elaborado e implementado','Registros de resíduos gerados por tipo (planilha mensal ou sistema)','Responsável técnico identificado no PGRS'] },
  { id:'A3', section:'2. Gestão de Resíduos Sólidos', question:'Os resíduos são classificados (NBR 10004), segregados, acondicionados e destinados corretamente?', norma_ref:'ABNT NBR 10004 / CONAMA 313', requisito:'Os resíduos sólidos devem ser classificados quanto à periculosidade (Classes I, IIA e IIB) conforme ABNT NBR 10004, sendo segregados na fonte, acondicionados em recipientes adequados e destinados a aterros, incineradores ou recicladores licenciados.', evidencias:['Classificação dos resíduos gerados conforme NBR 10004','Recipientes de coleta seletiva identificados por tipo de resíduo','Certificados de destinação final dos resíduos (últimos 12 meses)'] },
  { id:'A4', section:'2. Gestão de Resíduos Sólidos', question:'O transporte e destinação final de resíduos perigosos é realizado por empresa licenciada? MTRs emitidos?', norma_ref:'CONAMA 313 / SIGOR / Lei 12.305/2010', requisito:'Os resíduos perigosos (Classe I) devem ser transportados por empresa licenciada pelo órgão ambiental competente, com emissão do Manifesto de Transporte de Resíduos (MTR) no sistema SIGOR ou equivalente estadual.', evidencias:['MTRs emitidos nos últimos 12 meses (sistema SIGOR ou equivalente estadual)','Licenças do transportador e do destinatário final vigentes','Rastreabilidade do destino dos resíduos perigosos'] },
  { id:'A5', section:'2. Gestão de Resíduos Sólidos', question:'Logística reversa é implementada para produtos sujeitos à legislação (embalagens, óleos, lâmpadas, pilhas)?', norma_ref:'Lei 12.305/2010 – Art. 33', requisito:'Os fabricantes, importadores, distribuidores e comerciantes de embalagens em geral, óleos lubrificantes, pilhas e baterias, pneus, lâmpadas fluorescentes e eletroeletrônicos são obrigados a estruturar e implementar sistemas de logística reversa.', evidencias:['Identificação dos produtos sujeitos a logística reversa utilizados','Registros de devolução de embalagens, óleos usados, pilhas, lâmpadas','Contratos ou adesão a acordos setoriais de logística reversa'] },
  { id:'A6', section:'3. Gestão de Efluentes e Emissões', question:'Os efluentes líquidos são tratados e lançados dentro dos padrões legais? Há monitoramento?', norma_ref:'CONAMA 430/2011 / Legislação Estadual', requisito:'Os efluentes somente podem ser lançados nos corpos receptores depois de tratados, respeitando as condições, padrões e exigências estabelecidos na Resolução CONAMA 430/2011 e na legislação estadual aplicável.', evidencias:['Laudos analíticos de efluentes dos últimos 12 meses (parâmetros dentro do limite legal)','Sistema de tratamento de efluentes instalado e em operação','Relatórios de automonitoramento enviados ao órgão ambiental (quando exigível)'] },
  { id:'A7', section:'3. Gestão de Efluentes e Emissões', question:'Emissões atmosféricas são monitoradas e controladas dentro dos padrões legais?', norma_ref:'CONAMA 382/2006 / Resoluções Estaduais', requisito:'As fontes fixas de emissão de poluentes atmosféricos devem ser monitoradas periodicamente, com os resultados dentro dos padrões de emissão estabelecidos pelas resoluções do CONAMA e legislações estaduais.', evidencias:['Laudos de monitoramento de emissões atmosféricas (fontes fixas)','Relatórios de Auto-Monitoramento (RAM) enviados ao órgão ambiental (quando exigível)','Inventário de fontes fixas de emissão'] },
  { id:'A8', section:'4. Gestão de Produtos Químicos e Emergências', question:'As FISPQs estão disponíveis e atualizadas para todos os produtos químicos utilizados?', norma_ref:'ABNT NBR 14725 / NR-26', requisito:'O empregador é obrigado a manter as Fichas de Informações de Segurança de Produtos Químicos (FISPQ) atualizadas e acessíveis a todos os trabalhadores que manuseiam essas substâncias, conforme ABNT NBR 14725.', evidencias:['Inventário de produtos químicos utilizado','FISPQs disponíveis para cada produto (papel ou sistema digital acessível)','Evidência de treinamento dos trabalhadores sobre as FISPQs'] },
  { id:'A9', section:'4. Gestão de Produtos Químicos e Emergências', question:'O armazenamento de produtos químicos e inflamáveis atende aos requisitos de segurança e ambiente?', norma_ref:'NR-20 / NR-26 / ABNT NBR 17505', requisito:'O armazenamento de líquidos inflamáveis e combustíveis deve atender aos requisitos da NR-20 e ABNT NBR 17505, com contenção secundária, sinalização, ventilação adequada e proteção contra fontes de ignição.', evidencias:['Inspeção visual do local de armazenamento de químicos','Contenção secundária dimensionada (110% do maior volume armazenado)','Sinalização e identificação de riscos no local de armazenamento'] },
];

// ─── Score helpers ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'audit_screen_state_v2';

type TabId = 'qualidade' | 'seguranca' | 'ambiental' | 'plano';

function calcScore(items: ChecklistItem[], states: Record<string, ItemState>) {
  const evaluated = items.filter(it => {
    const av = states[it.id]?.avaliacao;
    return !!av && av !== 'NA';
  });
  if (!evaluated.length) return null;
  const ok = evaluated.filter(it => states[it.id]?.avaliacao === 'OK').length;
  const om = evaluated.filter(it => states[it.id]?.avaliacao === 'OM').length;
  // OK=1.0, OM=0.5, NC=0
  const score = ((ok + om * 0.5) / evaluated.length) * 100;
  return Math.round(score);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AuditScreenProps {
  // We don't use system data for this checklist
  procedures?: unknown[];
  records?: unknown[];
  documents?: unknown[];
  obligations?: unknown[];
  nonConformities?: unknown[];
}

export function AuditScreen(_props: AuditScreenProps) {
  const [tab, setTab] = useState<TabId>('qualidade');
  const [info, setInfo] = useState<AuditInfo>({
    auditor: 'Luiz Felipe Nascimento',
    data: new Date().toISOString().slice(0, 10),
    tipo: 'Periódica',
    modalidade: 'Presencial',
  });
  const [states, setStates] = useState<Record<string, ItemState>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(states)); } catch {}
  }, [states]);

  function getState(id: string): ItemState {
    return states[id] ?? { avaliacao: '', evidencia_observada: '', parecer: '' };
  }

  function setState(id: string, patch: Partial<ItemState>) {
    setStates(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));
    setSaved(false);
  }

  function handleSave() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(states)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!window.confirm('Limpar todos os dados da auditoria?')) return;
    setStates({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Scores
  const qScore = calcScore(QUALIDADE, states);
  const sScore = calcScore(SEGURANCA, states);
  const aScore = calcScore(AMBIENTAL, states);
  const allItems = [...QUALIDADE, ...SEGURANCA, ...AMBIENTAL];
  const globalScore = calcScore(allItems, states);

  // NC/OM lists for Plano de Ação
  const ncItems = allItems.filter(it => states[it.id]?.avaliacao === 'NC');
  const omItems = allItems.filter(it => states[it.id]?.avaliacao === 'OM');

  function renderItems(items: ChecklistItem[]) {
    // Group by section
    const sections: Record<string, ChecklistItem[]> = {};
    items.forEach(it => {
      if (!sections[it.section]) sections[it.section] = [];
      sections[it.section].push(it);
    });

    return Object.entries(sections).map(([section, sectionItems]) => (
      <div key={section} className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 px-1 py-2 border-b border-slate-200 mb-2">
          {section}
        </div>
        <div className="space-y-2">
          {sectionItems.map(item => {
            const st = getState(item.id);
            const expanded = expandedItems[item.id] ?? false;
            const av = st.avaliacao;
            const avColor = av === 'OK' ? 'bg-emerald-50 border-emerald-200' : av === 'OM' ? 'bg-amber-50 border-amber-200' : av === 'NC' ? 'bg-red-50 border-red-200' : av === 'NA' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200';

            return (
              <div key={item.id} className={`rounded-xl border ${avColor} overflow-hidden transition-colors`}>
                {/* Question header */}
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 shrink-0 w-6">{item.id}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className="flex-1 text-left text-xs font-semibold text-slate-800 leading-snug hover:text-blue-700 transition-colors"
                    >
                      {item.question}
                    </button>
                    {expanded
                      ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 ml-9">
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{item.norma_ref}</span>
                  </div>

                  {/* Avaliação buttons */}
                  <div className="flex items-center gap-1.5 mt-2.5 ml-9">
                    {(['OK', 'OM', 'NC', 'NA'] as Avaliacao[]).map(opt => {
                      const active = av === opt;
                      const cls = opt === 'OK'
                        ? active ? 'bg-emerald-600 text-white border-emerald-600' : 'text-emerald-600 border-emerald-300 hover:bg-emerald-50'
                        : opt === 'OM'
                        ? active ? 'bg-amber-500 text-white border-amber-500' : 'text-amber-600 border-amber-300 hover:bg-amber-50'
                        : opt === 'NC'
                        ? active ? 'bg-red-600 text-white border-red-600' : 'text-red-600 border-red-300 hover:bg-red-50'
                        : active ? 'bg-slate-500 text-white border-slate-500' : 'text-slate-500 border-slate-300 hover:bg-slate-50';
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setState(item.id, { avaliacao: active ? '' : opt })}
                          className={`px-2.5 py-1 text-[11px] font-bold border rounded-lg transition-all ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {av && <span className="ml-1 text-[11px] text-slate-400">{av === 'OK' ? 'Conforme' : av === 'OM' ? 'Oportunidade de Melhoria' : av === 'NC' ? 'Não Conformidade' : 'Não Avaliado'}</span>}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-slate-200 px-4 py-3 space-y-3 bg-white/70">
                    {/* Requisito */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Requisito da Norma</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.requisito}</p>
                    </div>
                    {/* Evidências esperadas */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Evidências Esperadas</p>
                      <ul className="space-y-0.5">
                        {item.evidencias.map((ev, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <span className="text-slate-400 mt-0.5">•</span>{ev}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Evidência Observada */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Evidência Observada</label>
                      <textarea
                        rows={2}
                        value={st.evidencia_observada}
                        onChange={e => setState(item.id, { evidencia_observada: e.target.value })}
                        placeholder="Descreva o que foi constatado…"
                        className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-white"
                      />
                    </div>
                    {/* Parecer */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Parecer do Auditor</label>
                      <textarea
                        rows={2}
                        value={st.parecer}
                        onChange={e => setState(item.id, { parecer: e.target.value })}
                        placeholder="Achado, ressalva ou recomendação…"
                        className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ));
  }

  function scoreColor(s: number | null) {
    if (s === null) return 'text-slate-400';
    if (s >= 80) return 'text-emerald-600';
    if (s >= 60) return 'text-amber-600';
    return 'text-red-600';
  }
  function scoreBg(s: number | null) {
    if (s === null) return 'bg-slate-50 border-slate-200';
    if (s >= 80) return 'bg-emerald-50 border-emerald-200';
    if (s >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Auditoria Interna QSMS</h2>
            <p className="text-[11px] text-slate-400">ISO 9001 · ISO 45001 · ISO 14001 — Tiger Rentank</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg">
            <RotateCcw className="w-3.5 h-3.5" /> Limpar
          </button>
          <button onClick={handleSave} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
            <Save className="w-3.5 h-3.5" /> {saved ? 'Salvo!' : 'Salvar'}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      {/* ── Info da auditoria ── */}
      <div className="px-6 py-3 bg-white border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Auditor</label>
            <input value={info.auditor} onChange={e => setInfo(p => ({...p, auditor: e.target.value}))} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Data</label>
            <input type="date" value={info.data} onChange={e => setInfo(p => ({...p, data: e.target.value}))} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Tipo</label>
            <select value={info.tipo} onChange={e => setInfo(p => ({...p, tipo: e.target.value as AuditInfo['tipo']}))} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option>Inicial</option><option>Periódica</option><option>Extraordinária</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Modalidade</label>
            <select value={info.modalidade} onChange={e => setInfo(p => ({...p, modalidade: e.target.value as AuditInfo['modalidade']}))} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option>Presencial</option><option>Remota</option><option>Híbrida</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Score cards ── */}
      <div className="px-6 py-3 bg-white border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-xl border px-4 py-2.5 ${scoreBg(globalScore)}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Score Global</p>
            <p className={`text-xl font-extrabold ${scoreColor(globalScore)}`}>{globalScore !== null ? `${globalScore}%` : '—'}</p>
          </div>
          <div className={`rounded-xl border px-4 py-2.5 ${scoreBg(qScore)}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Qualidade</p>
            <p className={`text-xl font-extrabold ${scoreColor(qScore)}`}>{qScore !== null ? `${qScore}%` : '—'}</p>
          </div>
          <div className={`rounded-xl border px-4 py-2.5 ${scoreBg(sScore)}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Segurança</p>
            <p className={`text-xl font-extrabold ${scoreColor(sScore)}`}>{sScore !== null ? `${sScore}%` : '—'}</p>
          </div>
          <div className={`rounded-xl border px-4 py-2.5 ${scoreBg(aScore)}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Ambiental</p>
            <p className={`text-xl font-extrabold ${scoreColor(aScore)}`}>{aScore !== null ? `${aScore}%` : '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-6 py-2 bg-white border-b border-slate-100 print:hidden">
        {[
          { id: 'qualidade' as TabId, label: 'ISO 9001', count: QUALIDADE.length, icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'seguranca' as TabId, label: 'ISO 45001', count: SEGURANCA.length, icon: <Shield className="w-3.5 h-3.5" /> },
          { id: 'ambiental' as TabId, label: 'ISO 14001', count: AMBIENTAL.length, icon: <Leaf className="w-3.5 h-3.5" /> },
          { id: 'plano' as TabId, label: `Plano de Ação`, count: ncItems.length + omItems.length, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t.icon} {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'qualidade' && renderItems(QUALIDADE)}
        {tab === 'seguranca' && renderItems(SEGURANCA)}
        {tab === 'ambiental' && renderItems(AMBIENTAL)}

        {tab === 'plano' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Itens classificados como <strong>NC</strong> (Não Conformidade) e <strong>OM</strong> (Oportunidade de Melhoria) — requer plano de ação com causa raiz, responsável e prazo.</p>

            {ncItems.length === 0 && omItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-sm font-semibold text-slate-600">Nenhuma NC ou OM registrada</p>
                <p className="text-xs text-slate-400">Avalie os itens nas abas ISO 9001, ISO 45001 e ISO 14001.</p>
              </div>
            )}

            {ncItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">Não Conformidades ({ncItems.length})</h3>
                </div>
                <div className="space-y-2">
                  {ncItems.map(item => {
                    const st = getState(item.id);
                    return (
                      <div key={item.id} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-[10px] font-mono font-bold text-red-400 shrink-0 mt-0.5">{item.id}</span>
                          <p className="text-xs font-semibold text-slate-800">{item.question}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 ml-6 mb-2 font-mono">{item.norma_ref}</p>
                        {st.evidencia_observada && <p className="text-xs text-slate-600 ml-6 mb-1"><span className="font-semibold">Evidência: </span>{st.evidencia_observada}</p>}
                        {st.parecer && <p className="text-xs text-slate-600 ml-6"><span className="font-semibold">Parecer: </span>{st.parecer}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {omItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Oportunidades de Melhoria ({omItems.length})</h3>
                </div>
                <div className="space-y-2">
                  {omItems.map(item => {
                    const st = getState(item.id);
                    return (
                      <div key={item.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-[10px] font-mono font-bold text-amber-500 shrink-0 mt-0.5">{item.id}</span>
                          <p className="text-xs font-semibold text-slate-800">{item.question}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 ml-6 mb-2 font-mono">{item.norma_ref}</p>
                        {st.evidencia_observada && <p className="text-xs text-slate-600 ml-6 mb-1"><span className="font-semibold">Evidência: </span>{st.evidencia_observada}</p>}
                        {st.parecer && <p className="text-xs text-slate-600 ml-6"><span className="font-semibold">Parecer: </span>{st.parecer}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
