'use client';

import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_TENANT_NAME, resolveTenantName } from '@/lib/tenant-name';

/**
 *
 */
export function useOrganization() {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [orgNombre, setOrgNombre] = useState(DEFAULT_TENANT_NAME);
  const [orgFirma, setOrgFirma] = useState('Dr.');
  const [loading, setLoading] = useState(true);

  const cargarOrg = useCallback(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
        const body = res as { data?: { avatarUrl?: string; firmaNombre?: string; nombre?: string } };
        if (body.data) {
          if (body.data.avatarUrl) setAvatarUrl(body.data.avatarUrl);
          if (body.data.firmaNombre) setOrgFirma(body.data.firmaNombre);
          setOrgNombre(resolveTenantName(body.data?.nombre));
        }
      })
      .catch(() => {
        /* silencioso */
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarOrg();
    window.addEventListener('organization-updated', cargarOrg);
    return () => window.removeEventListener('organization-updated', cargarOrg);
  }, [cargarOrg]);

  return { avatarUrl, orgNombre, orgFirma, loading, refetch: cargarOrg };
}
