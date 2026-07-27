'use client'

import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { ImpersonateModal } from './impersonate-modal'

interface ImpersonateButtonProps {
  tenantId: string
  tenantName: string
}

export function ImpersonateButton({ tenantId, tenantName }: ImpersonateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
        aria-label={`Entrar como ${tenantName}`}
      >
        <LogIn className="w-4 h-4" />
        Entrar como
      </button>
      <ImpersonateModal
        open={open}
        onClose={() => setOpen(false)}
        tenantId={tenantId}
        tenantName={tenantName}
      />
    </>
  )
}
