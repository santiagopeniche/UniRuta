// Pruebas de integración de solicitudes de cupo: RF-05, RF-06 y el riesgo de sobreventa (9.10).
const { api, pool, limpiarBase, crearUsuario, crearViaje } = require('./helpers');

beforeEach(limpiarBase);
afterAll(() => pool.end());

const cupos = async (viajeId) =>
  (await pool.query('SELECT cupos_disponibles FROM viaje WHERE id = $1', [viajeId])).rows[0].cupos_disponibles;
const avisosDe = async (usuarioId) =>
  (await pool.query('SELECT tipo FROM aviso WHERE usuario_id = $1 ORDER BY id', [usuarioId])).rows.map((r) => r.tipo);

describe('Pedir cupo (RF-05)', () => {
  test('la solicitud queda pendiente y el conductor recibe el aviso', async () => {
    const c = await crearUsuario({ rol: 'conductor' });
    const p = await crearUsuario();
    const viaje = await crearViaje(c.usuario.id);

    const res = await api().post(`/api/viajes/${viaje}/solicitudes`).set(p.auth).send({ mensaje: 'Voy con morral' });
    expect(res.status).toBe(201);
    expect(res.body.solicitud.estado).toBe('pendiente');
    expect(await avisosDe(c.usuario.id)).toEqual(['solicitud_nueva']);
    expect(await cupos(viaje)).toBe(3); // pedir no descuenta el cupo
  });

  test('no se puede pedir dos veces, ni en el propio viaje, ni en uno sin cupos', async () => {
    const c = await crearUsuario({ rol: 'conductor' });
    const p = await crearUsuario();
    const viaje = await crearViaje(c.usuario.id);

    await api().post(`/api/viajes/${viaje}/solicitudes`).set(p.auth);
    expect((await api().post(`/api/viajes/${viaje}/solicitudes`).set(p.auth)).status).toBe(409);
    expect((await api().post(`/api/viajes/${viaje}/solicitudes`).set(c.auth)).status).toBe(400);

    const lleno = await crearViaje(c.usuario.id, { horas: 30 });
    await pool.query('UPDATE viaje SET cupos_disponibles = 0 WHERE id = $1', [lleno]);
    expect((await api().post(`/api/viajes/${lleno}/solicitudes`).set(p.auth)).status).toBe(409);
  });
});

describe('Responder solicitudes (RF-06)', () => {
  let c;
  let p;
  let viaje;
  let solicitudId;
  beforeEach(async () => {
    c = await crearUsuario({ rol: 'conductor' });
    p = await crearUsuario();
    viaje = await crearViaje(c.usuario.id);
    solicitudId = (await api().post(`/api/viajes/${viaje}/solicitudes`).set(p.auth)).body.solicitud.id;
  });

  test('al aceptar, el viaje pierde un cupo y el pasajero recibe el aviso', async () => {
    const res = await api().post(`/api/solicitudes/${solicitudId}/aceptar`).set(c.auth);
    expect(res.status).toBe(200);
    expect(res.body.solicitud.estado).toBe('aceptada');
    expect(await cupos(viaje)).toBe(2);
    expect(await avisosDe(p.usuario.id)).toEqual(['solicitud_aceptada']);
  });

  test('al rechazar, el cupo no cambia y también se avisa al pasajero', async () => {
    const res = await api().post(`/api/solicitudes/${solicitudId}/rechazar`).set(c.auth);
    expect(res.status).toBe(200);
    expect(await cupos(viaje)).toBe(3);
    expect(await avisosDe(p.usuario.id)).toEqual(['solicitud_rechazada']);
  });

  test('solo el conductor del viaje puede responder', async () => {
    const otro = await crearUsuario({ rol: 'conductor' });
    expect((await api().post(`/api/solicitudes/${solicitudId}/aceptar`).set(otro.auth)).status).toBe(403);
    expect((await api().post(`/api/solicitudes/${solicitudId}/aceptar`).set(p.auth)).status).toBe(403);
  });

  test('una solicitud ya respondida no se puede responder otra vez', async () => {
    await api().post(`/api/solicitudes/${solicitudId}/aceptar`).set(c.auth);
    expect((await api().post(`/api/solicitudes/${solicitudId}/aceptar`).set(c.auth)).status).toBe(409);
    expect(await cupos(viaje)).toBe(2);
  });

  test('si el pasajero cancela un cupo aceptado, el cupo vuelve al viaje', async () => {
    await api().post(`/api/solicitudes/${solicitudId}/aceptar`).set(c.auth);
    const res = await api().post(`/api/solicitudes/${solicitudId}/cancelar`).set(p.auth);
    expect(res.status).toBe(200);
    expect(await cupos(viaje)).toBe(3);
    expect(await avisosDe(c.usuario.id)).toEqual(['solicitud_nueva', 'solicitud_cancelada']);
  });
});

describe('Último cupo (riesgo de sobreventa, sección 9.10)', () => {
  test('dos aceptaciones simultáneas por el último cupo: solo una gana', async () => {
    const c = await crearUsuario({ rol: 'conductor' });
    const viaje = await crearViaje(c.usuario.id, { cupos: 1 });
    const p1 = await crearUsuario();
    const p2 = await crearUsuario();
    const s1 = (await api().post(`/api/viajes/${viaje}/solicitudes`).set(p1.auth)).body.solicitud.id;
    const s2 = (await api().post(`/api/viajes/${viaje}/solicitudes`).set(p2.auth)).body.solicitud.id;

    const [r1, r2] = await Promise.all([
      api().post(`/api/solicitudes/${s1}/aceptar`).set(c.auth),
      api().post(`/api/solicitudes/${s2}/aceptar`).set(c.auth),
    ]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(await cupos(viaje)).toBe(0);
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM solicitud WHERE viaje_id = $1 AND estado = 'aceptada'`, [viaje]);
    expect(rows[0].n).toBe(1);
  });

  test('cuando el viaje se llena, las demás solicitudes pendientes se rechazan con aviso', async () => {
    const c = await crearUsuario({ rol: 'conductor' });
    const viaje = await crearViaje(c.usuario.id, { cupos: 1 });
    const p1 = await crearUsuario();
    const p2 = await crearUsuario();
    const s1 = (await api().post(`/api/viajes/${viaje}/solicitudes`).set(p1.auth)).body.solicitud.id;
    await api().post(`/api/viajes/${viaje}/solicitudes`).set(p2.auth);

    await api().post(`/api/solicitudes/${s1}/aceptar`).set(c.auth);
    expect(await avisosDe(p2.usuario.id)).toEqual(['viaje_lleno']);
    const { rows } = await pool.query('SELECT estado FROM solicitud WHERE pasajero_id = $1', [p2.usuario.id]);
    expect(rows[0].estado).toBe('rechazada');
  });
});
