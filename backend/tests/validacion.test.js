// Pruebas unitarias: funciones puras, no necesitan base de datos.
const v = require('../src/utils/validacion');
const { validarDatosViaje } = require('../src/modules/viajes/viajes.service');

describe('Correo institucional (RF-01, RNF-01)', () => {
  test.each(['estudiante@utb.edu.co', 'Estudiante@UTB.EDU.CO', '  ana.perez@utb.edu.co '])('acepta %s', (correo) => {
    expect(v.esCorreoInstitucional(correo, 'utb.edu.co')).toBe(true);
  });

  test.each([
    'estudiante@gmail.com',
    'estudiante@utb.edu.co.falso.com',
    'estudiante@falsoutb.edu.co',
    'utb.edu.co',
    '@utb.edu.co',
    '',
    undefined,
  ])('rechaza %s', (correo) => {
    expect(v.esCorreoInstitucional(correo, 'utb.edu.co')).toBe(false);
  });
});

describe('Placas', () => {
  test('acepta placas de carro y moto y las normaliza', () => {
    expect(v.esPlacaValida('abc123')).toBe(true);
    expect(v.esPlacaValida('ABC-123')).toBe(true);
    expect(v.esPlacaValida('ABC12D')).toBe(true);
    expect(v.normalizarPlaca(' abc-123 ')).toBe('ABC123');
  });
  test('rechaza placas mal formadas', () => {
    expect(v.esPlacaValida('12ABC3')).toBe(false);
    expect(v.esPlacaValida('AB123')).toBe(false);
  });
});

describe('Fechas en hora de Colombia', () => {
  test('convierte fecha y hora local a UTC (UTC-5)', () => {
    expect(v.fechaHoraColombia('2026-11-02', '06:30').toISOString()).toBe('2026-11-02T11:30:00.000Z');
  });
  test('rechaza formatos inválidos', () => {
    expect(() => v.fechaHoraColombia('02/11/2026', '06:30')).toThrow('AAAA-MM-DD');
    expect(() => v.fechaHoraColombia('2026-11-02', '25:00')).toThrow('HH:MM');
  });
});

describe('Búsqueda sin tildes', () => {
  test('normaliza mayúsculas, tildes y espacios', () => {
    expect(v.normalizarBusqueda('  Campus  TECNOLÓGICO ')).toBe('campus tecnologico');
  });
});

describe('Validación del formulario de viaje (RF-03)', () => {
  const ahora = new Date('2026-11-01T12:00:00Z');
  const base = { origen: 'Turbaco', destino: 'UTB Campus', puntoEncuentro: 'Parque principal', fecha: '2026-11-02', hora: '06:30', cupos: 3 };

  test('acepta un viaje válido', () => {
    const d = validarDatosViaje(base, ahora);
    expect(d.cupos).toBe(3);
    expect(d.fechaHora.toISOString()).toBe('2026-11-02T11:30:00.000Z');
  });
  test('rechaza viajes en el pasado', () => {
    expect(() => validarDatosViaje({ ...base, fecha: '2026-10-30' }, ahora)).toThrow('futuras');
  });
  test('rechaza cupos fuera de 1 a 6', () => {
    expect(() => validarDatosViaje({ ...base, cupos: 0 }, ahora)).toThrow('cupos');
    expect(() => validarDatosViaje({ ...base, cupos: 7 }, ahora)).toThrow('cupos');
  });
  test('rechaza origen igual al destino', () => {
    expect(() => validarDatosViaje({ ...base, destino: 'turbacó' }, ahora)).toThrow('iguales');
  });
  test('exige punto de encuentro', () => {
    expect(() => validarDatosViaje({ ...base, puntoEncuentro: '  ' }, ahora)).toThrow('punto de encuentro');
  });
});
