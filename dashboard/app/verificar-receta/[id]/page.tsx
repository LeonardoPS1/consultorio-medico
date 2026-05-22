import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return iso?.split('T')[0] || ''; }
}
function formatDateTime(iso: string): string {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso || ''; }
}
function estadoColor(estado: string) {
  switch (estado) {
    case 'activa': return { bg: '#f0fdf4', fg: '#16a34a', border: '#bbf7d0' };
    case 'vencida': return { bg: '#fef2f2', fg: '#dc2626', border: '#fecaca' };
    default: return { bg: '#f8fafc', fg: '#64748b', border: '#e2e8f0' };
  }
}

// ─── Page ──────────────────────────────────────────────────

export default async function VerificarRecetaPage({ params }: { params: { id: string } }) {
  let receta: any = null;
  try {
    const res = await fetch(`http://localhost:3000/api/verificar-receta/${params.id}`, { cache: 'no-store' });
    if (!res.ok) receta = null;
    else { const json = await res.json(); receta = json.receta; }
  } catch { receta = null; }

  if (!receta) {
    return (
      <html lang="es"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Receta no encontrada</title></head>
      <body style={{margin:0,padding:'40px 16px',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#eff6ff,#fff,#f0fdf4)',fontFamily:'system-ui,sans-serif'}}>
        <div style={{maxWidth:480,width:'100%',background:'white',borderRadius:16,boxShadow:'0 4px 24px rgba(0,0,0,.08)',padding:'40px 32px',textAlign:'center'}}>
          <div style={{width:80,height:80,borderRadius:20,background:'#fef2f2',color:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h1 style={{fontSize:24,fontWeight:700,margin:'0 0 8px',color:'#1e293b'}}>Receta no encontrada</h1>
          <p style={{fontSize:15,color:'#64748b',margin:'0 0 4px'}}>El código QR escaneado no corresponde a una receta válida.</p>
          <p style={{fontSize:13,color:'#94a3b8',marginTop:16}}>Contactá a tu consultorio médico si creés que esto es un error.</p>
        </div>
      </body></html>
    );
  }

  const ec = estadoColor(receta.estado);

  return (
    <html lang="es"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/><title>Receta: {receta.medicamento} - {receta.paciente}</title></head>
    <body style={{margin:0,padding:'40px 16px',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#eff6ff,#fff,#f0fdf4)',fontFamily:'system-ui,sans-serif',color:'#1a1a2e'}}>
      <div style={{maxWidth:520,width:'100%',background:'white',borderRadius:16,boxShadow:'0 4px 24px rgba(0,0,0,.08)',padding:'40px 32px'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:80,height:80,borderRadius:20,background:'#f0fdf4',color:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 style={{fontSize:24,fontWeight:700,margin:'0 0 4px',color:'#1e293b'}}>Receta Verificada</h1>
          <p style={{fontSize:14,color:'#64748b',margin:0}}>Documento emitido electrónicamente — autenticidad confirmada</p>
        </div>

        <div style={{height:1,background:'#e2e8f0',margin:'0 0 20px'}}/>

        {/* Medicamento */}
        <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0'}}>
          <span style={{fontSize:12,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.5px'}}>Medicamento</span>
          <span style={{fontSize:17,fontWeight:700,color:'#1e293b',textAlign:'right'}}>{receta.medicamento}</span>
        </div>

        <Row label="Dosis" value={receta.dosis} />
        <Row label="Frecuencia" value={receta.frecuencia} />
        {receta.duracion && <Row label="Duración" value={receta.duracion} />}
        {receta.indicaciones && <Row label="Indicaciones" value={receta.indicaciones} />}

        <Row label="Estado" value={
          `<span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;background:${ec.bg};color:${ec.fg};border:1px solid ${ec.border}">${receta.estado.toUpperCase()}</span>`
        } html />

        <div style={{height:1,background:'#e2e8f0',margin:'20px 0'}}/>

        <Row label="Paciente" value={receta.paciente} bold />
        <Row label="Médico" value={`${receta.medico}${receta.matricula ? `<br/><span style="font-size:11px;color:#94a3b8">Matrícula: ${receta.matricula}</span>` : ''}`} html />
        <Row label="Emitida" value={formatDateTime(receta.emitida)} />
        <Row label="Válida hasta" value={receta.fechaFin ? formatDate(receta.fechaFin) : 'Sin vencimiento'} />
        <Row label="Fecha inicio" value={formatDate(receta.fechaInicio)} />

        <div style={{height:1,background:'#e2e8f0',margin:'20px 0'}}/>

        {/* Sello */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:14,background:'#f0fdf4',borderRadius:12,border:'1px solid #bbf7d0',marginBottom:16}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          <span style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>Documento verificado electrónicamente</span>
        </div>

        <p style={{fontSize:11,color:'#cbd5e1',textAlign:'center',margin:0}}>
          ID: {receta.emitida}<br/>Este código QR certifica la autenticidad de la receta.
        </p>
      </div>
    </body></html>
  );
}

// ─── Sub-componente ───────────────────────────────────────

function Row({ label, value, bold, html }: { label: string; value: string; bold?: boolean; html?: boolean }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'10px 0'}}>
      <span style={{fontSize:12,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.5px',minWidth:100}}>{label}</span>
      {html ? (
        <span style={{fontSize:14,fontWeight:bold?700:500,color:'#334155',textAlign:'right',flex:1}} dangerouslySetInnerHTML={{__html: value}} />
      ) : (
        <span style={{fontSize:14,fontWeight:bold?700:500,color:'#334155',textAlign:'right',flex:1}}>{value}</span>
      )}
    </div>
  );
}
