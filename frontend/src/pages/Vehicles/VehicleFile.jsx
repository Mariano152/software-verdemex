import { useParams, Link } from 'react-router-dom';
import { mockVehicles } from '../../data/mockData';
import './VehicleFile.css';

export default function VehicleFile() {
  const { id } = useParams();
  const vehicle = mockVehicles.find(v => v.id === parseInt(id));

  const documents = [
    { id: 1, name: 'Título de Propiedad', type: 'PDF', date: '2023-01-15', size: '2.4 MB' },
    { id: 2, name: 'Póliza de Seguro', type: 'PDF', date: '2024-03-01', size: '1.8 MB' },
    { id: 3, name: 'Verificación Técnica', type: 'PDF', date: '2024-02-20', size: '3.2 MB' },
    { id: 4, name: 'Fotografías', type: 'ZIP', date: '2024-01-10', size: '15.6 MB' },
    { id: 5, name: 'Historial de Mantenimiento', type: 'XLSX', date: '2024-03-05', size: '0.5 MB' },
  ];

  return (
    <div className="vehicle-file">
      <div className="page-header">
        <Link to={`/vehicles/${id}`} className="btn btn-outline">← Volver</Link>
        <div>
          <h1>Expediente - {vehicle?.plate}</h1>
          <p className="subtitle">Documentos y archivos del vehículo</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Documentos</div>
        <div className="card-body">
          <div className="documents-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-item">
                <div className="document-icon">📄</div>
                <div className="document-info">
                  <p className="document-name">{doc.name}</p>
                  <p className="document-meta">{doc.type} • {doc.size} • {doc.date}</p>
                </div>
                <div className="document-actions">
                  <button className="btn btn-sm btn-outline">Descargar</button>
                  <button className="btn btn-sm btn-outline">Ver</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Subir Documento</div>
        <div className="card-body">
          <div className="upload-area">
            <p>📁 Arrastra archivos aquí o</p>
            <button className="btn btn-secondary">Seleccionar Archivo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
