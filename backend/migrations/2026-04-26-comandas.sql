-- Crear tabla de comandas
CREATE TABLE IF NOT EXISTS comandas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente', 'listo') NOT NULL DEFAULT 'pendiente',
  detalle_comanda TEXT NULL,
  fecha_completado DATETIME NULL,
  UNIQUE KEY uq_comanda_venta (venta_id),
  INDEX idx_comanda_estado_fecha (estado, fecha_hora),
  CONSTRAINT fk_comanda_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
);

-- Crear tabla de items de comanda
CREATE TABLE IF NOT EXISTS comanda_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comanda_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  nota_item VARCHAR(255) NULL,
  INDEX idx_comanda_items_comanda (comanda_id),
  CONSTRAINT fk_comanda_items_comanda FOREIGN KEY (comanda_id) REFERENCES comandas(id),
  CONSTRAINT fk_comanda_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
);
