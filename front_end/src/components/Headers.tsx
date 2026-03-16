import type { HeadersType } from '../types/HeadersType';

export function Headers({ headers }: { headers: HeadersType }) {
  let formattedHeaders = '';
  let nextKey = 1;
  for (let prop in headers) {
    formattedHeaders += prop + ': ' + headers[prop] + '\n\n';
  }
  return (
    <code>{Object.entries(headers).map(([ key, value ]) => {
      return <div key={nextKey++}>{key + ': ' + value}</div>
    })}
    </code>
  );
};