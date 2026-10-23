// Pruebas de integración de calificaciones (RF-07) y finalización de viajes.
const { api, pool, limpiarBase, crearUsuario, crearViaje } = require('./helpers');

beforeEach(limpiarBase);
afterAll(() => pool.end());

/** Viaje con un pasajero aceptado. `horas` negativo = el viaje ya salió. */
async function viajeConPasajero(horas) {
  const c = await crearUsuario({ rol: 'conductor' });
  const p = await crearUsuario();
  const viaje = await crearViaje(c.usuario.id, { horas });
  await pool.query(`INSERT INTO solicitud (viaje_id, pasajero_id, estado) VALUES ($1, $2, 'aceptada')`, [viaje, p.usuario.id]);
  return { c, p, viaje };
}

describe('Calificar al terminar el viaje (RF-07)', () => {
  test('no se puede calificar antes de que termine el viaje', async () => {
    const { c, p, viaje } = await viajeConPasajero(5);
    const res = await api().post(`/api/viajes/${viaje}/calificaciones`).set(p.auth).send({ calificadoId: c.usuario.id, puntaje: 5 });
    expect(res.status).toBe(409);
  });

  test('el conductor no puede finalizar un viaje que sale en varias horas', async () => {
    const { c, viaje } = await viajeConPasajero(5);
    expect((await api().post(`/api/viajes/${viaje}/finalizar`).set(c.auth)).status).toBe(409);
  });

  test('tras finalizar, pasajero y conductor se califican mutuamente una sola vez', async () => {
    const { c, p, viaje } = await viajeConPasajero(-0.5);
    const fin = await api().post(`/api/viajes/${viaje}/finalizar`).set(c.auth);
    expect(fin.status).toBe(200);
    expect(fin.body.viaje.estado).toBe('finalizado');

    const deP = await api()
      .post(`/api/viajes/${viaje}/calificaciones`)
      .set(p.auth)
      .send({ calificadoId: c.usuario.id, puntaje: 5, comentario: 'Muy puntual' });
    expect(deP.status).toBe(201);

    const deC = await api().post(`/api/viajes/${viaje}/calificaciones`).set(c.auth).send({ calificadoId: p.usuario.id, puntaje: 4 });
    expect(deC.status).toBe(201);

    const repetida = await api().post(`/api/viajes/${viaje}/calificaciones`).set(p.auth).send({ calificadoId: c.usuario.id, puntaje: 1 });
    expect(repetida.status).toBe(409);

    const perfil = await api().get(`/api/usuarios/${c.usuario.id}`).set(p.auth);
    expect(perfil.body.usuario.promedio).toBe(5);
    expect(perfil.body.usuario.totalCalificaciones).toBe(1);
  });

  test('el puntaje debe estar entre 1 y 5', async () => {
    const { c, p, viaje } = await viajeConPasajero(-3);
    for (const puntaje of [0, 6, 'cinco', 4.5]) {
      const res = await api().post(`/api/viajes/${viaje}/calificaciones`).set(p.auth).send({ calificadoId: c.usuario.id, puntaje });
      expect(res.status).toBe(400);
    }
  });

  test('solo califican los participantes, y solo a sus compañeros', async () => {
    const { c, p, viaje } = await viajeConPasajero(-3);
    const extraño = await crearUsuario();
    const otroPasajero = await crearUsuario();
    await pool.query(`INSERT INTO solicitud (viaje_id, pasajero_id, estado) VALUES ($1, $2, 'aceptada')`, [viaje, otroPasajero.usuario.id]);

    const deExtraño = await api().post(`/api/viajes/${viaje}/calificaciones`).set(extraño.auth).send({ calificadoId: c.usuario.id, puntaje: 1 });
    expect(deExtraño.status).toBe(403);

    // un pasajero califica al conductor, no a otro pasajero
    const entrePasajeros = await api()
      .post(`/api/viajes/${viaje}/calificaciones`)
      .set(p.auth)
      .send({ calificadoId: otroPasajero.usuario.id, puntaje: 5 });
    expect(entrePasajeros.status).toBe(400);
  });

  test('el historial muestra cuántos compañeros faltan por calificar', async () => {
    const { c, p, viaje } = await viajeConPasajero(-3);
    let h = await api().get('/api/viajes/historial').set(p.auth);
    expect(h.body.viajes[0]).toMatchObject({ id: viaje, miPapel: 'pasajero', porCalificar: 1 });

    await api().post(`/api/viajes/${viaje}/calificaciones`).set(p.auth).send({ calificadoId: c.usuario.id, puntaje: 5 });
    h = await api().get('/api/viajes/historial').set(p.auth);
    expect(h.body.viajes[0].porCalificar).toBe(0);
  });
});
