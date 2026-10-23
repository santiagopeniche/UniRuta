// RNF-03: la búsqueda debe responder en menos de 2 segundos con 200 viajes registrados.
const { api, pool, limpiarBase, crearUsuario } = require('./helpers');

beforeAll(async () => {
  await limpiarBase();
  const conductores = await Promise.all([1, 2, 3].map(() => crearUsuario({ rol: 'conductor' })));
  const barrios = ['Turbaco', 'Crespo', 'Manga', 'Bocagrande', 'El Bosque'];
  for (let i = 0; i < 200; i += 1) {
    await pool.query(
      `INSERT INTO viaje (conductor_id, origen, destino, punto_encuentro, fecha_hora, cupos_totales, cupos_disponibles)
       VALUES ($1, $2, 'UTB Campus Tecnológico', 'Punto', NOW() + make_interval(hours => $3), 3, 3)`,
      [conductores[i % 3].usuario.id, barrios[i % barrios.length], 1 + (i % 300)]
    );
  }
});
afterAll(() => pool.end());

test('RNF-03: buscar entre 200 viajes toma menos de 2 segundos', async () => {
  const pasajero = await crearUsuario();
  const inicio = Date.now();
  const res = await api().get('/api/viajes').query({ origen: 'turbaco', destino: 'campus' }).set(pasajero.auth);
  const ms = Date.now() - inicio;

  expect(res.status).toBe(200);
  expect(res.body.viajes.length).toBe(40); // 200 viajes / 5 barrios
  expect(ms).toBeLessThan(2000);
  console.log(`Búsqueda con 200 viajes registrados: ${ms} ms`);
});
