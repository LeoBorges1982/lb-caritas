import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Save } from "lucide-react";
import { buscarConvenio } from "@/lib/convenios";
import { atualizarResponsaveis } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}

export default async function ResponsaveisPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const salvo = sp?.salvo === "1";
  const c = await buscarConvenio(id);
  if (!c) notFound();

  const conv = c as unknown as {
    valor_total: number;
    valor_repasse: number;
    valor_contrapartida: number;
    osc: { email: string | null; telefone: string | null };
    gestor_publico: string | null;
    gestor_osc: string | null;
    gestor_osc_cpf: string | null;
    responsavel_legal_nome: string | null;
    responsavel_legal_cpf: string | null;
    elaborador_nome: string | null;
    elaborador_cpf: string | null;
    contabilista_nome: string | null;
    contabilista_cpf: string | null;
    contabilista_crc: string | null;
    responsavel_tecnico_nome: string | null;
    responsavel_tecnico_cpf: string | null;
    responsavel_tecnico_email: string | null;
    responsavel_tecnico_funcao: string | null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Link href={`/convenios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1e3a8a]">
        <ArrowLeft size={14} /> Voltar ao convênio
      </Link>

      <header className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-200 mb-2">
          <Users size={14} /> Responsáveis e Assinaturas
        </div>
        <h1 className="text-2xl font-bold">{c.numero}</h1>
        <p className="text-sm text-blue-100 mt-1 max-w-2xl">
          Dados que aparecem nas assinaturas das prestações de contas, balancetes e relatórios oficiais enviados à prefeitura.
        </p>
      </header>

      {salvo && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          ✅ <strong>Alterações salvas com sucesso!</strong>
        </div>
      )}

      <form action={atualizarResponsaveis.bind(null, id)} className="space-y-4">
        {/* Dados gerais que aparecem no cabeçalho do relatório */}
        <Secao titulo="Dados Gerais (aparecem no cabeçalho do relatório)" icone="📋" cor="border-slate-300">
          <Grid3>
            <Field
              label="Valor Repasse Público (R$)"
              name="valor_repasse"
              defaultValue={conv.valor_repasse ? conv.valor_repasse.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
              placeholder="155.404,44"
            />
            <Field
              label="Contrapartida OSC (R$)"
              name="valor_contrapartida"
              defaultValue={conv.valor_contrapartida ? conv.valor_contrapartida.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
              placeholder="0,00"
            />
            <Field
              label="Valor Global (Repasse + Contrapartida)"
              name="valor_total"
              defaultValue={conv.valor_total ? conv.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
              placeholder="155.404,44"
            />
          </Grid3>
          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
            ⚠️ O valor global é a SOMA do repasse + contrapartida. Se mudar apenas o global, o sistema vai assumir 100% como repasse público.
          </div>

          <Grid2>
            <Field
              label="E-mail da OSC"
              name="osc_email"
              defaultValue={conv.osc?.email ?? null}
              placeholder="casasolidariedade@outlook.com"
              type="email"
            />
            <Field
              label="Telefone da OSC"
              name="osc_telefone"
              defaultValue={conv.osc?.telefone ?? null}
              placeholder="(21) 2767-7677"
            />
          </Grid2>
        </Secao>

        {/* Grid 2 colunas pros 4 primeiros blocos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Secao titulo="Gestores do Convênio" icone="🏛️" cor="border-blue-200">
            <Field label="Gestor público (do órgão)" name="gestor_publico" defaultValue={conv.gestor_publico} />
            <Grid2>
              <Field label="Gestor / Coord. da OSC" name="gestor_osc" defaultValue={conv.gestor_osc} />
              <Field label="CPF" name="gestor_osc_cpf" defaultValue={conv.gestor_osc_cpf} placeholder="000.000.000-00" />
            </Grid2>
          </Secao>

          <Secao titulo="Responsável Legal da OSC" icone="⚖️" cor="border-amber-200">
            <Grid2>
              <Field label="Nome" name="responsavel_legal_nome" defaultValue={conv.responsavel_legal_nome} />
              <Field label="CPF" name="responsavel_legal_cpf" defaultValue={conv.responsavel_legal_cpf} placeholder="000.000.000-00" />
            </Grid2>
            <div className="text-[10px] text-slate-500 italic">Assina legalmente em nome da OSC (presidente, diretor)</div>
          </Secao>

          <Secao titulo="Responsável pela Elaboração" icone="📝" cor="border-indigo-200">
            <Grid2>
              <Field label="Nome" name="elaborador_nome" defaultValue={conv.elaborador_nome} />
              <Field label="CPF" name="elaborador_cpf" defaultValue={conv.elaborador_cpf} placeholder="000.000.000-00" />
            </Grid2>
            <div className="text-[10px] text-slate-500 italic">Quem elaborou a prestação (geralmente da OSC)</div>
          </Secao>

          <Secao titulo="Contabilista Responsável" icone="🧮" cor="border-emerald-200">
            <Grid2>
              <Field label="Nome" name="contabilista_nome" defaultValue={conv.contabilista_nome} />
              <Field label="CPF" name="contabilista_cpf" defaultValue={conv.contabilista_cpf} placeholder="000.000.000-00" />
            </Grid2>
            <Field label="CRC" name="contabilista_crc" defaultValue={conv.contabilista_crc} placeholder="CRC-RJ 091024/O-1" />
          </Secao>
        </div>

        {/* Responsável Técnico ocupa linha cheia */}
        <Secao titulo="Responsável Técnico do Projeto" icone="🔧" cor="border-purple-200">
          <Grid3>
            <Field label="Nome" name="responsavel_tecnico_nome" defaultValue={conv.responsavel_tecnico_nome} />
            <Field label="CPF" name="responsavel_tecnico_cpf" defaultValue={conv.responsavel_tecnico_cpf} placeholder="000.000.000-00" />
            <Field label="Função / cargo" name="responsavel_tecnico_funcao" defaultValue={conv.responsavel_tecnico_funcao} />
          </Grid3>
          <Field label="E-mail" name="responsavel_tecnico_email" defaultValue={conv.responsavel_tecnico_email} type="email" />
          <div className="text-[10px] text-slate-500 italic">Coordenador técnico que acompanha a execução do projeto</div>
        </Secao>

        {/* Barra de salvar sticky */}
        <div className="sticky bottom-4 z-10 bg-white border border-slate-200 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>💡</span>
            <span>Alterações refletem automaticamente nas prestações futuras.</span>
          </div>
          <button type="submit"
            className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm">
            <Save size={14} /> Salvar alterações
          </button>
        </div>
      </form>
    </div>
  );
}

function Secao({ titulo, icone, cor, children }: { titulo: string; icone?: string; cor?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-white border-2 ${cor || "border-slate-200"} rounded-2xl p-5 shadow-sm space-y-3 h-fit`}>
      <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
        {icone && <span className="text-lg">{icone}</span>}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>;
}

function Field({ label, name, defaultValue, placeholder, type = "text" }: {
  label: string; name: string; defaultValue: string | null; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input name={name} type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none transition" />
    </div>
  );
}
