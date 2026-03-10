import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { apiGet } from "@/lib/api";
import logoNu from "@/assets/logonu.png";

const ExtratoExport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contaId = searchParams.get("conta_id") || "";
  const dataInicio = searchParams.get("data_inicio") || "";
  const dataFim = searchParams.get("data_fim") || "";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contaId || !dataInicio || !dataFim) return;
    apiGet("extrato.php", { conta_id: contaId, data_inicio: dataInicio, data_fim: dataFim })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contaId, dataInicio, dataFim]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => window.print();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando extrato...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Erro ao carregar extrato.</div>;
  }

  const conta = data.conta || {};
  const resumo = data.resumo || {};
  const movimentacoes = data.movimentacoes || {};
  const datasOrdenadas = Object.keys(movimentacoes).sort();

  const fmtPeriodo = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();

  const fmtDia = (d: string) => {
    const dt = new Date(d + "T12:00:00");
    const day = String(dt.getDate()).padStart(2, "0");
    const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
    return `${day} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  // Compute saldo do dia for each date
  const saldoPorDia: Record<string, number> = {};
  {
    let saldoAcumulado = resumo.saldo_inicial || 0;
    for (const dia of datasOrdenadas) {
      const trans = movimentacoes[dia];
      for (const t of trans) {
        if (t.tipo === "entrada") saldoAcumulado += parseFloat(t.valor);
        else saldoAcumulado -= parseFloat(t.valor);
      }
      saldoPorDia[dia] = saldoAcumulado;
    }
  }

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Graphik Regular', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: "11px",
    lineHeight: "1.5",
    color: "#222",
  };

  return (
    <>
      <div className="print:hidden bg-secondary/30 border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1">Pré-visualização do Extrato</h1>
        <Button variant="hero" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="flex justify-center py-8 print:py-0 bg-secondary/30 print:bg-white min-h-screen">
        <div
          className="bg-white shadow-lg print:shadow-none w-[210mm] min-h-[297mm] px-[15mm] py-[20mm] print:w-full print:min-h-0 print:px-[12mm] print:py-[15mm]"
          style={pageStyle}
        >
          {/* ===== HEADER ===== */}
          <div className="flex justify-between items-start mb-12">
            <img src={logoNu} alt="Nu" style={{ height: "32px", width: "auto" }} />
            <div className="text-right" style={{ fontSize: "12px", lineHeight: "1.6" }}>
              <p style={{ fontWeight: 400 }}>{conta.titular}</p>
              <p>
                <span style={{ fontWeight: 700, color: "#820AD1" }}>{conta.tipo_conta === "PJ" ? "CNPJ" : "CPF"}</span>{"  "}{conta.documento}{"  "}
                <span style={{ fontWeight: 700 }}>Agência</span>{"  "}{conta.agencia || "0001"}{"  "}
                <span style={{ fontWeight: 700 }}>Conta</span>
              </p>
              <p>{conta.numero_conta}</p>
            </div>
          </div>

          {/* ===== PERÍODO ===== */}
          <div style={{ borderBottom: "2px solid #ccc", paddingBottom: "8px", marginBottom: "24px" }}>
            <div className="flex justify-between items-baseline">
              <span style={{ fontWeight: 700, fontSize: "12px" }}>
                {fmtPeriodo(dataInicio)} a {fmtPeriodo(dataFim)}
              </span>
              <span style={{ fontSize: "12px", color: "#666" }}>VALORES EM R$</span>
            </div>
          </div>

          {/* ===== RESUMO ===== */}
          <div className="flex justify-between items-start" style={{ marginBottom: "24px" }}>
            <div style={{ paddingTop: "8px" }}>
              <p style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>Saldo final do período</p>
              <p style={{ fontSize: "26px", fontWeight: 700, color: "#820AD1", lineHeight: "1.2" }}>
                R$ {fmt(resumo.saldo_final)}
              </p>
            </div>
            <table style={{ fontSize: "12px", borderCollapse: "collapse", minWidth: "320px" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, padding: "3px 16px 3px 0" }}>Saldo inicial</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>{fmt(resumo.saldo_inicial)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Rendimento líquido</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>+{fmt(resumo.rendimento_liquido)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Total de entradas</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>+{fmt(resumo.total_entradas)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 16px 3px 0", color: "#444" }}>Total de saídas</td>
                  <td style={{ textAlign: "right", padding: "3px 0" }}>-{fmt(resumo.total_saidas)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, padding: "6px 16px 3px 0" }}>Saldo final do período</td>
                  <td style={{ fontWeight: 700, textAlign: "right", padding: "6px 0 3px 0" }}>{fmt(resumo.saldo_final)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ===== MOVIMENTAÇÕES ===== */}
          <div style={{ borderBottom: "2px solid #ccc", marginBottom: "4px" }}></div>
          <div style={{ marginBottom: "16px" }}>
            <span style={{ fontWeight: 700, fontSize: "12px" }}>Movimentações</span>
          </div>

          {datasOrdenadas.length === 0 && (
            <p style={{ textAlign: "center", color: "#999", padding: "20px 0" }}>Nenhuma movimentação encontrada no período.</p>
          )}

          {datasOrdenadas.map(dia => {
            const trans = movimentacoes[dia];
            const entradas = trans.filter((t: any) => t.tipo === "entrada");
            const saidas = trans.filter((t: any) => t.tipo === "saida");
            const totalE = entradas.reduce((s: number, t: any) => s + parseFloat(t.valor), 0);
            const totalS = saidas.reduce((s: number, t: any) => s + parseFloat(t.valor), 0);

            return (
              <div key={dia} style={{ marginBottom: "8px" }}>
                {/* Entradas */}
                {entradas.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "4px" }}>
                    <tbody>
                      {/* Total de entradas row */}
                      <tr style={{ borderBottom: "1px solid #ddd" }}>
                        <td style={{ width: "90px", verticalAlign: "top", padding: "8px 12px 8px 0", fontWeight: 400, color: "#222" }}>{fmtDia(dia)}</td>
                        <td style={{ fontWeight: 700, padding: "8px 0" }}>Total de entradas</td>
                        <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 0", whiteSpace: "nowrap" }}>+ {fmt(totalE)}</td>
                      </tr>
                      {entradas.map((t: any, i: number) => (
                        <tr key={t.id || i}>
                          <td style={{ padding: "6px 12px 6px 0" }}></td>
                          <td style={{ padding: "6px 0", verticalAlign: "top" }}>
                            <span>{t.descricao}</span>
                            <br />
                            <span style={{ color: "#888", fontSize: "10px" }}>
                              {t.beneficiario_nome} - {t.beneficiario_documento} - {t.beneficiario_banco} Agência: {t.beneficiario_agencia} Conta: {t.beneficiario_conta}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", padding: "6px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(parseFloat(t.valor))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Saídas */}
                {saidas.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "4px" }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #ddd" }}>
                        <td style={{ width: "90px", verticalAlign: "top", padding: "8px 12px 8px 0", fontWeight: 400, color: "#222" }}>
                          {entradas.length === 0 ? fmtDia(dia) : ""}
                        </td>
                        <td style={{ fontWeight: 700, padding: "8px 0" }}>Total de saídas</td>
                        <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 0", whiteSpace: "nowrap" }}>- {fmt(totalS)}</td>
                      </tr>
                      {saidas.map((t: any, i: number) => (
                        <tr key={t.id || i}>
                          <td style={{ padding: "6px 12px 6px 0" }}></td>
                          <td style={{ padding: "6px 0", verticalAlign: "top" }}>
                            <span>{t.descricao}</span>
                            <br />
                            <span style={{ color: "#888", fontSize: "10px" }}>
                              {t.beneficiario_nome} - {t.beneficiario_documento} - {t.beneficiario_banco} Agência: {t.beneficiario_agencia} Conta: {t.beneficiario_conta}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", padding: "6px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(parseFloat(t.valor))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Saldo do dia */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <tbody>
                    <tr style={{ borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc" }}>
                      <td style={{ width: "90px", padding: "8px 12px 8px 0" }}></td>
                      <td style={{ fontWeight: 700, padding: "8px 0" }}>Saldo do dia</td>
                      <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 0" }}>{fmt(saldoPorDia[dia])}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* ===== FOOTER ===== */}
          <div style={{ marginTop: "32px", borderTop: "1px solid #ddd", paddingTop: "16px", fontSize: "10px", color: "#888", lineHeight: "1.6" }}>
            <p>Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento pelo chat do app ou ligue 4020 0185 (capitais e regiões metropolitanas) ou 0800 591 2117 (demais localidades). Atendimento 24h.</p>
            <p style={{ marginTop: "8px" }}>Caso a solução fornecida nos canais de atendimento não tenha sido satisfatória, fale com a Ouvidoria em 0800 887 0463 ou pelos meios disponíveis em nubank.com.br/contatos#ouvidoria. Atendimento das 8h às 18h em dias úteis.</p>
            <div className="flex justify-between" style={{ marginTop: "12px" }}>
              <span>Extrato gerado dia {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExtratoExport;