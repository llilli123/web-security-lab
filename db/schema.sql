-- Datos completamente ficticios para demostraciones de seguridad.
CREATE TABLE IF NOT EXISTS demo_users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  display_name TEXT NOT NULL,
  badge TEXT NOT NULL
);
INSERT OR IGNORE INTO demo_users (id,username,pin,display_name,badge) VALUES
 (1,'admin','demo-8421','Admin DEMO','ACCESO-ROJO-001'),
 (2,'ana','demo-1000','Ana (ficticia)','ACCESO-AZUL-002'),
 (3,'luis','demo-2000','Luis (ficticio)','ACCESO-VERDE-003');

CREATE TABLE IF NOT EXISTS demo_invoices (
  id INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  item TEXT NOT NULL,
  total INTEGER NOT NULL
);
INSERT OR IGNORE INTO demo_invoices(id,owner,item,total) VALUES
 (101,'ana','Curso de diseño (DEMO)',1800),
 (202,'luis','Taller de programación (DEMO)',3200),
 (303,'ana','Libro de algoritmos (DEMO)',1200);

CREATE TABLE IF NOT EXISTS demo_limits (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  resets_at INTEGER NOT NULL
);
