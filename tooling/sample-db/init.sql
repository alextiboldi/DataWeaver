CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  region VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  order_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO customers (name, email, region) VALUES
  ('Alice Johnson', 'alice@example.com', 'North America'),
  ('Bob Smith', 'bob@example.com', 'Europe'),
  ('Charlie Wang', 'charlie@example.com', 'Asia Pacific'),
  ('Diana Garcia', 'diana@example.com', 'North America'),
  ('Erik Larsson', 'erik@example.com', 'Europe'),
  ('Fatima Al-Rashid', 'fatima@example.com', 'Middle East'),
  ('Giovanni Rossi', 'giovanni@example.com', 'Europe'),
  ('Hana Kim', 'hana@example.com', 'Asia Pacific'),
  ('Ivan Petrov', 'ivan@example.com', 'Europe'),
  ('Julia Santos', 'julia@example.com', 'South America');

INSERT INTO products (name, category, price) VALUES
  ('Widget Pro', 'Hardware', 49.99),
  ('Data Dashboard', 'Software', 199.99),
  ('Cloud Storage 1TB', 'Services', 9.99),
  ('Analytics Suite', 'Software', 499.99),
  ('Sensor Kit', 'Hardware', 129.99),
  ('API Gateway', 'Services', 29.99),
  ('ML Pipeline', 'Software', 799.99),
  ('Edge Device', 'Hardware', 299.99),
  ('Support Plan', 'Services', 49.99),
  ('Training Bundle', 'Services', 149.99);

INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date)
SELECT
  (random() * 9 + 1)::int,
  (random() * 9 + 1)::int,
  (random() * 5 + 1)::int,
  (random() * 1000 + 50)::decimal(10,2),
  DATE '2025-01-01' + (random() * 400)::int
FROM generate_series(1, 500);
