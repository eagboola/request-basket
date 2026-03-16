import type { Request } from '../types/Request';
import { useState, type SyntheticEvent } from 'react';
import { Headers } from './Headers.tsx';

export default function SingleRequest({ request }: { request: Request }) {
  const [headersIsVisible, setHeadersIsVisible] = useState<boolean>(false);

  function toggleHeaders(e: SyntheticEvent) {
    e.preventDefault();
    setHeadersIsVisible(!headersIsVisible);
  }

  return (
    <>
      <li className="request-method">Method: {request.method}</li>
      <li className="request-body">Body:<br/>
        {typeof request.body !== 'string' ? JSON.stringify(request.body) : request.body}
      </li>
      <li className="request-headers"><a onClick={toggleHeaders}>Headers:</a><br/>
        {headersIsVisible && <Headers headers={request.headers}/>}
      </li>
    </>
  )
}