import db from "../../lib/db"
import type { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server'


 
type ResponseData = {
  message: string
}
 
/*export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
    console.log(`The connection URL is ${process.env.DATABASE_URL}`);
  res.status(200).json({ message: 'Hello from Next.js!' });
}

export const GET = (res: NextApiResponse<ResponseData>) => {
  return new NextResponse("This is my first API")
}*/


// Define a type for handlers
type MethodHandler = (req: NextApiRequest, res: NextApiResponse) => void;
interface Transaction {
    type: string,
    amount: number,
    transaction_date: string
}


// Define handlers for each method
const handlers: Record<string, MethodHandler> = {
  POST: (req, res) => {
    const transaction = req.body as Transaction;

    if (transaction) {
        console.log(transaction)


        const trans = db.transaction.create({
            data: {
                type: "EXPENSE",
                amount: 2000,
                transaction_date: "12th Jan 2025",
              
            },
          });

          console.log(trans)

      res.status(200).json({ message: 'Transaction saved' });
    } else {
      res.status(400).json({ error: 'Name and email are required!' });
    }
  },

  GET: (req, res) => {
    res.status(200).json({ message: 'This is a GET request. Send a POST request to interact.' });
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method as string;

  // Find the handler for the current method
  const methodHandler = handlers[method];

  if (methodHandler) {
    methodHandler(req, res);
  } else {
    res.setHeader('Allow', Object.keys(handlers));
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}