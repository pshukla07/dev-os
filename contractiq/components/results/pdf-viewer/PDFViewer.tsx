'use client'

import { useEffect, useRef } from 'react'

interface Props {
  signedUrl: string
  targetPage: number
}

export default function PDFViewer({ signedUrl, targetPage }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && targetPage > 1) {
      iframeRef.current.src = `${signedUrl}#page=${targetPage}`
    }
  }, [targetPage, signedUrl])

  return (
    <iframe
      ref={iframeRef}
      src={`${signedUrl}#page=1`}
      className="w-full h-full border-0"
      title="Contract PDF viewer"
      aria-label={`Contract PDF viewer, page ${targetPage}`}
    />
  )
}
