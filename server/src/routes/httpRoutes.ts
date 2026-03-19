import { basketController } from "../controllers/basketController";
import type { Router } from 'express';

export function registerHttpRoutes(router: Router) {
  // router.get("/baskets", basketController.handleGetBaskets);

  // router.get("/", basketController.handleRedirectToBaskets);

  router.get("/baskets/:endpoint", basketController.handleGetBasketRequests);

  router.post("/baskets/create/:endpoint", basketController.handleCreateNewBasket);

  router.get("/baskets/:endpoint/stream", basketController.streamBasketEvents);

  router.put("/:endpoint/clear", basketController.handleClearBasket);

  router.get("/health", basketController.handleHealthCheck);

  router.all("/:endpoint", basketController.handleWebhookRequest);
}
