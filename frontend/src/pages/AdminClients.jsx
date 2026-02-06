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

            <div className="card" style={{ padding: '0' }}>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Teléfono</th>
                                <th>Email</th>
                                <th>Registrado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.id}>
                                    <td>#{client.id}</td>
                                    <td style={{ fontWeight: 'bold' }}>{client.name}</td>
                                    <td className="text-muted">{client.phone}</td>
                                    <td className="text-muted">{client.email || '-'}</td>
                                    <td className="text-muted">
                                        {client.created_at ? format(new Date(client.created_at), 'dd/MM/yyyy') : '-'}
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr className="empty-row">
                                    <td colSpan="5">
                                        No hay clientes registrados aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
