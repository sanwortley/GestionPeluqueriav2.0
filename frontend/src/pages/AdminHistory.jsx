import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api';

export default function AdminHistory() {
    const [appointments, setAppointments] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const LIMIT = 50;

    useEffect(() => {
        fetchAppointments(0, true);
    }, []);

    const fetchAppointments = async (skip = 0, isNewSearch = false) => {
        try {
            setLoading(true);
            const res = await api.get(`appointments/?skip=${skip}&limit=${LIMIT}&search=${searchTerm}`);
            const newData = res.data;
            
            if (isNewSearch) {
                setAppointments(newData);
            } else {
                setAppointments(prev => [...prev, ...newData]);
            }
            
            setHasMore(newData.length === LIMIT);
            setPage(skip + LIMIT);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0);
        fetchAppointments(0, true);
    }

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchAppointments(page);
        }
    };

    const togglePaid = async (id, currentPaid) => {
        try {
            await api.patch(`appointments/${id}/`, { is_paid: !currentPaid });
            // Update local state
            setAppointments(appointments.map(a =>
                a.id === id ? { ...a, is_paid: !currentPaid } : a
            ));
        } catch (err) {
            alert('Error al actualizar estado de pago');
            console.error(err);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            if (!confirm(`¿Seguro que deseas cambiar el estado a ${newStatus === 'CANCELLED' ? 'CANCELADO' : 'CONFIRMADO'}?`)) return;

            await api.patch(`appointments/${id}/`, { status: newStatus });
            // Update local state
            setAppointments(appointments.map(a =>
                a.id === id ? { ...a, status: newStatus } : a
            ));
        } catch (err) {
            alert('Error al actualizar estado del turno');
            console.error(err);
        }
    };

    const deleteAppointment = async (id) => {
        try {
            if (!confirm('¿Estás seguro de que deseas ELIMINAR este turno permanentemente del historial? Esta acción no se puede deshacer.')) return;

            // Optimistic UI update
            const previousAppts = [...appointments];
            setAppointments(appointments.filter(a => a.id !== id));

            await api.delete(`appointments/${id}/`);
        } catch (err) {
            // Rollback
            setAppointments(previousAppts);
            alert('Error al eliminar el turno');
            console.error(err);
        }
    };

    // We no longer need to filter in frontend for basic search, 
    // but we can keep it if we want to filter the ALREADY loaded batch
    const filteredAppointments = appointments;

    return (
        <div className="animate-fade-in">
            <h1 className="title">Historial de Turnos</h1>

            <div className="card">
                <form onSubmit={handleSearch} style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o servicio..."
                        className="input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>Buscar</button>
                    {searchTerm && (
                        <button type="button" className="btn btn-secondary" onClick={() => { setSearchTerm(''); setPage(0); fetchAppointments(0, true); }}>Limpiar</button>
                    )}
                </form>


                {loading ? (
                    <p>Cargando historial...</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Hora</th>
                                    <th>Cliente</th>
                                    <th>Teléfono</th>
                                    <th>Servicio</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'center' }}>Cobrado</th>
                                    <th>Nota</th>
                                    <th style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAppointments.map((appt, index) => {
                                    const prevAppt = filteredAppointments[index - 1];
                                    const isNewDay = !prevAppt || prevAppt.date !== appt.date;

                                    return (
                                        <tr key={appt.id} className={isNewDay ? 'new-day-row' : ''}>
                                            <td style={{ fontWeight: isNewDay ? 'bold' : 'normal', color: isNewDay ? 'var(--primary)' : 'inherit' }}>
                                                {format(new Date(appt.date + 'T12:00:00'), 'dd/MM/yyyy')}
                                            </td>
                                            <td>{appt.start_time}</td>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>{appt.client_name}</div>
                                            </td>
                                            <td className="text-muted">{appt.client_phone}</td>
                                            <td>{appt.service?.name || '-'}</td>
                                            <td>
                                                <select
                                                    value={appt.status}
                                                    onChange={(e) => updateStatus(appt.id, e.target.value)}
                                                    style={{
                                                        padding: '0.4rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        backgroundColor:
                                                            appt.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' :
                                                                appt.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.2)' :
                                                                    appt.status === 'FINISHED' ? 'rgba(59, 130, 246, 0.2)' :
                                                                        appt.status === 'PENDING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                                                        color:
                                                            appt.status === 'CONFIRMED' ? '#10B981' :
                                                                appt.status === 'CANCELLED' ? '#EF4444' :
                                                                    appt.status === 'FINISHED' ? '#3B82F6' :
                                                                        appt.status === 'PENDING' ? '#F59E0B' : '#9CA3AF',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        cursor: 'pointer',
                                                        width: '120px'
                                                    }}
                                                >
                                                    <option value="PENDING" style={{ background: '#111', color: '#F59E0B' }}>Pendiente</option>
                                                    <option value="CONFIRMED" style={{ background: '#111', color: '#10B981' }}>Confirmado</option>
                                                    <option value="FINISHED" style={{ background: '#111', color: '#3B82F6' }}>Finalizado</option>
                                                    <option value="CANCELLED" style={{ background: '#111', color: '#EF4444' }}>Cancelado</option>
                                                    <option value="NO_SHOW" style={{ background: '#111', color: '#9CA3AF' }}>No vino</option>
                                                </select>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => togglePaid(appt.id, appt.is_paid)}
                                                    style={{
                                                        background: appt.is_paid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        border: `1px solid ${appt.is_paid ? '#10B981' : '#EF4444'}`,
                                                        borderRadius: '20px',
                                                        cursor: 'pointer',
                                                        padding: '0.3rem 0.8rem',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.75rem'
                                                    }}
                                                    title="Tocar para cambiar estado de pago"
                                                >
                                                    {appt.is_paid ? (
                                                        <span style={{ color: '#10B981', fontWeight: 'bold' }}>PAGADO</span>
                                                    ) : (
                                                        <span style={{ color: '#EF4444', fontWeight: 'bold' }}>IMPAGO</span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="text-muted" style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.note || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <i
                                                    onClick={() => deleteAppointment(appt.id)}
                                                    className="fas fa-trash"
                                                    style={{
                                                        color: 'rgba(239, 68, 68, 0.4)',
                                                        cursor: 'pointer',
                                                        padding: '0.5rem',
                                                        fontSize: '0.9rem',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    title="Eliminar turno permanentemente"
                                                    onMouseOver={e => e.target.style.color = 'var(--danger)'}
                                                    onMouseOut={e => e.target.style.color = 'rgba(239, 68, 68, 0.4)'}
                                                ></i>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredAppointments.length === 0 && (
                                    <tr className="empty-row">
                                        <td colSpan="9">
                                            No se encontraron turnos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {hasMore && appointments.length > 0 && (
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <button 
                            onClick={loadMore} 
                            className="btn btn-secondary" 
                            disabled={loading}
                            style={{ padding: '0.6rem 2rem' }}
                        >
                            {loading ? 'Cargando...' : 'Cargar más turnos'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
