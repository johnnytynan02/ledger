'use client'
import { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { BANKS, CATEGORIES, formatAmount, CATEGORY_COLORS, getCustomCategories, saveCustomCategory, deleteCustomCategory, getAllCategories } from '@/lib/categories'
import { parseBank } from '@/lib/parsers'
import type { BankId, ParsedTransaction, CategoryDefinition } from '@/lib/types'

let uid = 0
const nextId = () => `u${++uid}_${Date.now()}`

export default function UploadPage() {
  const [bank, setBank] = useState<BankId>('revolut')
  const [rows, setRows] = useState<(ParsedTransaction & { _id: string })[]>([])
  const [aiLog, setAiLog] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(0)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Custom categories
  const [allCats, setAllCats] = useState<CategoryDefinition[]>([])
  const [showCustom, setShowCustom] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])

  useEffect(() => { setAllCats(getAllCategories()) }, [])

  const refreshCats = () => setAllCats(getAllCategories())

  const addCustomCat = () => {
    if (!newLabel.trim()) return
    const id = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    saveCustomCategory({ id, label: newLabel.trim(), color: newColor })
    setNewLabel('')
    refreshCats()
  }

  const removeCat = (id: string) => {
    deleteCustomCategory(id)
    refreshCats()
  }

  const processFile = (file: File) => {
    Papa.parse(file, {
      complete: (result) => {
        const parsed = parseBank(bank, result.data as string[][])
        setRows(parsed.filter(t => t.date && t.description).map(t => ({ ...t, _id: nextId() })))
        setAiLog('')
        setDone(0)
      },
      error: () => setAiLog('Error reading CSV — check the file is from the right bank.'),
    })
  }

  const runAI = async () => {
    if (!rows.length) return
    setAiLoading(true); setAiLog('Sending to AI…')
    try {
      const res = await fetch('/api/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: rows.map(r => ({ id: r._id, description: r.description, amount: r.amount, currency: r.currency })) }),
      })
      const results = await res.json()
      if (!Array.isArray(results)) {
        setAiLog(`AI error: unexpected response`)
        setAiLoading(false)
        return
      }
      const map: Record<string, { category: string; confidence: number }> = {}
      results.forEach((r: { id: string; category: string; confidence: number }) => { map[r.id] = r })
      setRows(p => p.map(r => {
        const ai = map[r._id]
        if (!ai) return r
        return { ...r, category: ai.category ?? 'uncategorised', confidence: ai.confidence ?? 0, reviewed: (ai.confidence ?? 0) >= 0.85 }
      }))
      setAiLog(`✓ ${results.length} transactions categorised by AI`)
    } catch (e) {
      setAiLog(`AI error: ${e instanceof Error ? e.message : 'unknown'}`)
    }
    setAiLoading(false)
  }

  const importAll = async () => {
    if (!rows.length) return
    setImporting(true); setAiLog('Importing…')
    const payload = rows.map(({ _id: _, ...t }) => t)
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const saved = await res.json()
      setDone(saved.length); setRows([]); setAiLog('')
    } else {
      const err = await res.json()
      setAiLog(`Import error: ${err.error}`)
    }
    setImporting(false)
  }

  const customCats = getCustomCategories()
  const bankDef = BANKS.find(b => b.id === bank)!

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Upload CSV</h1>
      <p style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 20 }}>Import transactions from your bank statement exports</p>

      {done > 0 && (
        <div style={{ background: 'var(--grn-l)', border: '0.5px solid rgba(59,109,17,.3)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 14, fontSize: 13, color: 'var(--grn)' }}>
          ✓ {done} transactions imported. <a href="/dashboard/transactions">View transactions →</a>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left column — bank + custom categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 192, flexShrink: 0 }}>

          {/* Bank selector */}
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--hi)', marginBottom: 10 }}>Select bank</div>
            {BANKS.map(b => (
              <div key={b.id} onClick={() => setBank(b.id as BankId)} style={{
                padding: '9px 11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 6,
                border: `0.5px solid ${bank === b.id ? 'var(--acc)' : 'var(--bd)'}`,
                background: bank === b.id ? 'var(--acc-l)' : 'transparent',
              }}>
                <div style={{ fontSize: 12, fontWeight: bank === b.id ? 500 : 400, color: bank === b.id ? 'var(--acc)' : 'var(--tx)' }}>{b.label}</div>
                <div style={{ fontSize: 10, color: 'var(--hi)', marginTop: 2 }}>{b.hint}</div>
              </div>
            ))}
          </div>

          {/* Custom categories */}
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--hi)' }}>Custom categories</div>
              <button onClick={() => setShowCustom(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--acc)', lineHeight: 1 }}>
                {showCustom ? '−' : '+'}
              </button>
            </div>

            {/* Existing custom categories */}
            {customCats.length === 0 && !showCustom && (
              <div style={{ fontSize: 11, color: 'var(--hi)' }}>None yet — click + to add</div>
            )}
            {customCats.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '0.5px solid var(--bd)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11 }}>{c.label}</span>
                </div>
                <button onClick={() => removeCat(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14, padding: '0 2px' }}>×</button>
              </div>
            ))}

            {/* Add new */}
            {showCustom && (
              <div style={{ marginTop: 10 }}>
                <input
                  className="inp"
                  placeholder="Category name"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomCat()}
                  style={{ marginBottom: 8, fontSize: 12 }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {CATEGORY_COLORS.map(c => (
                    <div key={c} onClick={() => setNewColor(c)} style={{
                      width: 18, height: 18, borderRadius: 3, background: c, cursor: 'pointer',
                      outline: newColor === c ? `2px solid var(--tx)` : 'none', outlineOffset: 1,
                    }} />
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }} onClick={addCustomCat}>
                  Add category
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column — upload + preview */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', padding: '0 0 14px', marginBottom: 12 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              onClick={() => inputRef.current?.click()}
              style={{
                margin: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                border: `0.5px dashed ${dragging ? 'var(--acc)' : 'var(--bd2)'}`,
                borderRadius: 'var(--radius-sm)', background: dragging ? 'var(--acc-l)' : 'transparent',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 4 }}>Drag & drop or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--hi)' }}>{bankDef.label} CSV · {bankDef.currencies.join(', ')}</div>
              <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            </div>

            {rows.length > 0 && (
              <div style={{ padding: '0 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{rows.length} transactions parsed</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={runAI} disabled={aiLoading} style={{ opacity: aiLoading ? 0.6 : 1 }}>
                      {aiLoading ? 'AI categorising…' : 'AI categorise'}
                    </button>
                    <button className="btn btn-green" onClick={importAll} disabled={importing}>
                      {importing ? 'Importing…' : `Import ${rows.length} →`}
                    </button>
                  </div>
                </div>
                {aiLog && (
                  <div style={{ fontSize: 11, color: aiLog.startsWith('✓') ? 'var(--grn)' : 'var(--acc)', marginBottom: 8 }}>{aiLog}</div>
                )}
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div style={{ background: 'var(--card)', border: '0.5px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {['Date','Description','Amount','Category'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--hi)', borderBottom: '0.5px solid var(--bd)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
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
                          <select
                            className="sel"
                            style={{ fontSize: 11, padding: '3px 7px' }}
                            value={t.category}
                            onChange={e => setRows(p => p.map(r => r._id === t._id ? { ...r, category: e.target.value } : r))}
                          >
                            {allCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {rows.length > 50 && (
                      <tr><td colSpan={4} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--hi)', fontSize: 11 }}>…and {rows.length - 50} more (all will be imported)</td></tr>
                    )}
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
