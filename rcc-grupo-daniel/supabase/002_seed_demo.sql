-- ============================================================================
-- RCC GRUPO DANIEL — Dados fictícios para teste (demo)
-- Rodar após 001_schema_rcc.sql.
-- Obs: os usuários do app (rcc_users) são criados pelo próprio app no primeiro
-- login/cadastro. Para promover o primeiro administrador:
--   UPDATE rcc_users SET role='admin', status='ativo' WHERE email='seu@email.com';
-- ============================================================================

-- Membros
INSERT INTO rcc_members (id, full_name, birth_date, phone, whatsapp, email, gender, marital_status, ministry, cell_group, role_in_group, joined_at, status, accepted_terms, accepted_terms_at) VALUES
  ('a1000000-0000-0000-0000-000000000001','Daniel Ferreira Lima','1975-03-12','21988880001','21988880001','daniel.lima@example.com','masculino','casado','Coordenação','Núcleo Central','Coordenador','2010-02-01','ativo',true,now()),
  ('a1000000-0000-0000-0000-000000000002','Maria das Graças Souza','1968-07-25','21988880002','21988880002','maria.souza@example.com','feminino','viuvo','Intercessão','Célula Emaús','Líder de Intercessão','2012-05-10','ativo',true,now()),
  ('a1000000-0000-0000-0000-000000000003','José Carlos Andrade','1982-11-03','21988880003','21988880003','jose.andrade@example.com','masculino','casado','Tesouraria','Núcleo Central','Tesoureiro','2015-08-20','ativo',true,now()),
  ('a1000000-0000-0000-0000-000000000004','Ana Paula Rodrigues','1990-07-08','21988880004','21988880004','ana.rodrigues@example.com','feminino','solteiro','Música','Célula Betânia','Ministra de Música','2018-03-15','ativo',true,now()),
  ('a1000000-0000-0000-0000-000000000005','Pedro Henrique Costa','1995-01-30','21988880005','21988880005','pedro.costa@example.com','masculino','solteiro','Acolhida','Célula Betânia','Servo','2021-09-05','ativo',true,now()),
  ('a1000000-0000-0000-0000-000000000006','Tereza Cristina Nunes','1958-07-14','21988880006',NULL,'tereza.nunes@example.com','feminino','casado','Intercessão','Célula Emaús','Serva','2011-01-12','ativo',true,now()),
  ('a1000000-0000-0000-0000-000000000007','Lucas Gabriel Martins','2001-12-19','21988880007','21988880007','lucas.martins@example.com','masculino','solteiro','Música','Célula Betânia','Servo','2023-04-02','ativo',true,now()),
  ('a1000000-0000-0000-0000-000000000008','Rita de Cássia Oliveira','1971-04-22','21988880008','21988880008',NULL,'feminino','divorciado','Cozinha','Célula Emaús','Serva','2016-10-08','afastado',false,NULL),
  ('a1000000-0000-0000-0000-000000000009','Fernanda Alves Pinto','1988-09-17','21988880009','21988880009','fernanda.pinto@example.com','feminino','casado',NULL,NULL,NULL,'2026-05-01','visitante',false,NULL),
  ('a1000000-0000-0000-0000-000000000010','Antônio Sérgio Ramos','1949-06-29','21988880010',NULL,NULL,'masculino','casado','Intercessão','Célula Emaús','Servo','2010-02-01','inativo',false,NULL);

-- Fornecedores
INSERT INTO rcc_suppliers (id, name, document, phone, description) VALUES
  ('b1000000-0000-0000-0000-000000000001','Papelaria Central NI','12345678000190','2126670001','Materiais de escritório e impressão'),
  ('b1000000-0000-0000-0000-000000000002','Mercado Bom Preço','98765432000110','2126670002','Alimentos para eventos e cestas'),
  ('b1000000-0000-0000-0000-000000000003','Som & Luz Locações','45678912000155','2126670003','Locação de equipamento de som');

-- Receitas e despesas (mês corrente e anterior)
INSERT INTO rcc_financial_transactions (type, category, amount, date, description, payment_method, status, member_id) VALUES
  ('income','dizimo',150.00, date_trunc('month', current_date)::date + 4, 'Dízimo mensal', 'pix', 'confirmado', 'a1000000-0000-0000-0000-000000000001'),
  ('income','dizimo',100.00, date_trunc('month', current_date)::date + 4, 'Dízimo mensal', 'dinheiro', 'confirmado', 'a1000000-0000-0000-0000-000000000002'),
  ('income','oferta',235.50, date_trunc('month', current_date)::date + 8, 'Ofertas do grupo de oração', 'dinheiro', 'confirmado', NULL),
  ('income','campanha',500.00, date_trunc('month', current_date)::date + 10, 'Campanha do retiro anual', 'pix', 'confirmado', 'a1000000-0000-0000-0000-000000000004'),
  ('income','oferta',80.00, current_date, 'Oferta avulsa (aguardando conferência)', 'pix', 'pendente', NULL),
  ('income','dizimo',150.00, (date_trunc('month', current_date) - interval '1 month')::date + 4, 'Dízimo mensal', 'pix', 'confirmado', 'a1000000-0000-0000-0000-000000000001'),
  ('income','oferta',310.00, (date_trunc('month', current_date) - interval '1 month')::date + 12, 'Ofertas do grupo de oração', 'dinheiro', 'confirmado', NULL);

