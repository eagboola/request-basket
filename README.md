# request-basket


## Tokens / Authentication

> [!note]
> We assume that users who alter, delete, or otherwise lose their tokens
> will no longer be able to access the associated basket.

Local storage of tokens makes exposes them in developer tools.
An alternative could be to implement user profiles with authentication.
We've chose to implement browser-local storage.

//.env
SECRET_KEY for token
DB_URL