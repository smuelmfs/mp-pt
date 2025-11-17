# 📽️ Roteiro de Apresentação – MyPrint.pt

Documento para ser lido enquanto se mostram as telas do sistema (Admin e Comercial).  
Estruture cada tópico como uma fala curta para acompanhar a demonstração.

---

## 1. Mensagem de Abertura

- **Contexto**: “Pessoal, o MyPrint.pt já está operacional com todas as áreas principais carregadas.”  
- **Sobre os dados**: “Optámos por importar o máximo possível da planilha que vocês utilizavam. Porém, aquela planilha tinha fórmulas, lógicas e colunas auxiliares que não foram pensadas para exportação direta.”  
- **Expectativa**: “Então alguns campos chegaram incompletos ou com interpretações diferentes do que estavam acostumados. Era inevitável dado o formato original.”  
- **Direção**: “O ideal daqui para frente é realizar os cadastros diretamente no sistema. Assim evitamos novas rodadas de limpeza da planilha, que hoje já se tornou inviável de reaproveitar.”

> **Frase-chave**: “A planilha era ótima como ferramenta de trabalho, mas não como base de dados. O sistema precisa ser a única fonte de verdade.”

---

## 2. Roteiro – Área Administrativa (ADMIN)

Ordem sugerida para a apresentação; adapte conforme as telas disponíveis.

### 2.1 Dashboard / Guia de Onboarding (`/admin/guide`)
- **Mensagem**: “Aqui temos um passo a passo para garantir que todas as etapas de configuração sejam concluídas.”  
- **Reforço**: “É também um checklist visual para medir o progresso da migração manual que continua.”

### 2.2 Configurações Globais (`/admin/config`)
- **Foco**: Margem padrão, markup operacional, degrau de arredondamento, IVA, fatores de perda.  
- **Destaque**: “Estes valores aplicam-se a todo o sistema quando não há regras específicas.”  
- **Gancho da planilha**: “Antes esses números ficavam espalhados em abas e células; agora ficam centralizados e seguros.”

### 2.3 Materiais (`/admin/materials`)
- **Fala**: “Cada material pode ter variantes, custo, fornecedor e unidade de medida.”  
- **Mensagem crítica**: “Importamos o que foi possível, mas alguns materiais tinham fórmulas dependentes. Revisem e completem aqui diretamente.”

### 2.4 Impressão (`/admin/printing`)
- **Foco**: Tipos de impressão, yield, setup e custos por hora.  
- **Dica**: “Usem os campos de perda e tempo padrão para manter o cálculo consistente entre produtos.”

### 2.5 Acabamentos (`/admin/finishes`)
- **Fala**: “Suporta cálculo por unidade, m², lote ou hora.”  
- **Reforço**: “Se na planilha existia alguma regra especial, registrem como acabamento ou como ajuste de margem dinâmica.”

### 2.6 Categorias & Produtos (`/admin/categories`, `/admin/products`)
- **Estratégia**: “Mostro primeiro a categoria para explicar heranças de arredondamento, depois um produto para ver overrides.”  
- **Mensagem**: “Cada produto agora guarda dimensões padrão, mínimos e regras de margem. O objetivo é que a planilha deixe de ser necessária para lembrar parâmetros.”

### 2.7 Margens (`/admin/margins`)
- **Diferencial**: “Aqui configuramos regras fixas e dinâmicas, com escopos por cliente, produto ou global.”  
- **Conexão com planilha**: “Todas aquelas colunas de descontos condicionais foram traduzidas para regras dinâmicas.”

### 2.8 Clientes e Fornecedores (`/admin/customers`, `/admin/suppliers`)
- **Clientes**: “Permite criar grupos, aplicar preços específicos e overrides por produto.”  
- **Fornecedores**: “Centraliza contatos e preços de compra.”  
- **Conclusão**: “Esta estrutura substitui de vez as múltiplas abas da planilha.”

---

## 3. Roteiro – Área Comercial (COMMERCIAL)

### 3.1 Lista de Orçamentos (`/quotes`)
- **Mensagem**: “Aqui os comerciais consultam, filtram e pesquisam todos os orçamentos.”  
- **Gancho**: “Não precisam mais pedir a planilha ao administrativo.”

### 3.2 Wizard de Criação (`/quotes/categories` → `/quotes/configurator`)
- **Passos**:
  1. Escolher categoria e produto.
  2. Informar quantidade e dimensões.
  3. Selecionar material, impressão e acabamentos.
- **Mensagem chave**: “O cálculo acontece em tempo real com base nos cadastros feitos no Admin.”  
- **Reforço**: “Quando algo parecer estranho, a origem do dado está no cadastro — não numa planilha paralela.”

### 3.3 Detalhe do Orçamento (`/quotes/[id]`)
- **Foco**: Breakdown completo (material, impressão, acabamento, margens, IVA).  
- **Uso prático**: “Permite explicar ao cliente cada componente do preço.”  
- **Mensagem final**: “Só conseguimos esse nível de transparência porque abandonamos a planilha e consolidamos tudo no sistema.”

---

## 4. Encerramento

- **Resumo**: “Importámos tudo o que dava, mas agora a fonte oficial é o MyPrint.pt.”  
- **Call to action**: “Por favor, façam novos cadastros diretamente aqui e revisem os registros que vieram da planilha.”  
- **Benefício**: “Dessa forma garantimos cálculo consistente, histórico, permissões e auditoria.”  
- **Próximo passo**: “Após a revisão final podemos desativar a planilha antiga para evitar divergências.”

---

## 5. Anotações Pessoais (preencha antes da reunião)

- Pontos sensíveis do cliente: __________________________________________  
- Telas que precisam de atenção especial: ________________________________  
- Responsáveis presentes: ______________________________________________  

> **Lembrete**: mantenha o tom colaborativo. Reforce que o sistema está pronto, mas depende de cadastros diretos para entregar todo o valor.

