const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getGasolinePerformanceStatus = ({ record, parameters }) => {
  const target = toNumber(parameters?.rendimiento_objetivo_km_l);
  const cautionMinor = toNumber(parameters?.porcentaje_precaucion_menor);
  const cautionMajor = toNumber(parameters?.porcentaje_precaucion_mayor);
  const liters = toNumber(record?.litros);
  const kilometers = toNumber(record?.kilometros_recorridos);

  if (!target || cautionMinor === null || cautionMajor === null || !liters || liters <= 0 || kilometers === null || kilometers < 0) {
    return {
      key: 'neutral',
      label: 'Sin evaluar',
      className: 'gasoline-performance-neutral',
      detail: 'Faltan parametros o datos suficientes'
    };
  }

  const efficiency = kilometers / liters;
  const deviationPercentage = Math.abs(((efficiency - target) / target) * 100);

  if (deviationPercentage <= cautionMinor) {
    return {
      key: 'green',
      label: 'Rendimiento correcto',
      className: 'gasoline-performance-green',
      detail: `${efficiency.toLocaleString('es-MX', { maximumFractionDigits: 2 })} km/L vs meta ${target.toLocaleString('es-MX', { maximumFractionDigits: 2 })} km/L`
    };
  }

  if (deviationPercentage <= cautionMajor) {
    return {
      key: 'yellow',
      label: 'Precaucion menor',
      className: 'gasoline-performance-yellow',
      detail: `${efficiency.toLocaleString('es-MX', { maximumFractionDigits: 2 })} km/L con desviacion de ${deviationPercentage.toLocaleString('es-MX', { maximumFractionDigits: 2 })}%`
    };
  }

  return {
    key: 'red',
    label: 'Precaucion mayor',
    className: 'gasoline-performance-red',
    detail: `${efficiency.toLocaleString('es-MX', { maximumFractionDigits: 2 })} km/L con desviacion critica de ${deviationPercentage.toLocaleString('es-MX', { maximumFractionDigits: 2 })}%`
  };
};
