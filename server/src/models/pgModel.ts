import { generateToken } from "../services/token";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
// import { pool } from "./dbConnection"

const pgURI = process.env.PG_URI;
if (!pgURI) throw new Error('PG_URI not set in .env');

const pool = new Pool({
    connectionString: pgURI,
});

export const pgModel = {
  async addNewBasket(endpoint: string) {
    const token = generateToken(endpoint);
    const command = 'INSERT INTO baskets (endpoint, token) VALUES ($1, $2)';

    try {
      await pool.query(command, [endpoint, token]);
      return token;
    } catch (e) {
      console.error(e);
      throw new Error('Failed to create a new basket.');
    }
  },
  
  async getBasketToken(endpoint: string) {
    const command = 'SELECT token FROM baskets WHERE endpoint = $1;';

    try {
      const res = await pool.query(command, [endpoint]);
      return res.rows.length > 0 ? res.rows[0].token : null;
    } catch (e) {
      console.error(e);
      throw new Error('Query failed to retrieve a token for given endpoint.');
    }
  },

  async basketExists(endpoint: string) {
    try {
     const token = await this.getBasketToken(endpoint);
     console.log(token);
     return token !== null;
    } catch (e) { 
      console.error(e);
    }
  },
};
