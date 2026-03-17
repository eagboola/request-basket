import type { BasketUrls } from "../types/BasketUrls";
import { Link } from 'react-router-dom';
import copy from 'copy-to-clipboard';

export default function Modal({urls, setVisibleModal}:
  { urls: BasketUrls,
    setVisibleModal: (value: React.SetStateAction<boolean>) => void
  }) {

  function handleCopyURL() {
    // `navigator.clipoard` is a browser API that allows copying text to the clipboard.
    // It's usually allows in secure contexts - https.
    // For http, it will be `undefined`, so there needs to be a fallback.
    // We could use a conditional fallback where if the context is http, we use a deprecated approach to
    // allow copying the URL, but this isn't best practice.
    // For deployment, we'd want to either:
    // - use a registered domain with https
    // - use an npm library like `copy-to-clipboard` or `clipboard-copy`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urls.sendToBasket);
    } else {}
  }

  const basketName = urls.sendToBasket.split('/').slice(-1)[0];
  return (
    <div id="overlay"
         onClick={() => setVisibleModal(false)}>
      <main id="modal"
            onClick={e => e.stopPropagation()}>
        <p>Congratulations! Your basket has been created.</p>
        <ul>
          <li>To look at the contents of your basket, visit
            <Link to={`/baskets/${basketName}`}> {urls.viewBasket}
            </Link>
          </li>
          <li>To send an HTTP request to your basket, use {urls.sendToBasket}
            <button onClick={handleCopyURL}>
              Copy URL
            </button>
          </li>
        </ul>
      </main>
    </div>
  );
}
