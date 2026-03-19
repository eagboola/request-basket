import { generateToken } from "../services/token";
import { pgPool } from "../connections/pgConnection";

export const pgModel = {
  async addNewBasket(endpoint: string) {
    const token = generateToken(endpoint);
    const command = 'INSERT INTO baskets (endpoint, token) VALUES ($1, $2)';

    try {
      await pgPool().query(command, [endpoint, token]);
      return token;
    } catch (e) {
      console.error(e);
      throw new Error('Failed to create a new basket.');
    }
  },
  
  async getBasketToken(endpoint: string) {
    const command = 'SELECT token FROM baskets WHERE endpoint = $1;';

    try {
      const res = await pgPool().query(command, [endpoint]);
      return res.rows.length > 0 ? res.rows[0].token : null;
    } catch (e) {
      console.error(e);
      throw new Error('Query failed to retrieve a token for given endpoint.');
    }
  },

  async basketExists(endpoint: string) {
    try {
     const token = await this.getBasketToken(endpoint);
     return token !== null;
    } catch (e) { 
      console.error(e);
      throw new Error("PG query failed to check if basket exists.");
    }
  },
};
