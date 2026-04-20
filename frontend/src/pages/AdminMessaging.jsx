import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminMessaging() {
    const [waLoading, setWaLoading] = useState(false);
    const [waStatus, setWaStatus] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchWhatsAppStatus = async () => {
        try {
            const res = await api.get('whatsapp/status');
            setWaStatus(res.data);
        } catch (err) {
            console.error("Error fetching WA status", err);
        }
    };

    useEffect(() => {
        fetchWhatsAppStatus();
        const interval = setInterval(fetchWhatsAppStatus, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleWhatsAppLogout = async () => {
        if (!window.confirm("¿Estás seguro de que querés desvincular el WhatsApp actual?")) return;
        try {
            setWaLoading(true);
            await api.post('whatsapp/logout');
            setMessage({ type: 'success', text: '✅ WhatsApp desvinculado.' });
            fetchWhatsAppStatus();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al desvincular' });
        } finally {
            setWaLoading(false);
        }
    };

    const isConnected = waStatus?.isReady;
    const statusColor = isConnected ? '#10B981' : '#EF4444';

    return (
        <div className="animate-fade-in" style={{ 
            maxWidth: '600px', 
            margin: '0 auto', 
            paddingBottom: '3rem',
            padding: '0 10px'
        }}>
            <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Mensajería WhatsApp</h1>

            {message.text && (
                <div style={{
                    padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem',
                    backgroundColor: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: message.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                    fontSize: '0.85rem'
                }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ 
                    width: '60px', height: '60px', borderRadius: '50%', backgroundColor: `${statusColor}22`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto',
                    border: `2px solid ${statusColor}`
                }}>
                    <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 15px ${statusColor}` }}></div>
                </div>
                
                <h2 style={{ margin: '0 0 1rem 0', color: statusColor, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                </h2>
                
                {isConnected ? (
                    <div>
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '1rem', color: '#fff', margin: '0 0 4px 0', fontWeight: 'bold' }}>
                                {waStatus.sessionInfo?.pushname || 'Vinculado'}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0 }}>
                                {waStatus.sessionInfo?.wid?.split('@')[0]}
                            </p>
                        </div>
                        <button onClick={handleWhatsAppLogout} className="btn btn-secondary w-full" style={{ borderColor: '#EF4444', color: '#EF4444' }} disabled={waLoading}>
                            DESVINCULAR WHATSAPP
                        </button>
                    </div>
                ) : (
                    <div>
                        <p style={{ fontSize: '0.9rem', color: '#9CA3AF', marginBottom: '1.5rem' }}>
                            Escanea el código QR desde WhatsApp en tu teléfono para vincular el servicio.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {waStatus?.qrUrl && (
                                <a href={waStatus.qrUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full" style={{ backgroundColor: '#10B981', borderColor: '#10B981', fontWeight: 'bold' }}>
                                    VER CÓDIGO QR 📲
                                </a>
                            )}
                            <button onClick={fetchWhatsAppStatus} className="btn btn-secondary w-full">
                                ACTUALIZAR ESTADO
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <p style={{ fontSize: '0.8rem', color: '#60A5FA', margin: 0, textAlign: 'center' }}>
                    💡 <strong>Tip:</strong> Ahora podés enviar confirmaciones y recordatorios directamente desde la <strong>Agenda de Turnos</strong> usando los botones de acción.
                </p>
            </div>
        </div>
    );
}
