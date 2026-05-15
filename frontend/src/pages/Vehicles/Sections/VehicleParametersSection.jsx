import { useEffect, useMemo, useState } from 'react';
import './VehicleParametersSection.css';

const buildEmptyForm = () => ({
  capacidad_tanque_litros: '',
  rendimiento_objetivo_km_l: '',
  porcentaje_precaucion_menor: '',
  porcentaje_precaucion_mayor: '',
  tiempo_cambio_aceite_meses: '',
  aviso_previo_tiempo_aceite_meses: '',
  distancia_cambio_aceite_km: '',
  aviso_previo_cambio_aceite_km: ''
});

const buildFormFromParameters = (parameters) => ({
  capacidad_tanque_litros: parameters?.capacidad_tanque_litros ?? '',
  rendimiento_objetivo_km_l: parameters?.rendimiento_objetivo_km_l ?? '',
  porcentaje_precaucion_menor: parameters?.porcentaje_precaucion_menor ?? '',
  porcentaje_precaucion_mayor: parameters?.porcentaje_precaucion_mayor ?? '',
  tiempo_cambio_aceite_meses: parameters?.tiempo_cambio_aceite_meses ?? '',
  aviso_previo_tiempo_aceite_meses: parameters?.aviso_previo_tiempo_aceite_meses ?? '',
  distancia_cambio_aceite_km: parameters?.distancia_cambio_aceite_km ?? '',
  aviso_previo_cambio_aceite_km: parameters?.aviso_previo_cambio_aceite_km ?? ''
});

const FIELD_GROUPS = [
  {
    title: 'Gasolina y rendimiento',
    description: 'Estos datos se usaran mas adelante para validar cargas y clasificar el rendimiento real contra el esperado.',
    fields: [
      {
        key: 'capacidad_tanque_litros',
        label: 'Capacidad del tanque',
        type: 'number',
        min: '0.01',
        step: '0.01',
        suffix: 'L'
      },
      {
        key: 'rendimiento_objetivo_km_l',
        label: 'Rendimiento esperado',
        type: 'number',
        min: '0.01',
        step: '0.01',
        suffix: 'km/L'
      },
      {
        key: 'porcentaje_precaucion_menor',
        label: 'Precaucion menor',
        type: 'number',
        min: '0',
        max: '100',
        step: '0.01',
        suffix: '%'
      },
      {
        key: 'porcentaje_precaucion_mayor',
        label: 'Precaucion mayor',
        type: 'number',
        min: '0',
        max: '100',
        step: '0.01',
        suffix: '%'
      }
    ]
  },
  {
    title: 'Cambio de aceite',
    description: 'Configura el intervalo normal del servicio y cuanto antes debe comenzar la advertencia por tiempo o kilometraje.',
    fields: [
      {
        key: 'tiempo_cambio_aceite_meses',
        label: 'Cambio de aceite cada',
        type: 'number',
        min: '1',
        step: '1',
        suffix: 'meses'
      },
      {
        key: 'aviso_previo_tiempo_aceite_meses',
        label: 'Avisar por tiempo antes de',
        type: 'number',
        min: '0',
        step: '1',
        suffix: 'meses'
      },
      {
        key: 'distancia_cambio_aceite_km',
        label: 'Cambio de aceite cada',
        type: 'number',
        min: '1',
        step: '1',
        suffix: 'km'
      },
      {
        key: 'aviso_previo_cambio_aceite_km',
        label: 'Avisar por kilometraje antes de',
        type: 'number',
        min: '0',
        step: '1',
        suffix: 'km'
      }
    ]
  }
];

