'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContractType } from '@/types/contract'
import { NDA_STANDARD_TERMS } from '@/lib/constants/ndaTerms'
import { MSA_STANDARD_TERMS } from '@/lib/constants/msaTerms'

type Step = 'select' | 'preview' | 'processing'

export default function UploadForm() {
  const router = useRouter()
  const [contractType, setContractType] = useState<ContractType>('nda')
  const [file, setFile] = useState<File | null>(null)
  const [customTerms, setCustomTerms] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [step, setStep] = useState<Step>('select')
  const [processingStep, setProcessingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [contractId, setContractId] = useState<string | null>(null)

  const standardTerms = contractType === 'nda' ? NDA_STANDARD_TERMS : MSA_STANDARD_TERMS

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File exceeds 10 MB limit. Please upload a smaller PDF.')
      return
    }
    setError(null)
    setFile(f)
  }

  function addCustomTerm() {
    const term = customInput.trim()
    if (!term || customTerms.length >= 5) return
    setCustomTerms((prev) => [...prev, term])
    setCustomInput('')
  }

  async function handleUpload() {
    if (!file) return
    setStep('processing')
    setProcessingStep(1)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('contract_type', contractType)

      const uploadRes = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const { error: msg } = await uploadRes.json()
        throw new Error(msg ?? 'Upload failed')
      }

      const { contractId: id } = await uploadRes.json()
      setContractId(id)
      setProcessingStep(2)

      const processRes = await fetch('/api/contracts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: id, customTerms }),
      })

      if (!processRes.ok) {
        const { error: msg } = await processRes.json()
        throw new Error(msg ?? 'Processing failed')
      }

      setProcessingStep(3)
      router.push(`/results/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('preview')
    }
  }

  if (step === 'processing') {
    const steps = ['Extracting text', 'Analysing with AI', 'Compiling results']
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-6">⚙️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Analysing your contract…</h2>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                processingStep > i + 1 ? 'bg-green-500 text-white'
                : processingStep === i + 1 ? 'bg-brand-primary text-white animate-pulse'
                : 'bg-gray-200 text-gray-400'
              }`}>
                {processingStep > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${processingStep >= i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Contract type + file */}
      <div className="card p-6 space-y-5">
        <div>
          <label htmlFor="contract-type" className="label">Contract type</label>
          <select
            id="contract-type"
            value={contractType}
            onChange={(e) => setContractType(e.target.value as ContractType)}
            className="input"
          >
            <option value="nda">NDA — Non-Disclosure Agreement</option>
            <option value="msa">MSA — Master Service Agreement</option>
          </select>
        </div>

        <div>
          <label className="label">Upload PDF</label>
          <label
            htmlFor="file-input"
            className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-brand-border rounded-xl cursor-pointer hover:border-brand-primary hover:bg-blue-50 transition-colors"
          >
            {file ? (
              <div className="text-center">
                <div className="text-2xl mb-1">📄</div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl mb-2">⬆️</div>
                <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PDF only · Max 10 MB · Max 20 pages</p>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Step 2: Preview + custom terms */}
      {file && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Key terms ContractIQ will extract
          </h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {standardTerms.map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                {t}
              </span>
            ))}
            {customTerms.map((t) => (
              <span key={t} className="badge-custom">
                {t} <span className="ml-1 text-purple-400">custom</span>
              </span>
            ))}
          </div>

          {customTerms.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTerm()}
                placeholder="Add a custom term (e.g. Non-compete radius)"
                className="input flex-1 text-sm"
              />
              <button
                type="button"
                onClick={addCustomTerm}
                disabled={!customInput.trim()}
                className="btn-secondary px-4 py-2 text-sm"
              >
                + Add
              </button>
            </div>
          )}
          {customTerms.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {5 - customTerms.length} custom {5 - customTerms.length === 1 ? 'term' : 'terms'} remaining
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file}
        className="btn-primary w-full py-4 text-base"
      >
        Process Contract →
      </button>
    </div>
  )
}
