// Pruebas de integración de publicación (RF-03) y búsqueda (RF-04).
const { api, pool, limpiarBase, crearUsuario, crearViaje, fechaHoraEn } = require('./helpers');

beforeEach(limpiarBase);
afterAll(() => pool.end());

const formulario = (extra = {}) => ({
  origen: 'Turbaco',
  destino: 'UTB Campus Tecnológico',
  puntoEncuentro: 'Parque principal de Turbaco',
  ...fechaHoraEn(24),
  cupos: 3,
  aporteSugerido: 5000,
  ...extra,
});

describe('Publicar viaje (RF-03)', () => {
  test('un pasajero sin vehículo no puede publicar', async () => {
    const { auth } = await crearUsuario({ rol: 'pasajero' });
    const res = await api().post('/api/viajes').set(auth).send(formulario());
    expect(res.status).toBe(403);
  });

  test('el viaje publicado aparece en la búsqueda con todos sus datos', async () => {
    const conductor = await crearUsuario({ rol: 'conductor', nombre: 'Laura' });
    const pasajero = await crearUsuario();
    const datos = formulario();

    const pub = await api().post('/api/viajes').set(conductor.auth).send(datos);
    expect(pub.status).toBe(201);

    const busqueda = await api().get('/api/viajes').set(pasajero.auth);
    expect(busqueda.body.viajes).toHaveLength(1);
    const v = busqueda.body.viajes[0];
    expect(v).toMatchObject({
      origen: datos.origen,
      destino: datos.destino,
      puntoEncuentro: datos.puntoEncuentro,
      fecha: datos.fecha,
      hora: datos.hora,
      cuposTotales: 3,
      cuposDisponibles: 3,
      aporteSugerido: 5000,
    });
    expect(v.conductor.nombre).toBe('Laura');
  });

  test('rechaza un viaje con fecha pasada', async () => {
    const { auth } = await crearUsuario({ rol: 'conductor' });
    const res = await api().post('/api/viajes').set(auth).send(formulario(fechaHoraEn(-1)));
    expect(res.status).toBe(400);
  });

  test('no deja publicar dos viajes a la misma hora', async () => {
    const { auth } = await crearUsuario({ rol: 'conductor' });
    await api().post('/api/viajes').set(auth).send(formulario());
    const res = await api().post('/api/viajes').set(auth).send(formulario());
    expect(res.status).toBe(409);
  });
});

describe('Buscar viajes (RF-04)', () => {
  let pasajero;
  let conductor;
  beforeEach(async () => {
    conductor = await crearUsuario({ rol: 'conductor' });
    pasajero = await crearUsuario();
  });

  test('filtra por ruta sin importar tildes ni mayúsculas', async () => {
    await crearViaje(conductor.usuario.id, { origen: 'Turbaco' });
    await crearViaje(conductor.usuario.id, { origen: 'Crespo', horas: 30 });
    const res = await api().get('/api/viajes').query({ origen: 'TURBACÓ', destino: 'tecnologico' }).set(pasajero.auth);
    expect(res.body.viajes.map((v) => v.origen)).toEqual(['Turbaco']);
  });

  test('filtra por fecha y franja horaria', async () => {
    const dentro = fechaHoraEn(26);
    await api().post('/api/viajes').set(conductor.auth).send(formulario(dentro));
    const res = await api()
      .get('/api/viajes')
      .query({ fecha: dentro.fecha, horaDesde: dentro.hora, horaHasta: dentro.hora })
      .set(pasajero.auth);
    expect(res.body.viajes).toHaveLength(1);

    // misma ruta, una hora que no coincide
    const [h] = dentro.hora.split(':').map(Number);
    const otra = `${String((h + 2) % 24).padStart(2, '0')}:00`;
    const nada = await api().get('/api/viajes').query({ fecha: dentro.fecha, horaDesde: otra, horaHasta: otra }).set(pasajero.auth);
    expect(nada.body.viajes).toHaveLength(0);
  });

  test('no muestra viajes sin cupos, pasados, cancelados ni los del propio usuario', async () => {
    const lleno = await crearViaje(conductor.usuario.id, { horas: 10 });
    await pool.query('UPDATE viaje SET cupos_disponibles = 0 WHERE id = $1', [lleno]);
    await crearViaje(conductor.usuario.id, { horas: -2 });
    await crearViaje(conductor.usuario.id, { horas: 20, estado: 'cancelado' });
    const visible = await crearViaje(conductor.usuario.id, { horas: 30 });

    const res = await api().get('/api/viajes').set(pasajero.auth);
    expect(res.body.viajes.map((v) => v.id)).toEqual([visible]);

    const propio = await api().get('/api/viajes').set(conductor.auth);
    expect(propio.body.viajes).toHaveLength(0);
  });

  test('responde 400 con una fecha mal escrita', async () => {
    const res = await api().get('/api/viajes').query({ fecha: '24/10/2026' }).set(pasajero.auth);
    expect(res.status).toBe(400);
  });

  test('el teléfono del conductor solo se ve con el cupo aceptado', async () => {
    const id = await crearViaje(conductor.usuario.id);
    const res = await api().get(`/api/viajes/${id}`).set(pasajero.auth);
    expect(res.body.viaje.conductor).not.toHaveProperty('telefono');
    expect(res.body.viaje.conductor).not.toHaveProperty('placa');
  });
});
