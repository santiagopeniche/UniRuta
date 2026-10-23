// Pruebas de integración del módulo de usuarios: RF-01, RF-02 y RNF-01.
const { api, pool, limpiarBase, crearUsuario } = require('./helpers');
const { bandejaDePruebas } = require('../src/modules/correo/correo.service');

beforeEach(async () => {
  await limpiarBase();
  bandejaDePruebas.length = 0;
});
afterAll(() => pool.end());

const datos = { nombre: 'Ana Pérez', correo: 'aperez@utb.edu.co', contrasena: 'Segura2026', telefono: '3001112233' };

describe('Registro (RF-01)', () => {
  test('rechaza un correo que no es @utb.edu.co', async () => {
    const res = await api().post('/api/auth/registro').send({ ...datos, correo: 'aperez@gmail.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correo institucional/);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM usuario');
    expect(rows[0].n).toBe(0);
  });

  test('crea la cuenta con correo institucional y envía el correo de confirmación', async () => {
    const res = await api().post('/api/auth/registro').send(datos);
    expect(res.status).toBe(201);
    expect(res.body.requiereVerificacion).toBe(true);
    expect(bandejaDePruebas).toHaveLength(1);
    expect(bandejaDePruebas[0].para).toBe('aperez@utb.edu.co');
    expect(bandejaDePruebas[0].texto).toMatch(/\/verificar\?token=[a-f0-9]{64}/);
  });

  test('RNF-01: la contraseña se guarda cifrada, nunca en texto plano', async () => {
    await api().post('/api/auth/registro').send(datos);
    const { rows } = await pool.query('SELECT contrasena_hash FROM usuario WHERE correo = $1', [datos.correo]);
    expect(rows[0].contrasena_hash).not.toContain(datos.contrasena);
    expect(rows[0].contrasena_hash).toMatch(/^\$2[aby]\$/); // formato bcrypt
  });

  test('no permite registrar dos veces el mismo correo (sin importar mayúsculas)', async () => {
    await api().post('/api/auth/registro').send(datos);
    const res = await api().post('/api/auth/registro').send({ ...datos, correo: 'APerez@UTB.edu.co' });
    expect(res.status).toBe(409);
  });

  test('exige contraseña de al menos 8 caracteres', async () => {
    const res = await api().post('/api/auth/registro').send({ ...datos, contrasena: '1234' });
    expect(res.status).toBe(400);
  });
});

describe('Inicio de sesión (RF-02)', () => {
  test('no deja entrar hasta confirmar el correo; después del enlace sí', async () => {
    await api().post('/api/auth/registro').send(datos);

    const antes = await api().post('/api/auth/login').send({ correo: datos.correo, contrasena: datos.contrasena });
    expect(antes.status).toBe(403);

    const token = bandejaDePruebas[0].texto.match(/token=([a-f0-9]+)/)[1];
    const verif = await api().post('/api/auth/verificar').send({ token });
    expect(verif.status).toBe(200);

    const despues = await api().post('/api/auth/login').send({ correo: datos.correo, contrasena: datos.contrasena });
    expect(despues.status).toBe(200);
    expect(despues.body.token).toBeTruthy();
    expect(despues.body.usuario.correo).toBe(datos.correo);
    expect(despues.body.usuario).not.toHaveProperty('contrasena_hash');
  });

  test('el enlace de verificación solo sirve una vez', async () => {
    await api().post('/api/auth/registro').send(datos);
    const token = bandejaDePruebas[0].texto.match(/token=([a-f0-9]+)/)[1];
    await api().post('/api/auth/verificar').send({ token });
    const otraVez = await api().post('/api/auth/verificar').send({ token });
    expect(otraVez.status).toBe(400);
  });

  test('con contraseña incorrecta muestra un error genérico', async () => {
    const { usuario } = await crearUsuario();
    const res = await api().post('/api/auth/login').send({ correo: usuario.correo, contrasena: 'equivocada' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Correo o contraseña incorrectos');
  });

  test('con un correo que no existe muestra el mismo error genérico', async () => {
    const res = await api().post('/api/auth/login').send({ correo: 'nadie@utb.edu.co', contrasena: 'Clave12345' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Correo o contraseña incorrectos');
  });

  test('las rutas protegidas exigen sesión', async () => {
    const res = await api().get('/api/viajes');
    expect(res.status).toBe(401);
  });
});

describe('Perfil', () => {
  test('para pasar a conductor se exige una placa válida', async () => {
    const { auth } = await crearUsuario();
    const sinPlaca = await api().patch('/api/usuarios/me').set(auth).send({ rol: 'conductor' });
    expect(sinPlaca.status).toBe(400);

    const malaPlaca = await api().patch('/api/usuarios/me').set(auth).send({ rol: 'conductor', placa: '123' });
    expect(malaPlaca.status).toBe(400);

    const ok = await api().patch('/api/usuarios/me').set(auth).send({ rol: 'conductor', placa: 'xyz-987', vehiculo: 'Mazda 2' });
    expect(ok.status).toBe(200);
    expect(ok.body.usuario.rol).toBe('conductor');
    expect(ok.body.usuario.placa).toBe('XYZ987');
  });
});
