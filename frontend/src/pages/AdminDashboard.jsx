import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import api from '../api';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'es': es,
    'en-US': enUS
};

const localizer = dateFnsLocalizer({
    format, parse, startOfWeek, getDay, locales
});

export default function AdminDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [dayAppointments, setDayAppointments] = useState([]);
    const [availabilityMap, setAvailabilityMap] = useState({});

    // Availability Form State
    const [enabled, setEnabled] = useState(true);
    const [slotSize, setSlotSize] = useState(45);
    const [ranges, setRanges] = useState([{ start_time: '10:00', end_time: '13:00' }, { start_time: '14:45', end_time: '21:30' }]);

    const [blocks, setBlocks] = useState([]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');
    const [paidStatus, setPaidStatus] = useState({}); // { id: boolean }

    useEffect(() => {
        fetchAllData();
    }, [currentDate]);

    const fetchAllData = async () => {
        try {
            const [apptsRes, blocksRes] = await Promise.all([
                api.get('appointments/'),
                api.get('blocks/')
            ]);

            const apptEvents = apptsRes.data.map(appt => ({
                id: `appt-${appt.id}`,
                title: `${appt.client_name} - ${appt.service?.name || "Servicio"}`,
                start: new Date(appt.date + 'T' + appt.start_time),
                end: new Date(appt.date + 'T' + appt.end_time),
                resource: appt,
                isBlock: false
            }));

            const blockEvents = blocksRes.data.map(block => ({
                id: `block-${block.id}`,
                title: `BLOQUEO: ${block.reason || 'S/M'}`,
                start: new Date(block.start_date + 'T' + block.start_time),
                end: new Date(block.end_date + 'T' + block.end_time),
                resource: block,
                isBlock: true
            }));

            setAppointments([...apptEvents, ...blockEvents]);
            setBlocks(blocksRes.data);
            if (selectedDate) {
                refreshDayAppointments(selectedDate, [...apptEvents, ...blockEvents]);
            }
            fetchAvailabilityMonth(currentDate);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAvailabilityMonth = async (date) => {
        const start = format(subMonths(date, 1), 'yyyy-MM-dd');
        const end = format(addMonths(date, 1), 'yyyy-MM-dd');
        try {
            const res = await api.get(`availability/?from=${start}&to=${end}`);
            const map = {};
            res.data.forEach(d => {
                map[d.date] = d;
            });
            setAvailabilityMap(map);
        } catch (e) {
            console.error(e);
        }
    }

    const handleSelectSlot = async ({ start }) => {
        setSelectedDate(start);
        refreshDayAppointments(start, appointments);

        const dateStr = format(start, 'yyyy-MM-dd');
        const av = availabilityMap[dateStr];

        if (av) {
            setEnabled(av.enabled);
            setSlotSize(av.slot_size_min);
            setRanges(av.ranges.sort((a, b) => a.start_time.localeCompare(b.start_time)));
        } else {
            setEnabled(false);
            setSlotSize(30);
            setRanges([]);
        }

        if (window.innerWidth < 992) {
            const detailElement = document.getElementById('day-detail');
            if (detailElement) {
                detailElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    const refreshDayAppointments = (date, allEvents) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayEvents = allEvents.filter(e => {
            if (e.isBlock) {
                const startStr = format(e.start, 'yyyy-MM-dd');
                const endStr = format(e.end, 'yyyy-MM-dd');
                return dateStr >= startStr && dateStr <= endStr;
            } else {
                return format(e.start, 'yyyy-MM-dd') === dateStr;
            }
        });
        setDayAppointments(dayEvents);
    }

    const handleDeleteBlock = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este bloqueo?')) return;
        try {
            await api.delete(`blocks/${id}`);
            alert('Bloqueo eliminado');
            fetchAllData();
        } catch (err) {
            alert('Error al eliminar bloqueo');
        }
    };

    const handleDeleteAppointment = async (id) => {
        if (!confirm('¿Estás seguro de que deseas ELIMINAR este turno?')) return;
        try {
            await api.delete(`appointments/${id}`);
            alert('Turno eliminado');
            fetchAllData(); 
        } catch (err) {
            alert('Error al eliminar el turno');
        }
    };

    const handleSendCustomMessage = async (id, type) => {
        try {
            const res = await api.post(`whatsapp/send-custom/${id}?type=${type}`);
            if (res.data.ok) {
                alert('Mensaje enviado correctamente');
            } else {
                alert('Error al enviar mensaje');
            }
        } catch (err) {
            alert('Error al conectar con el servidor');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            if (status === 'CANCELLED') {
                if (!confirm('¿Seguro que deseas cancelar este turno?')) return;
                await api.put(`appointments/${id}/cancel`);
            } else if (status === 'FINISHED') {
                const isPaid = paidStatus[id] || false;
                await api.put(`appointments/${id}/finish?is_paid=${isPaid}`);
            } else if (status === 'CONFIRMED') {
                await api.put(`appointments/${id}/confirm`);
            } else {
                return;
            }

            alert('Turno actualizado');
            fetchAllData();
        } catch (err) {
            alert('Error al actualizar turno');
        }
    };

    const handleSaveAvailability = async () => {
        if (!selectedDate) return;
        try {
            const d = format(selectedDate, 'yyyy-MM-dd');
            await api.put(`availability/${d}`, {
                enabled,
                slot_size_min: slotSize,
                ranges,
                staff_id: null
            });
            alert('Disponibilidad actualizada');
            fetchAvailabilityMonth(currentDate);
        } catch (err) {
            alert('Error al guardar');
        }
    };

    const handleRangeChange = (idx, field, val) => {
        const newRanges = [...ranges];
        newRanges[idx][field] = val;
        setRanges(newRanges);
    };

    const addRange = () => {
        setRanges([...ranges, { start_time: '09:00', end_time: '10:00' }]);
    };

    const removeRange = (idx) => {
        const newRanges = ranges.filter((_, i) => i !== idx);
        setRanges(newRanges);
    };

    const dayPropGetter = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const av = availabilityMap[dateStr];
        const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;

        const isBlocked = blocks.some(b =>
            dateStr >= b.start_date && dateStr <= b.end_date
        );

        let style = {};
        if (isSelected) style.border = '2px solid var(--primary)';

        if (isBlocked) {
            style = { ...style, backgroundColor: 'rgba(239, 68, 68, 0.4)', border: '1px solid var(--danger)' };
        } else if (av) {
            if (!av.enabled) {
                style = { backgroundColor: 'rgba(239, 68, 68, 0.2)' }; 
            } else {
                style = { backgroundColor: 'rgba(16, 185, 129, 0.2)' }; 
            }
        }
        return { style };
    }

    const handleNavigate = (newDate) => {
        setCurrentDate(newDate);
    }

    const minTime = new Date();
    minTime.setHours(8, 0, 0);

    const maxTime = new Date();
    maxTime.setHours(23, 0, 0);

    return (
        <div className="flex gap-4 dashboard-grid">
            <div className="flex-2">
                <h1 className="title">Agenda Admin</h1>
                <div style={{ height: 600 }}>
                    <Calendar
                        min={minTime}
                        max={maxTime}
                        localizer={localizer}
                        events={appointments}
                        startAccessor="start"
                        endAccessor="end"
                        selectable
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={(e) => {
                            handleSelectSlot({ start: e.start });
                        }}
                        view={view}
                        onView={(v) => setView(v)}
                        dayPropGetter={dayPropGetter}
                        onNavigate={handleNavigate}
                        getDrilldownView={() => null}
                        onDrillDown={(date) => handleSelectSlot({ start: date })}
                        date={currentDate}
                        eventPropGetter={(event) => {
                            if (event.isBlock) {
                                return { style: { backgroundColor: 'var(--danger)', color: 'white', borderRadius: '2px', border: 'none' } };
                            }
                            return { style: { backgroundColor: '#3174ad', borderRadius: '4px' } };
                        }}
                        culture='es'
                        messages={{
                            next: "Sig.",
                            previous: "Ant.",
                            today: "Hoy",
                            month: "Mes",
                            week: "Semana",
                            day: "Día",
                            agenda: "Agenda",
                            allDay: "Todo el día",
                            date: "Fecha",
                            time: "Hora",
                            event: "Turno",
                        }}
                    />
                </div>
            </div>

            <div style={{ flex: 1 }} className="card" id="day-detail">
                <h2 className="subtitle">Detalle del Día</h2>
                {selectedDate ? (
                    <div>
                        <h3>{format(selectedDate, 'dd/MM/yyyy')}</h3>
                        {dayAppointments.some(e => e.isBlock) ? (
                            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '4px', marginBottom: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
                                ESTE DÍA TIENE UN BLOQUEO ACTIVO.
                            </div>
                        ) : (
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0 }}>Disponibilidad</h4>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                                        Habilitado
                                    </label>
                                </div>
                                {enabled && (
                                    <>
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label className="label">Tamaño de Slot (min)</label>
                                            <input type="number" className="input" value={slotSize} onChange={e => setSlotSize(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Rangos</label>
                                            {ranges.map((r, i) => (
                                                <div key={i} className="flex gap-2 items-center range-row" style={{ marginBottom: '0.5rem' }}>
                                                    <input type="time" className="input" value={r.start_time} onChange={e => handleRangeChange(i, 'start_time', e.target.value)} />
                                                    <span>-</span>
                                                    <input type="time" className="input" value={r.end_time} onChange={e => handleRangeChange(i, 'end_time', e.target.value)} />
                                                    <button onClick={() => removeRange(i)} className="btn btn-danger btn-sm">✕</button>
                                                </div>
                                            ))}
                                            <button onClick={addRange} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>+ Agregar Rango</button>
                                        </div>
                                    </>
                                )}
                                <button onClick={handleSaveAvailability} className="btn btn-primary w-full" style={{ marginTop: '1.5rem' }}>GUARDAR CONFIGURACIÓN</button>
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'left' }}>Turnos y Bloqueos</h4>
                            {dayAppointments.length === 0 && <p className="text-muted">No hay actividad para este día.</p>}
                            
                            <div className="desktop-only">
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Hora</th>
                                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Cliente</th>
                                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dayAppointments.map(e => (
                                            <tr key={e.id}>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <strong style={{ color: e.isBlock ? 'var(--danger)' : 'var(--primary)' }}>
                                                        {e.isBlock ? e.resource.start_time : format(e.start, 'HH:mm')}
                                                    </strong>
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    {e.isBlock ? (
                                                        <div style={{ color: 'var(--danger)' }}>BLOQUEO: {e.resource.reason}</div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ fontWeight: 'bold' }}>{e.resource.client_name}</div>
                                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{e.resource.service?.name}</div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                    {e.isBlock ? (
                                                        <button onClick={() => handleDeleteBlock(e.resource.id)} className="btn btn-danger btn-sm">Eliminar</button>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                                            {e.resource.status === 'PENDING' && (
                                                                <>
                                                                    <button onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'CANCELLED')} className="btn btn-danger btn-sm">Rechazar</button>
                                                                    <button onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'CONFIRMED')} className="btn btn-primary btn-sm" style={{ backgroundColor: '#FBBF24', color: '#000' }}>Confirmar</button>
                                                                    <button onClick={() => handleSendCustomMessage(e.id.replace('appt-', ''), 'RECORDAR')} className="btn btn-secondary btn-sm"><i className="fas fa-bell"></i></button>
                                                                </>
                                                            )}
                                                            {e.resource.status === 'CONFIRMED' && (
                                                                <>
                                                                    <button onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'FINISHED')} className="btn btn-primary btn-sm" style={{ backgroundColor: '#10B981' }}>Cerrar</button>
                                                                    <button onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'CANCELLED')} className="btn btn-danger btn-sm">Anular</button>
                                                                    <button onClick={() => handleSendCustomMessage(e.id.replace('appt-', ''), 'RECORDAR')} className="btn btn-secondary btn-sm"><i className="fas fa-bell"></i></button>
                                                                </>
                                                            )}
                                                            {(e.resource.status === 'CANCELLED' || e.resource.status === 'FINISHED') && (
                                                                <button onClick={() => handleDeleteAppointment(e.id.replace('appt-', ''))} className="btn btn-secondary btn-sm"><i className="fas fa-trash"></i></button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {dayAppointments.map(e => (
                                    <div key={e.id} className="card" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <strong style={{ color: e.isBlock ? 'var(--danger)' : 'var(--primary)', fontSize: '1.2rem' }}>
                                                {e.isBlock ? e.resource.start_time : format(e.start, 'HH:mm')}
                                            </strong>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{e.resource.status}</span>
                                        </div>
                                        <div style={{ marginBottom: '1rem' }}>
                                            {e.isBlock ? (
                                                <div style={{ color: 'var(--danger)' }}>BLOQUEO: {e.resource.reason}</div>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: 'bold' }}>{e.resource.client_name}</div>
                                                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{e.resource.service?.name}</div>
                                                </>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            {e.isBlock ? (
                                                <button onClick={() => handleDeleteBlock(e.resource.id)} className="btn btn-danger w-full btn-sm">Eliminar Bloqueo</button>
                                            ) : (
                                                <>
                                                    {e.resource.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'CANCELLED')} className="btn btn-danger btn-sm" style={{ flex: 1 }}>Rechazar</button>
                                                            <button onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'CONFIRMED')} className="btn btn-primary btn-sm" style={{ flex: 1, backgroundColor: '#FBBF24', color: '#000' }}>Confirmar</button>
                                                            <button onClick={() => handleSendCustomMessage(e.id.replace('appt-', ''), 'RECORDAR')} className="btn btn-secondary btn-sm"><i className="fas fa-bell"></i></button>
                                                        </>
                                                    )}
                                                    {e.resource.status === 'CONFIRMED' && (
                                                        <>
                                                            <button onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'FINISHED')} className="btn btn-primary btn-sm" style={{ flex: 1, backgroundColor: '#10B981' }}>Cerrar</button>
                                                            <button onClick={() => handleSendCustomMessage(e.id.replace('appt-', ''), 'RECORDAR')} className="btn btn-secondary btn-sm"><i className="fas fa-bell"></i></button>
                                                        </>
                                                    )}
                                                    {(e.resource.status === 'CANCELLED' || e.resource.status === 'FINISHED') && (
                                                        <button onClick={() => handleDeleteAppointment(e.id.replace('appt-', ''))} className="btn btn-secondary btn-sm w-full"><i className="fas fa-trash"></i> Borrar</button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p>Selecciona un día en el calendario.</p>
                )}
            </div>
        </div>
    );
}
