import { useState, useEffect } from 'react';
import { format, parse, startOfWeek, getDay, addDays, eachDayOfInterval, endOfWeek, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../api';

export default function ClientBooking() {
    const [step, setStep] = useState(1);
    const [services, setServices] = useState([]);

    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [blocks, setBlocks] = useState([]);

    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [note, setNote] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchServices();
        fetchBlocks();
    }, []);

    const [existingClientMsg, setExistingClientMsg] = useState('');

    const handlePhoneBlur = async () => {
        if (!clientPhone || clientPhone.length < 6) return;
        try {
            const res = await api.get(`/clients/lookup?phone=${clientPhone}`);
            if (res.data) {
                setClientName(res.data.name);
                setExistingClientMsg(`¡Hola de nuevo, ${res.data.name}!`);
            }
        } catch (err) {
            setExistingClientMsg('');
        }
    };

    const fetchBlocks = async () => {
        try {
            const res = await api.get('/blocks');
            setBlocks(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await api.get('/services');
            setServices(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSlots = async (date, serviceId) => {
        setLoading(true);
        setSlots([]);
        setError('');
        const dateStr = format(date, 'yyyy-MM-dd');
        try {
            const res = await api.get('/slots', {
                params: {
                    date: dateStr,
                    service_id: serviceId,
                    staff_id: selectedStaff ? selectedStaff.id : undefined
                }
            });
            setSlots(res.data);
        } catch (err) {
            setError('Error al cargar turnos');
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Calendar Select
    const handleDateSelect = ({ start }) => {
        // Prevent past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (start < today) {
            return;
        }

        setSelectedDate(start);
        setStep(2); // Go to Services
    };

    // Step 2: Service Select
    const handleServiceSelect = (s) => {
        setSelectedService(s);
        setStep(3); // Go to Slots
        fetchSlots(selectedDate, s.id);
    };

    // Step 3: Slot Select
    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
        setStep(4); // Go to Confirm
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/appointments', {
                date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: selectedSlot.start_time,
                service_id: selectedService.id,
                staff_id: selectedStaff?.id,
                client_name: clientName,
                client_phone: clientPhone,
                note: note
            });
            alert('Turno confirmado!');
            // Reset to start
            setStep(1);
            setSelectedDate(new Date());
            setSelectedService(null);
            setSelectedSlot(null);
            setClientName('');
            setClientPhone('');
        } catch (err) {
            alert('Error al reservar: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="booking-page">

            {step === 1 && (
                <div className="hero-section" style={{
                    textAlign: 'center',
                    marginBottom: '3.5rem',
                    padding: '8rem 2rem',
                    background: 'radial-gradient(circle at center, rgba(30, 30, 30, 1) 0%, rgba(5, 5, 5, 1) 100%)',
                    borderRadius: '0',
                    boxShadow: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '60vh'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', position: 'relative', zIndex: 2 }}>

                        {/* Logo Restored */}
                        <div style={{ position: 'relative' }}>
                            <img src="/images/logo.jpg" style={{
                                width: '220px',
                                height: '220px',
                                objectFit: 'cover',
                                borderRadius: '50%',
                                border: '4px solid #fff',
                                padding: '0',
                                background: 'transparent',
                                boxShadow: '0 0 30px rgba(0,0,0,0.5)'
                            }} alt="Logo" />
                        </div>

                        <div>
                            <h1 className="title" style={{
                                fontFamily: "'Staatliches', cursive",
                                fontSize: '6rem',
                                marginBottom: '0.5rem',
                                color: '#fff',
                                letterSpacing: '8px',
                                fontWeight: 'bold',
                                lineHeight: '1',
                                textTransform: 'uppercase'
                            }}>
                                ROMA CABELLO
                            </h1>
                            <p className="subtitle" style={{
                                fontSize: '1.4rem',
                                color: '#aaa',
                                textTransform: 'uppercase',
                                letterSpacing: '6px',
                                marginTop: '1rem',
                                fontWeight: '300'
                            }}>
                                Barbería de Barrio • Estilo Tradicional
                            </p>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <a href="#calendario" className="btn btn-primary" style={{
                                fontFamily: "'Staatliches', sans-serif",
                                padding: '1rem 3rem',
                                fontSize: '1.4rem',
                                borderRadius: '4px',
                                border: 'none',
                                letterSpacing: '2px',
                                backgroundColor: '#fff',
                                color: '#000',
                                fontWeight: 'normal',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(255,255,255,0.1)'
                            }} onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('calendario')?.scrollIntoView({ behavior: 'smooth' });
                            }}>
                                RESERVAR TURNO
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <div id="calendario" style={{ paddingTop: step === 1 ? '2rem' : '0' }}>
                <h2 className="title" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>
                    {step === 1 ? 'Elegí tu fecha' :
                        step === 2 ? 'Seleccioná el servicio' :
                            step === 3 ? 'Buscá tu horario' : 'Confirmá tus datos'}
                </h2>

                {step === 1 && (
                    <div className="animate-fade-in card" style={{ padding: '2rem' }}>
                        <div className="days-grid">
                            {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
                                <div key={d} style={{
                                    textAlign: 'center',
                                    fontFamily: "'Staatliches', sans-serif",
                                    fontSize: '1rem',
                                    color: 'var(--primary)',
                                    marginBottom: '1rem'
                                }}>{d}</div>
                            ))}

                            {(() => {
                                const today = startOfToday();
                                const start = startOfWeek(today, { weekStartsOn: 1 });
                                const end = endOfWeek(addDays(today, 7), { weekStartsOn: 1 });
                                const days = eachDayOfInterval({ start, end });

                                return days.map((day, idx) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const block = blocks.find(b => dateStr >= b.start_date && dateStr <= b.end_date);
                                    const isBlocked = !!block;
                                    const isPast = day < today;
                                    const isDisabled = isPast || isBlocked;
                                    const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                                    const isTodayDay = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

                                    return (
                                        <button
                                            key={idx}
                                            disabled={isDisabled}
                                            title={isBlocked ? (block.reason || 'Cerrado') : ''}
                                            onClick={() => {
                                                setSelectedDate(day);
                                                setStep(2);
                                            }}
                                            style={{
                                                aspectRatio: '1/1',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                                border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                                                borderRadius: '2px',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                opacity: isPast ? 0.15 : (isBlocked ? 0.4 : 1),
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                color: isSelected ? '#000' : 'var(--text-main)',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem', fontFamily: "'Staatliches', sans-serif", color: isBlocked && !isSelected ? '#666' : 'inherit' }}>{format(day, 'd')}</span>

                                            {format(day, 'd') === '1' && (
                                                <span style={{ fontSize: '0.6rem', position: 'absolute', top: '4px', opacity: 0.8 }}>{format(day, 'MMM', { locale: es }).toUpperCase()}</span>
                                            )}

                                            {isTodayDay && !isSelected && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '8px',
                                                    width: '4px',
                                                    height: '4px',
                                                    borderRadius: '50%',
                                                    background: 'var(--primary)',
                                                    boxShadow: '0 0 5px var(--primary)'
                                                }}></div>
                                            )}

                                            {isBlocked && !isSelected && (
                                                <div style={{
                                                    fontSize: '0.55rem',
                                                    color: 'var(--text-muted)',
                                                    fontStyle: 'italic',
                                                    marginTop: '4px',
                                                    maxWidth: '90%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {block.reason || 'Cerrado'}
                                                </div>
                                            )}

                                            {isBlocked && !isSelected && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    fontSize: '0.6rem',
                                                    opacity: 0.6,
                                                    color: 'rgba(255, 255, 255, 0.5)',
                                                    fontWeight: 'bold'
                                                }}>✕</div>
                                            )}
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                        <p className="subtitle" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '1rem' }}>
                            Seleccioná un día disponible para ver los servicios.
                        </p>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <h2 className="subtitle">2. Elegí un servicio para el {format(selectedDate, 'dd/MM/yyyy')}</h2>
                        <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ marginBottom: '1rem' }}>Volver</button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {services.map(s => (
                                <div key={s.id} onClick={() => handleServiceSelect(s)} className="card" style={{ cursor: 'pointer', width: '250px' }}>
                                    <h3>{s.name}</h3>
                                    <p>{s.duration_min} min</p>
                                    <p>${s.price}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in">
                        <h2 className="subtitle">3. Elegí un horario</h2>
                        <p style={{ marginBottom: '1rem' }}>{selectedService?.name} - {format(selectedDate, 'dd/MM/yyyy')}</p>
                        <button className="btn btn-secondary" onClick={() => setStep(2)}>Volver</button>

                        {loading && <p>Cargando horarios...</p>}

                        {!loading && slots.length === 0 && <p style={{ marginTop: '1rem' }}>No hay turnos disponibles para este día/servicio.</p>}

                        <div className="slots-grid">
                            {slots.map((slot, idx) => (
                                <button
                                    key={idx}
                                    className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                                    onClick={() => handleSlotSelect(slot)}
                                >
                                    {slot.start_time}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-fade-in">
                        <h2 className="subtitle">4. Confirmar Turno</h2>
                        <button className="btn btn-secondary" onClick={() => setStep(3)}>Volver</button>

                        <div className="card" style={{ marginTop: '1rem', maxWidth: '500px' }}>
                            <p><strong>Servicio:</strong> {selectedService?.name}</p>
                            <p><strong>Fecha:</strong> {format(selectedDate, 'dd/MM/yyyy')}</p>
                            <p><strong>Hora:</strong> {selectedSlot?.start_time}</p>

                            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label className="label">Teléfono</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        onBlur={handlePhoneBlur}
                                        placeholder="Ingresá tu celular"
                                        required
                                    />
                                    {existingClientMsg && (
                                        <p style={{ color: 'var(--primary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>{existingClientMsg}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="label">Nombre</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Nota (Opcional)</label>
                                    <textarea
                                        className="input"
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Confirmando...' : 'Confirmar Reserva'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
