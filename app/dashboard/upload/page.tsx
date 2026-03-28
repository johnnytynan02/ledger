'use client'
import { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { BANKS, CATEGORIES, formatAmount, CATEGORY_COLORS, getCustomCategories, saveCustomCategory, deleteCustomCategory, getAllCategories } from '@/lib/categories'
import { parseBank, getHeaders } from '@/lib/parsers'
import { fetchRules, applyRules } from '@/lib/rules'
import type { CategoryDefinition, Rule } from '@/lib/types'

let uid = 0
const nextId = () => `u${++uid}_${Date.now()}`

interface ParsedRow { _id: string; date: string; description: string; amount: number; currency: string; account: string; category: string; confidence: number; reviewed: boolean }
interface GenericMapping { date: number; description: number; amount: number; currency: number; creditCol?: number; bankName?: string }

export default function UploadPage() {
  const [bank, setBank] = useState('revolut')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [genericMapping, setGenericMapping] = useState<GenericMapping>({ date: 0, description: 1, amount: 2, currency: -1, bankName: '' })
  const [mappingDone, setMappingDone] = useState(false)
  const [aiLog, setAiLog] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [allCats, setAllCats] = useState<CategoryDefinition[]>([])
  const [showCustom, setShowCustom] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])
  const [rules, setRules] = useState<Rule[]>([])

  useEffect(() => {
    setAllCats(getAllCategories())
    fetchRules().then(setRules)
  }, [])

  const refreshCats = () => setAllCats(getAllCategories())

  const addCustomCat = () => {
    if (!newLabel.trim()) return
    const id = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    saveCustomCategory({ id, label: newLabel.trim(), color: newColor })
    setNewLabel('')
    refreshCats()
  }

  const processFile = (file: File) => {
    Papa.parse(file, {
      complete: (result) => {
        const data = result.data as string[][]
        if (bank === 'other') {
          setRawHeaders(getHeaders(data))
          setRawRows(data)
          setMappingDone(false)
          setRows([])
        } else {
          const parsed = parseBank(bank, data)
          setRows(parsed.filter(t => t.date && t.description).map(t => ({ ...t, _id: nextId() })))
        }
        setAiLog(''); setDone(0)
      },
      error: () => setAiLog('Error reading CSV — check the file is from the right bank.'),
    })
  }

  const applyMapping = () => {
    const parsed = parseBank('other', rawRows, { ...genericMapping, bankName: genericMapping.bankName || 'other' })
    setRows(parsed.filter(t => t.date && t.description).map(t => ({ ...t, _id: nextId() })))
    setMappingDone(true)
  }

  const runAI = async () => {
    if (!rows.length) return
    setAiLoading(true)

    // Step 1 — apply saved rules first
    const { matched, unmatched } = applyRules(rows, rules)
    const ruleCount = matched.length

    if (unmatched.length === 0) {
      setRows(matched)
      setAiLog(`✓ ${ruleCount} transactions matched by your saved rules — no AI needed!`)
      setAiLoading(false)
      return
    }

    setAiLog(`✓ ${ruleCount} matched by rules · sending ${unmatched.length} to AI…`)

    // Step 2 — send unmatched to AI
    try {
      const res = await fetch('/api/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: unmatched.map(r => ({ id: r._id, description: r.description, amount: r.amount, currency: r.currency })) }),
      })
      const results = await res.json()
      if (!Array.isArray(results)) {
        setAiLog(`Rules matched ${ruleCount} · AI error: ${results?.error ?? 'unexpected response'}`)
        // Still apply rule matches even if AI failed
        setRows(p => p.map(r => { const m = matched.find(x => x._id === r._id); return m ?? r }))
        setAiLoading(false)
        return
      }

      const aiMap: Record<string, { category: string; confidence: number }> = {}
      results.forEach((r: { id: string; category: string; confidence: number }) => { aiMap[r.id] = r })

      // Merge: rule matches + AI results
      setRows(p => p.map(r => {
        const ruleMatch = matched.find(x => x._id === r._id)
        if (ruleMatch) return ruleMatch
        const ai = aiMap[r._id]
        if (ai) return { ...r, category: ai.category ?? 'uncategorised', confidence: ai.confidence ?? 0, reviewed: (ai.confidence ?? 0) >= 0.85 }
        return r
      }))

      setAiLog(`✓ ${ruleCount} by rules · ${results.length} by AI`)
    } catch (e) {
      setAiLog(`AI error: ${e instanceof Error ? e.message : 'unknown'}`)
    }
    setAiLoading(false)
  }

  const importAll = async () => {
    if (!rows.length) return
    setImporting(true); setAiLog('Importing…')
    const payload = rows.map(({ _id: _, ...t }) => t)
    const res = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { const saved = await res.json(); setDone(saved.length); setRows([]); setRawRows([]); setAiLog('') }
    else { const err = await res.json(); setAiLog(`Import error: ${err.error}`) }
    setImporting(false)
  }

  const customCats = getCustomCategories()
  const bankDef = BANKS.find(b => b.id === bank)!
  const colOptions = rawHeaders.map((h, i) => ({ label: h || `Column ${i + 1}`, value: i }))

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Upload CSV</h1>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 20 }}>Import transactions from your bank statement exports</p>

      {done > 0 && (
        <div style={{ background: 'var(--grn-l)', border: '0.5px solid rgba(59,109,17,.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 14, fontSize: 13, color: 'var(--grn)' }}>
          ✓ {done} transactions imported. <a href="/dashboard/transactions">View transactions →</a>
        </div>
      )}

      {rules.length > 0 && (
        <div style={{ background: 'var(--surf)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--mu)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{rules.length} saved rule{rules.length !== 1 ? 's' : ''} will be applied automatically before AI</span>
          <a href="/dashboard/rules" style={{ fontSize: 11, color: 'var(--acc)' }}>View rules →</a>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 192, flexShrink: 0 }}>

          <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 10 }}>Select bank</div>
            {BANKS.map(b => (
              <div key={b.id} onClick={() => { setBank(b.id); setRows([]); setRawRows([]); setMappingDone(false) }} style={{ padding: '9px 11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 6, border: `0.5px solid ${bank === b.id ? 'var(--acc)' : 'var(--bd)'}`, background: bank === b.id ? 'var(--acc-l)' : 'transparent' }}>
                <div style={{ fontSize: 12, fontWeight: bank === b.id ? 500 : 400, color: bank === b.id ? 'var(--acc)' : 'var(--tx)' }}>{b.label}</div>
                <div style={{ fontSize: 10, color: 'var(--hi)', marginTop: 2 }}>{b.hint}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--hi)' }}>Custom categories</div>
              <button onClick={() => setShowCustom(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--acc)', lineHeight: 1 }}>{showCustom ? '−' : '+'}</button>
            </div>
            {customCats.length === 0 && !showCustom && <div style={{ fontSize: 11, color: 'var(--hi)' }}>None yet — click + to add</div>}
            {customCats.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '0.5px solid var(--bd)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11 }}>{c.label}</span>
                </div>
                <button onClick={() => { deleteCustomCategory(c.id); refreshCats() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14, padding: '0 2px' }}>×</button>
              </div>
            ))}
            {showCustom && (
              <div style={{ marginTop: 10 }}>
                <input className="inp" placeholder="Category name" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomCat()} style={{ marginBottom: 8, fontSize: 12 }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {CATEGORY_COLORS.map(c => <div key={c} onClick={() => setNewColor(c)} style={{ width: 18, height: 18, borderRadius: 3, background: c, cursor: 'pointer', outline: newColor === c ? '2px solid var(--tx)' : 'none', outlineOffset: 1 }} />)}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={addCustomCat}>Add category</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '0 0 14px', marginBottom: 12 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              onClick={() => inputRef.current?.click()}
              style={{ margin: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', border: `0.5px dashed ${dragging ? 'var(--acc)' : 'var(--bd2)'}`, borderRadius: 'var(--radius-sm)', background: dragging ? 'var(--acc-l)' : 'transparent', transition: 'all .15s' }}
            >
              <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 4 }}>Drag & drop or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--hi)' }}>{bankDef.label} · CSV format</div>
              <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            </div>

            {bank === 'other' && rawHeaders.length > 0 && !mappingDone && (
              <div style={{ padding: '0 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10, color: 'var(--acc)' }}>Map your CSV columns</div>
                <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 12 }}>We detected {rawHeaders.length} columns — tell us which is which.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[{ label: 'Date column', key: 'date' }, { label: 'Description column', key: 'description' }, { label: 'Amount column', key: 'amount' }, { label: 'Currency column (optional)', key: 'currency' }].map(({ label, key }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: 'var(--hi)', display: 'block', marginBottom: 4 }}>{label}</label>
                      <select className="sel" style={{ width: '100%' }} value={(genericMapping as unknown as Record<string, number>)[key]} onChange={e => setGenericMapping(p => ({ ...p, [key]: parseInt(e.target.value) }))}>
                        {key === 'currency' && <option value={-1}>No currency column (use GBP)</option>}
                        {colOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--hi)', display: 'block', marginBottom: 4 }}>Your bank name (optional)</label>
                  <input className="inp" placeholder="e.g. Halifax, Chase, Barclays" value={genericMapping.bankName ?? ''} onChange={e => setGenericMapping(p => ({ ...p, bankName: e.target.value }))} style={{ maxWidth: 240 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 10 }}>
                  Preview: <strong>{rawRows[1]?.[genericMapping.date]}</strong> | <strong>{rawRows[1]?.[genericMapping.description]}</strong> | <strong>{rawRows[1]?.[genericMapping.amount]}</strong>
                </div>
                <button className="btn btn-primary" onClick={applyMapping}>Apply mapping →</button>
              </div>
            )}

            {rows.length > 0 && (
              <div style={{ padding: '0 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{rows.length} transactions parsed</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={runAI} disabled={aiLoading} style={{ opacity: aiLoading ? 0.6 : 1 }}>{aiLoading ? 'Categorising…' : 'Categorise'}</button>
                    <button className="btn btn-green" onClick={importAll} disabled={importing}>{importing ? 'Importing…' : `Import ${rows.length} →`}</button>
                  </div>
                </div>
                {aiLog && <div style={{ fontSize: 11, color: aiLog.startsWith('✓') ? 'var(--grn)' : 'var(--acc)', marginBottom: 8 }}>{aiLog}</div>}
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>{['Date','Description','Amount','Category'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--hi)', borderBottom: '0.5px solid var(--bd)', fontWeight: 500 }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map(t => (
                      <tr key={t._id}>
                        <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--hi)', borderBottom: '0.5px solid var(--bd)', verticalAlign: 'middle' }}>{t.date}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, borderBottom: '0.5px solid var(--bd)', verticalAlign: 'middle', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, borderBottom: '0.5px solid var(--bd)', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums', color: t.amount > 0 ? 'var(--grn)' : 'var(--tx)', whiteSpace: 'nowrap' }}>
                          {t.amount > 0 ? '+' : ''}{formatAmount(Math.abs(t.amount), t.currency)} {t.currency !== 'GBP' && t.currency}
                        </td>
                        <td style={{ padding: '6px 12px', fontSize: 12, borderBottom: '0.5px solid var(--bd)', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select className="sel" style={{ fontSize: 11, padding: '3px 7px' }} value={t.category} onChange={e => setRows(p => p.map(r => r._id === t._id ? { ...r, category: e.target.value } : r))}>
                              {allCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                            {t.confidence === 1 && <span title="Matched by your rules" style={{ fontSize: 10, color: 'var(--grn)' }}>rule</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length > 50 && <tr><td colSpan={4} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--hi)', fontSize: 11 }}>…and {rows.length - 50} more (all will be imported)</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
