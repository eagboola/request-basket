CREATE TABLE baskets (
  id SERIAL PRIMARY KEY,
  basket_endpoint varchar(25) NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE
);
