import { useState, useEffect } from 'react';
import api from '../api';
import { format } from 'date-fns';

export default function AdminClients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await api.get('/clients');
            setClients(res.data);
        } catch (err) {
            console.error("Error fetching clients", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-white">Cargando clientes...</div>;

    return (
        <div className="container animate-fade-in">
            <h1 className="title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Cartera de Clientes</h1>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#1a1a1a', borderBottom: '2px solid var(--primary)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--primary)', fontFamily: 'Staatliches' }}>ID</th>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--primary)', fontFamily: 'Staatliches' }}>Nombre</th>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--primary)', fontFamily: 'Staatliches' }}>Teléfono</th>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--primary)', fontFamily: 'Staatliches' }}>Email</th>
                            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--primary)', fontFamily: 'Staatliches' }}>Registrado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '1rem', color: '#fff' }}>#{client.id}</td>
                                <td style={{ padding: '1rem', color: '#fff', fontWeight: 'bold' }}>{client.name}</td>
                                <td style={{ padding: '1rem', color: '#aaa' }}>{client.phone}</td>
                                <td style={{ padding: '1rem', color: '#aaa' }}>{client.email || '-'}</td>
                                <td style={{ padding: '1rem', color: '#aaa' }}>
                                    {client.created_at ? format(new Date(client.created_at), 'dd/MM/yyyy') : '-'}
                                </td>
                            </tr>
                        ))}
                        {clients.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                    No hay clientes registrados aún.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