INSERT INTO rcc_financial_transactions (type, category, amount, date, description, payment_method, status, supplier_id) VALUES
  ('expense','material',85.90, date_trunc('month', current_date)::date + 6, 'Impressão de folhetos de formação', 'pix', 'pago', 'b1000000-0000-0000-0000-000000000001'),
  ('expense','alimentacao',147.35, date_trunc('month', current_date)::date + 9, 'Lanche partilha do grupo de oração', 'dinheiro', 'pago', 'b1000000-0000-0000-0000-000000000002'),
  ('expense','caridade',200.00, date_trunc('month', current_date)::date + 11, 'Cesta básica — família assistida', 'pix', 'pago', 'b1000000-0000-0000-0000-000000000002'),
  ('expense','evento',350.00, current_date, 'Sinal locação de som para o retiro', 'transferencia', 'pendente', 'b1000000-0000-0000-0000-000000000003'),
  ('expense','material',60.00, (date_trunc('month', current_date) - interval '1 month')::date + 15, 'Velas e materiais litúrgicos', 'dinheiro', 'pago', 'b1000000-0000-0000-0000-000000000001');

-- Reuniões + presença
INSERT INTO rcc_attendance_meetings (id, title, type, date, time, location, cell_group, visitors_count) VALUES
  ('c1000000-0000-0000-0000-000000000001','Grupo de Oração','grupo_oracao', current_date - 14, '19:30', 'Salão Paroquial', NULL, 3),
  ('c1000000-0000-0000-0000-000000000002','Grupo de Oração','grupo_oracao', current_date - 7, '19:30', 'Salão Paroquial', NULL, 1),
  ('c1000000-0000-0000-0000-000000000003','Célula Emaús','celula', current_date - 5, '20:00', 'Casa da Maria', 'Célula Emaús', 0);

INSERT INTO rcc_attendance_records (meeting_id, member_id, status) VALUES
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','present'),
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','present'),
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003','present'),
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004','absent'),
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000005','present'),
  ('c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000006','justified'),
  ('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','present'),
  ('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','present'),
  ('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000004','present'),
  ('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000005','absent'),
  ('c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000007','present'),
  ('c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','present'),
  ('c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000006','present');

-- Eventos futuros
INSERT INTO rcc_events (title, type, description, date, start_time, location) VALUES
  ('Grupo de Oração','grupo_oracao','Encontro semanal de louvor e oração.', current_date + 3, '19:30', 'Salão Paroquial'),
  ('Formação de Servos','formacao','Formação mensal para servos e líderes.', current_date + 10, '15:00', 'Sala 2 da Paróquia'),
  ('Retiro Anual do Grupo','retiro','Retiro de aprofundamento espiritual. Inscrições com a coordenação.', current_date + 45, '08:00', 'Casa de Retiros Betel');

-- Avisos
INSERT INTO rcc_announcements (title, content, type, target_audience, is_pinned) VALUES
  ('Bem-vindos ao app do Grupo Daniel!','Este é o nosso mural oficial. Aqui você acompanha avisos, eventos e pedidos de oração.','comunicado','todos',true),
  ('Campanha do Retiro Anual','Estamos arrecadando contribuições para o retiro. Contribua pelo app na aba PIX.','campanha','todos',false),
  ('Escala de Intercessão — próxima semana','Maria, Tereza e Antônio: intercessão antes do grupo, às 18h45.','escala','lideres',false);

-- Pedidos de oração
INSERT INTO rcc_prayer_requests (member_id, title, description, category, visibility, status) VALUES
  ('a1000000-0000-0000-0000-000000000005','Pela saúde da minha avó','Passará por cirurgia na próxima semana.','saude','publico','ativo'),
  ('a1000000-0000-0000-0000-000000000004','Agradecimento por nova vaga de emprego','Deus abriu as portas! Gratidão.','agradecimento','publico','ativo'),
  ('a1000000-0000-0000-0000-000000000007','Pedido pessoal','Situação familiar delicada.','familia','privado','pendente');

-- Configurações do grupo
UPDATE rcc_settings SET
  pix_key = 'rccgrupodaniel@example.com',
  meeting_weekday = 'Toda quinta-feira, 19h30',
  meeting_place = 'Salão Paroquial'
WHERE id = 1;
