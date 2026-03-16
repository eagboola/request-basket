import type { BasketUrls } from "../types/BasketUrls";
import { Link } from 'react-router-dom';

export default function Modal({urls, setVisibleModal}:
  { urls: BasketUrls,
    setVisibleModal: (value: React.SetStateAction<boolean>) => void
  }) {

  function handleCopyURL() {
    navigator.clipboard.writeText(urls.sendToBasket);
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