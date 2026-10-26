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

describe('Choques de horario del pasajero', () => {
  const pedir = (viaje, p) => api().post(`/api/viajes/${viaje}/solicitudes`).set(p.auth);
  const estadoDe = async (solicitudId) =>
    (await pool.query('SELECT estado FROM solicitud WHERE id = $1', [solicitudId])).rows[0].estado;

  test('con un cupo confirmado, no puede pedir otro viaje a menos de 1 hora; a 3 horas sí', async () => {
    const c1 = await crearUsuario({ rol: 'conductor' });
    const c2 = await crearUsuario({ rol: 'conductor' });
    const p = await crearUsuario();
    const v1 = await crearViaje(c1.usuario.id, { horas: 10 });
    const cercano = await crearViaje(c2.usuario.id, { horas: 10.5 });
    const lejano = await crearViaje(c2.usuario.id, { horas: 13 });

    const s1 = (await pedir(v1, p)).body.solicitud.id;
    await api().post(`/api/solicitudes/${s1}/aceptar`).set(c1.auth);

    const res = await pedir(cercano, p);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Ya tienes un cupo confirmado/);
    expect((await pedir(lejano, p)).status).toBe(201);
  });

  test('puede pedir en varios viajes a la misma hora; al aceptarlo en uno, los demás se cancelan con aviso', async () => {
    const c1 = await crearUsuario({ rol: 'conductor' });
    const c2 = await crearUsuario({ rol: 'conductor' });
    const c3 = await crearUsuario({ rol: 'conductor' });
    const p = await crearUsuario();
    const vA = await crearViaje(c1.usuario.id, { horas: 10 });
    const vB = await crearViaje(c2.usuario.id, { horas: 10.25 });
    const vOtroDia = await crearViaje(c3.usuario.id, { horas: 30 });

    const sA = (await pedir(vA, p)).body.solicitud.id;
    const sB = (await pedir(vB, p)).body.solicitud.id;
    const sOtroDia = (await pedir(vOtroDia, p)).body.solicitud.id;

    const res = await api().post(`/api/solicitudes/${sA}/aceptar`).set(c1.auth);
    expect(res.status).toBe(200);
    expect(res.body.solicitud.otrasCanceladas).toBe(1);

    expect(await estadoDe(sB)).toBe('cancelada');
    expect(await estadoDe(sOtroDia)).toBe('pendiente'); // otro día no choca
    expect(await avisosDe(c2.usuario.id)).toEqual(['solicitud_nueva', 'solicitud_cancelada']);

    // el segundo conductor ya no lo puede aceptar, y se le dice el motivo real
    const tarde = await api().post(`/api/solicitudes/${sB}/aceptar`).set(c2.auth);
    expect(tarde.status).toBe(409);
    expect(tarde.body.error).toMatch(/ya tiene un cupo confirmado en otro viaje/);
    expect(await cupos(vB)).toBe(3);
  });

  test('dos conductores aceptan al mismo pasajero al mismo tiempo: solo uno lo logra', async () => {
    const c1 = await crearUsuario({ rol: 'conductor' });
    const c2 = await crearUsuario({ rol: 'conductor' });
    const p = await crearUsuario();
    const vA = await crearViaje(c1.usuario.id, { horas: 10 });
    const vB = await crearViaje(c2.usuario.id, { horas: 10.5 });
    const sA = (await pedir(vA, p)).body.solicitud.id;
    const sB = (await pedir(vB, p)).body.solicitud.id;

    const [rA, rB] = await Promise.all([
      api().post(`/api/solicitudes/${sA}/aceptar`).set(c1.auth),
      api().post(`/api/solicitudes/${sB}/aceptar`).set(c2.auth),
    ]);

    expect([rA.status, rB.status].sort()).toEqual([200, 409]);
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM solicitud WHERE pasajero_id = $1 AND estado = 'aceptada'`, [
      p.usuario.id,
    ]);
    expect(rows[0].n).toBe(1);
    // solo el viaje que ganó perdió un cupo
    expect((await cupos(vA)) + (await cupos(vB))).toBe(5);
  });

  test('si cancela su cupo confirmado, ya puede pedir otro viaje a esa hora', async () => {
    const c1 = await crearUsuario({ rol: 'conductor' });
    const c2 = await crearUsuario({ rol: 'conductor' });
    const p = await crearUsuario();
    const vA = await crearViaje(c1.usuario.id, { horas: 10 });
    const vB = await crearViaje(c2.usuario.id, { horas: 10.5 });
    const sA = (await pedir(vA, p)).body.solicitud.id;
    await api().post(`/api/solicitudes/${sA}/aceptar`).set(c1.auth);
    expect((await pedir(vB, p)).status).toBe(409);

    await api().post(`/api/solicitudes/${sA}/cancelar`).set(p.auth);
    expect((await pedir(vB, p)).status).toBe(201);
  });

  test('quien conduce a esa hora no puede pedir cupo, y quien tiene cupo no puede publicar a esa hora', async () => {
    const c1 = await crearUsuario({ rol: 'conductor' });
    const c2 = await crearUsuario({ rol: 'conductor' });
    const vPropio = await crearViaje(c1.usuario.id, { horas: 10 });
    const vAjeno = await crearViaje(c2.usuario.id, { horas: 10.5 });

    const res = await pedir(vAjeno, c1);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/viaje publicado como conductor/);

    // c2 tiene cupo en el viaje de c1 y luego intenta publicar a la misma hora
    const c3 = await crearUsuario({ rol: 'conductor' });
    const sC3 = (await pedir(vPropio, c3)).body.solicitud.id;
    await api().post(`/api/solicitudes/${sC3}/aceptar`).set(c1.auth);
    const d = new Date(Date.now() + 10.25 * 3600 * 1000 - 5 * 3600 * 1000).toISOString();
    const pub = await api()
      .post('/api/viajes')
      .set(c3.auth)
      .send({ origen: 'Crespo', destino: 'UTB Campus', puntoEncuentro: 'Estación', fecha: d.slice(0, 10), hora: d.slice(11, 16), cupos: 2 });
    expect(pub.status).toBe(409);
    expect(pub.body.error).toMatch(/cupo confirmado como pasajero/);
  });
});
