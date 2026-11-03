/**
 * Extrai todos os valores numéricos de uma string de pretensão salarial
 * e retorna o maior — suporta faixas como "R$ 2.000 a R$ 2.500" e
 * formatos BR como "R$ 3.500,00".
 */
export function parsePretensao(str: string): number {
  const tokens = str.match(/\d+(?:[.,]\d+)*/g) ?? []
  const values = tokens
    .map(t => {
      if (t.includes(',')) {
        // Formato BR com decimal: "3.500,00" → 3500.00
        return parseFloat(t.replace(/\./g, '').replace(',', '.'))
      }
      // Apenas pontos ou número puro: "2.000" → 2000, "3500" → 3500
      return parseFloat(t.replace(/\./g, ''))
    })
    .filter(n => !isNaN(n) && n >= 100) // ignora centavos soltos como "00"
  if (values.length === 0) return NaN
  return Math.max(...values)
}

export async function verificarSalarioCompativel(
  pretensao: string,
  cargo: string,
): Promise<{ compativel: boolean; teto: number }> {
  const valor = parsePretensao(pretensao)
  if (isNaN(valor)) return { compativel: true, teto: 0 }
  const chave = `salario_max_${cargo}`
  try {
    const res = await fetch(`/api/configuracoes?chave=${chave}`)
    const data = await res.json()
    const teto = parseFloat(data.valor || '99999')
    return { compativel: valor <= teto, teto }
  } catch {
    return { compativel: true, teto: 0 }
  }
}
