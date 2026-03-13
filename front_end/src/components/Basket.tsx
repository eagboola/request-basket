import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import RequestList from './RequestList.tsx';
import type { Request } from '../types/Request';
// import { useWebSocket } from '../hooks/useWebSocket';
import { useSSE } from '../hooks/useSSE';

export default function Basket() {
  const [requests, setRequests] = useState<Array<Request>>([]);
  const { url } = useParams();
  // const { newRequest, sendMessage } = useWebSocket(`http://localhost:3000/baskets/${url}`);
  // const { newRequest, connected } = useSSE(`http://localhost:3000/baskets/${url}/stream`);
  // const { newRequest } = useSSE(`http://localhost:3000/baskets/${url}/stream`);
  const { newRequest } = useSSE(`/baskets/${url}/stream`);

  function handleNewRequest() {
    if (newRequest !== null) setRequests([...requests, newRequest]);

    // what message should we actually send? Do we need to send a message?
    // sendMessage('GOT IT!');
  }

  useEffect(handleNewRequest, [newRequest]);

  function getRequests() {
    (async () => {
      try {
        // let response = await fetch(`http://localhost:3000/baskets/${url}/`);
        let response = await fetch(`/baskets/${url}/`);
        if (response.ok) {
          setRequests(await response.json());
        } else {
          let { error } = await response.json();
          console.error(error);
        }
      } catch (e: Error | unknown) {
        if (e instanceof Error) {
          console.error(e)
        }
      }
    })();
  }

  useEffect(getRequests, []);
  
  async function handleClearBasket() {
    const options = {
      method: 'PUT'
    };

    try {
      // const response = await fetch(`http://localhost:3000/${url}/clear`, options);
      const response = await fetch(`/${url}/clear`, options);
      if (!response.ok) {
        const { error } = await response.json();
        console.error(error);
        return;
      } 
      
      const { deletedCount } = await response.json();
      console.log(`Deleted ${deletedCount} responses`);
      setRequests([]);
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    }
  } 
  

  return (
    <div className="basket-container" id="basket">
      <h1 className="basket-title">Basket Name: {url}</h1>
      <div className="basket-list-wrapper">
        <RequestList requests={requests} />
      </div>
      <button onClick={handleClearBasket}
              style={{"backgroundColor": 'red'}}>
                Clear Basket
      </button>
      <Link className="back-link" to="/">Back</Link>
    </div>
  )
}
