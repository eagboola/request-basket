import type { Request, Response } from "express";
// import { WebSocket } from "ws";
import { mongoModel } from "../models/mongoModel";
import { pgModel } from "../models/pgModel";
import type { RequestData } from "../types/requests";
import clients from "../services/sseClients";

export const basketController = {
  // handleGetBaskets(req: Request, res: Response) {
  //   // Serve React app.
  //   res.send("Hello world");
  // },

  // handleRedirectToBaskets(req: Request, res: Response) {
  //   res.redirect("/baskets");
  // },

  // handleWebSocketConnection(ws: WebSocket, req: Request<{ endpoint: string }>) {
  //   const { endpoint } = req.params;
  //
  //   if (!clients.has(endpoint)) clients.set(endpoint, new Set());
  //
  //   clients.get(endpoint)!.add(ws); // The ! is used to assert that the value is not undefined, since we just initialized it if it didn't exist.
  //   ws.on("close", () => {
  //     // The ? is used to check if the value exists before trying to call delete on it,
  //     // which prevents potential runtime errors if the endpoint was somehow removed from the clients map 
  //     // while the WebSocket connection was still open.
  //     clients.get(endpoint)?.delete(ws);
  //   });
  // },

  async streamBasketEvents(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;
    
    // Set SSE headers:
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Cache-Control", "no-cache");

    // Force express to send headers to client immediately.
    // This establishes connection to client, allowing
    //  subsequent `write()` calls to send data to client in real time.
    res.flushHeaders(); 

    // Register response object as a client connected to corresponding endpoint.
    if (!clients.has(endpoint)) clients.set(endpoint, new Set());
    const basket = clients.get(endpoint);
    if (basket) basket.add(res);
    
    // Send "heartbeat" message to confirm connection.
    res.write(": connected\n\n");
    
    // Remove endpoint from `clients` when `client` disconnects.
    req.on("close", () => {
      // Get all clients associated with a given endpoint.
      const basketClients = clients.get(endpoint);

      // If any clients exists, 
      //  - delete the `res` object associated with this endpoint
      //  - if no more clients exist for this endpoint, delete the endpoint from `clients` map
      if (basketClients) {
        basketClients.delete(res);
        if (basketClients.size === 0) clients.delete(endpoint);
      }
    })
  },

  async handleGetBasketRequests(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;

    try {
      const requests = await mongoModel.getBasketRequests(endpoint)
      res.status(200).json(requests);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to retrieve basket"});
    }
  },

  async handleCreateNewBasket(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;
    let basketExists;

    try {
      basketExists = await pgModel.basketExists(endpoint);

      if (basketExists) {
        res.status(409).json({ error: "Endpoint already taken. Please choose another endpoint." });
      } else {

        try {
          const token = await pgModel.addNewBasket(endpoint);
          res.status(200).json({ [`basket_${endpoint}`]: token });
        } catch (e) {
          res.status(400).json({ error: "Basket could not be created." });
        }
      }
    } catch (e) {
      console.error("addNewBasket error", e);
      res.status(400).json({ error: "Basket could not be created " });
    }
  },

  async handleWebhookRequest(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;
    const { method, headers, body } = req;

    const data: RequestData = {
      endpoint,
      method,
      headers,
      body,
    };

    try {
      await mongoModel.addWebhookRequest(data);
      
      // Push data to any/all clients connected to `endpoint`.
      const basketClients = clients.get(endpoint);
      if (basketClients && basketClients.size > 0) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        basketClients.forEach(client => client.write(payload));
      }
      res.status(200).json({ msg: "Webhook message received." });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: 'Webhook request failed.'});
    }
  },

  async handleClearBasket(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;

    if (await pgModel.basketExists(endpoint)) {
      try {
        const { deletedCount } = await mongoModel.clearBasket(endpoint);
        res.status(200).json({ deletedCount });
      } catch (e) {
        res.status(400).json({ error: "Basket could not be cleared." });
      }
    } else {
      res.status(400).json({ error: "Basket doesn't exist!" });
    }
  },
  
  async handleHealthCheck(req: Request, res: Response) {
    res.status(200).json({ message: "Server is running normall." });
  }
};
