import { useState } from 'react';
import Modal from  "./Modal"
import { createBasketName, isValidBasketName, getBasketsFromStorage } from "../utils/basketUtilities";
import type { BasketUrls } from "../types/BasketUrls";
import type { BasketToken } from "../types/Token";
import BasketList from './BasketList';

function BasketNameError({error}: {error: string}) {
  return (
    <div id="basket-name-error">{error}</div>
  );
}

export default function Home() {
  const [basketName, setBasketName] = useState(createBasketName());
  const [visibleModal, setVisibleModal] = useState(false);
  const [error, setError] = useState('');
  const [urls, setUrls] = useState<BasketUrls>({viewBasket: '', sendToBasket: ''});
  const [basketTokens, setBasketTokens] = useState<Array<BasketToken>>(getBasketsFromStorage());

  async function handleCreateBasket(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    
    if (!isValidBasketName(basketName)) {
      setError('Basket name must be 8-25 chars, and can only include letters and numbers');
      
      return;
    }

    let options = {
      method: 'POST'
    };

    try {
      let response = await fetch(`http://localhost:3000/api/baskets/create/${basketName}`, options);
      if (response.ok) {
        console.log('Basket successfully created');
        let token: BasketToken = await response.json();
        console.log(token);
        localStorage.setItem(Object.keys(token)[0], Object.values(token)[0]);
        let urls: BasketUrls = {
          viewBasket: `http://localhost:3000/baskets/${basketName}`,
          sendToBasket: `http://localhost:3000/api/${basketName}`,
        }
        setUrls(urls);
        setVisibleModal(true);
        setBasketTokens(getBasketsFromStorage());
      } else {
        let message = await response.text();
        setError(message);
      }

      // TEST MODAL:
      // let urls: BasketUrls = {
      //   viewBasket: `http://localhost:3000/baskets/${basketName}`,
      //   sendToBasket: `http://localhost:3000/${basketName}`
      // };
      // setUrls(urls);
      // setVisibleModal(true);
      // setBasketName(createBasketName());
    
    } catch (e: Error | unknown) {
      if (e instanceof Error) {
        console.log(e.message);
      }
    }
  }
  
  return (
    <>
      {visibleModal && <Modal urls={urls}
                              setVisibleModal={setVisibleModal}/>}
      {error && <BasketNameError error={error}/>}     
      <form onSubmit={handleCreateBasket}>
        Basket Name:<input type="text"
          value={basketName}
          onChange={(e) => setBasketName(e.target.value)}></input>
        <button type="submit">Create Basket</button>
      </form>
      <BasketList basketTokens={basketTokens}/>
    </>
  )
}