export default function VehicleParametersSection({
  vehicle,
  parameters = null,
  onSave,
  onBack
}) {
  const [formData, setFormData] = useState(buildEmptyForm());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setFormData(buildFormFromParameters(parameters));
    setErrorMessage('');
    setSuccessMessage('');
  }, [parameters]);

  const configuredCount = useMemo(() => (
    Object.values(formData).filter((value) => value !== '' && value !== null && value !== undefined).length
  ), [formData]);

  const handleChange = (field, value) => {
    setErrorMessage('');
    setSuccessMessage('');
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
  };

  const validate = () => {
    const requiredFields = Object.entries(formData).filter(([, value]) => value === '' || value === null || value === undefined);
    if (requiredFields.length > 0) {
      return 'Completa todos los parametros antes de guardar.';
    }

    const precautionMinor = Number(formData.porcentaje_precaucion_menor);
    const precautionMajor = Number(formData.porcentaje_precaucion_mayor);
    const oilMonths = Number(formData.tiempo_cambio_aceite_meses);
    const oilMonthsWarning = Number(formData.aviso_previo_tiempo_aceite_meses);
    const oilDistance = Number(formData.distancia_cambio_aceite_km);
    const oilDistanceWarning = Number(formData.aviso_previo_cambio_aceite_km);

    if (precautionMajor < precautionMinor) {
      return 'La precaucion mayor no puede ser menor que la precaucion menor.';
    }

    if (oilMonthsWarning > oilMonths) {
      return 'El aviso previo por tiempo no puede ser mayor al tiempo de cambio de aceite.';
    }

    if (oilDistanceWarning > oilDistance) {
      return 'El aviso previo por kilometraje no puede ser mayor a la distancia de cambio de aceite.';
    }

    return '';
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    try {
      await onSave?.(formData);
      setSuccessMessage('Parametros operativos guardados correctamente.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudieron guardar los parametros.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='vehicle-parameters-page'>
      <div className='vehicle-parameters-header'>
        <div className='vehicle-parameters-header-left'>
          <button type='button' className='btn-back' onClick={onBack}>Volver</button>
          <div>
            <h2>Parametros del vehiculo</h2>
            <p>
              Configura limites operativos de gasolina y mantenimiento para {vehicle?.placa || 'la unidad'}.
            </p>
          </div>
        </div>

        <div className='vehicle-parameters-summary'>
          <span>Configurados</span>
          <strong>{configuredCount}/8</strong>
        </div>
      </div>

      <div className='vehicle-parameters-highlight'>
        <div>
          <span>Unidad</span>
          <strong>{vehicle?.placa || '-'}</strong>
        </div>
        <div>
          <span>Descripcion</span>
          <strong>{vehicle?.descripcion || vehicle?.propietario_nombre || 'Sin descripcion'}</strong>
        </div>
        <div>
          <span>Estado actual</span>
          <strong>{vehicle?.estado || 'activo'}</strong>
        </div>
      </div>

      <div className='vehicle-parameters-groups'>
        {FIELD_GROUPS.map((group) => (
          <section key={group.title} className='vehicle-parameters-card'>
            <div className='vehicle-parameters-card-head'>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
            </div>

            <div className='vehicle-parameters-grid'>
              {group.fields.map((field) => (
                <label key={field.key} className='vehicle-parameters-field'>
                  <span>{field.label}</span>
                  <div className='vehicle-parameters-input-wrap'>
                    <input
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={formData[field.key]}
                      onChange={(event) => handleChange(field.key, event.target.value)}
                    />
                    <small>{field.suffix}</small>
                  </div>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className='vehicle-parameters-notes'>
        <h3>Uso previsto</h3>
        <p>
          Esta configuracion dejara lista la base para limitar litros cargados, clasificar rendimiento real en verde/amarillo/rojo
          y disparar alertas preventivas de cambio de aceite por tiempo o kilometraje.
        </p>
      </div>

      {errorMessage ? <div className='vehicle-parameters-message error'>{errorMessage}</div> : null}
      {successMessage ? <div className='vehicle-parameters-message success'>{successMessage}</div> : null}

      <div className='vehicle-parameters-actions'>
        <button type='button' className='secondary-btn' onClick={onBack}>Cancelar</button>
        <button type='button' className='primary-btn' onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar parametros'}
        </button>
      </div>
    </div>
  );
}
