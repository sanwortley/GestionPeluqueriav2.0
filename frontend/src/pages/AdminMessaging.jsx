import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminMessaging() {
    const [waLoading, setWaLoading] = useState(false);
    const [waStatus, setWaStatus] = useState(null);
    const [pendingNotifs, setPendingNotifs] = useState([]);
    const [recentConfirmed, setRecentConfirmed] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchPendingNotifs = async () => {
        try {
            const res = await api.get('whatsapp/pending-notifs?days=7');
            setPendingNotifs(res.data);
        } catch(e) {
            console.error("Error fetching pending notifs", e);
        }
    };

    const fetchRecentConfirmed = async () => {
        try {
            const res = await api.get('whatsapp/recent-confirmed?days=3');
            setRecentConfirmed(res.data);
        } catch(e) {
            console.error("Error fetching recent confirmed", e);
        }
    };

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
        fetchPendingNotifs();
        fetchRecentConfirmed();
        const interval = setInterval(() => {
            fetchWhatsAppStatus();
            fetchPendingNotifs();
            fetchRecentConfirmed();
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleSendCustom = async (id, type, clientName) => {
        const confirmMsg = `¿Enviar mensaje de ${type} a ${clientName}?`;
        if (!window.confirm(confirmMsg)) return;
        
        try {
            setWaLoading(true);
            const res = await api.post(`whatsapp/send-custom/${id}?type=${type}`);
            if (res.data.ok) {
                fetchPendingNotifs();
                fetchRecentConfirmed();
            } else {
                alert(`❌ Error del Bridge: ${res.data.error || 'Desconocido'}`);
            }
        } catch(e) {
            alert("Error al enviar: " + (e.response?.data?.detail || e.message));
        } finally {
            setWaLoading(false);
        }
    };

    const handleDismiss = async (id) => {
        if (!window.confirm("¿Marcar como notificado sin enviar nada?")) return;
        try {
            await api.post(`whatsapp/dismiss/${id}`);
            fetchPendingNotifs();
        } catch(e) {
            alert("Error al descartar.");
        }
    };

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

    const handleTestSend = async () => {
        const phone = window.prompt("Teléfono (ej: 549351...)");
        if (!phone) return;
        const msg = window.prompt("Mensaje", "Prueba desde el panel.");
        if (!msg) return;
        try {
            await api.post('whatsapp/test-send?phone=' + encodeURIComponent(phone) + '&message=' + encodeURIComponent(msg));
            alert("Prueba enviada.");
        } catch(e) {
            alert("Error: " + (e.response?.data?.detail || e.message));
        }
    };

    const isConnected = waStatus?.isReady;
    const statusColor = isConnected ? '#10B981' : '#EF4444';

    // Helper for stage indicators
    const StageBadge = ({ label, active, onClick, disabled }) => (
        <button 
            disabled={disabled}
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '4px', border: 'none', padding: '4px 8px', borderRadius: '4px',
                background: active ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                color: active ? '#10B981' : '#9CA3AF',
                fontSize: '0.65rem', fontWeight: 600, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s',
                opacity: disabled ? 0.6 : 1, width: '100%', justifyContent: 'center'
            }}>
            {active ? '✅' : '📤'} {label}
        </button>
    );

    const NotificationTable = ({ data, title, color }) => (
        <div className="card" style={{ 
            marginBottom: '1.5rem', 
            border: `1px solid ${color}44`,
            padding: '1rem 0.5rem' // Less padding on sides for mobile
        }}>
            <h2 style={{ marginBottom: '1rem', color: color, fontSize: '1rem', padding: '0 0.5rem' }}>{title}</h2>
            {data.length > 0 ? (
                <div style={{ 
                    overflowX: 'auto', 
                    WebkitOverflowScrolling: 'touch', // Smooth scroll on iOS
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    borderRadius: '8px'
                }}>
                    <table style={{ width: '100%', minWidth: '600px', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '0.7rem 0.5rem' }}>Cliente / Fecha</th>
                                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center' }}>Etapa 1</th>
                                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center' }}>Etapa 2</th>
                                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center' }}>Etapa 3</th>
                                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(notif => (
                                <tr key={notif.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.7rem 0.5rem' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{notif.client_name}</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                            {new Date(notif.date).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'})} - {notif.start_time}hs
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <StageBadge label="Notif" active={!!notif.notified_at} disabled={waLoading} onClick={() => handleSendCustom(notif.id, 'NOTIFICAR', notif.client_name)} />
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <StageBadge label="Conf" active={!!notif.confirmation_sent_at} disabled={waLoading} onClick={() => handleSendCustom(notif.id, 'CONFIRMAR', notif.client_name)} />
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                        <StageBadge label="Rec" active={!!notif.reminder_sent_at} disabled={waLoading} onClick={() => handleSendCustom(notif.id, 'RECORDAR', notif.client_name)} />
                                    </td>
                                    <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={{
                                                fontSize: '0.55rem', padding: '2px 5px', borderRadius: '4px',
                                                background: notif.status === 'CONFIRMED' ? 'rgba(16,185,129,0.2)' : 
                                                           notif.status === 'PENDING' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                                                color: notif.status === 'CONFIRMED' ? '#10B981' : 
                                                       notif.status === 'PENDING' ? '#FBBF24' : '#EF4444',
                                                fontWeight: 'bold'
                                            }}>
                                                {notif.status}
                                            </span>
                                            {notif.notification_error && <div style={{ color: '#EF4444', fontSize: '0.55rem' }}>⚠️ Error</div>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic', margin: '0.5rem' }}>Nada que mostrar aquí.</p>
            )}
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ 
            maxWidth: '900px', 
            margin: '0 auto', 
            paddingBottom: '3rem',
            padding: '0 10px' // Margin on sides for phone
        }}>
            <h1 className="title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Mensajería</h1>

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

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '1rem', 
                marginBottom: '1.5rem' 
            }}>
                
                {/* Conectividad — Estética Original Restaurada */}
                <div className="card" style={{ margin: 0, padding: '1.2rem', textAlign: 'center' }}>
                    <div style={{ 
                        width: '50px', height: '50px', borderRadius: '50%', backgroundColor: `${statusColor}22`, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.8rem auto',
                        border: `2px solid ${statusColor}`
                    }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 12px ${statusColor}` }}></div>
                    </div>
                    
                    <h2 style={{ margin: '0 0 0.5rem 0', color: statusColor, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {isConnected ? 'WhatsApp Activo' : 'WhatsApp Desconectado'}
                    </h2>
                    
                    {isConnected ? (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.85rem', color: '#fff', margin: '0 0 4px 0', fontWeight: 'bold' }}>
                                {waStatus.sessionInfo?.pushname || 'Usuario'}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
                                {waStatus.sessionInfo?.wid?.split('@')[0]}
                            </p>
                            <button onClick={handleWhatsAppLogout} className="btn btn-secondary" style={{ marginTop: '1rem', borderColor: '#EF4444', color: '#EF4444', fontSize: '0.65rem', width: '100%', justifyContent: 'center' }}>
                                CERRAR SESIÓN
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.8rem' }}>
                                El servicio no está vinculado.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {waStatus?.qrUrl && (
                                    <a href={waStatus.qrUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', backgroundColor: '#10B981', borderColor: '#10B981', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        OBTENER CÓDIGO QR 📲
                                    </a>
                                )}
                                <button onClick={handleWhatsAppLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.65rem', opacity: 0.8 }}>
                                    LIMPIAR Y GENERAR NUEVO
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Acciones Rápidas */}
                <div className="card" style={{ margin: 0, padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h2 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '0.9rem', textAlign: 'center' }}>Diagnóstico y Control</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        <button onClick={handleTestSend} className="btn btn-secondary" style={{ fontSize: '0.7rem', justifyContent: 'center', padding: '0.8rem 0.4rem' }}>🚀 TEST</button>
                        <button onClick={() => { fetchPendingNotifs(); fetchRecentConfirmed(); }} className="btn btn-primary" style={{ fontSize: '0.7rem', justifyContent: 'center', padding: '0.8rem 0.4rem' }}>🔄 REFRESH</button>
                    </div>
                </div>
            </div>

            <NotificationTable data={pendingNotifs} title="⚠️ Pendientes o con Error" color="#FBBF24" />
            
            <NotificationTable data={recentConfirmed} title="📅 Turnos de Hoy y Próximos" color="#60A5FA" />

            <p style={{ fontSize: '0.7rem', color: '#6B7280', textAlign: 'center', marginTop: '1rem', padding: '0 1rem' }}>
                * El estado ✅ indica disparo satisfactorio. Use 📤 para envíos manuales.
            </p>
        </div>
    );
}
