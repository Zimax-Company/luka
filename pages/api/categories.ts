import type { NextApiRequest, NextApiResponse } from 'next'
import db from "../../lib/db"


// Define a type for handlers
type MethodHandler = (req: NextApiRequest, res: NextApiResponse) => void;
interface Category {
    name: string,
    icon: string,
    type: string
}


// Define handlers for each method
const handlers: Record<string, MethodHandler> = {
  POST: (req, res) => {
    const category = db.category.findMany()

    if (category) {
        console.log(category)
      res.status(200).json({ message: 'category fetched' });
    } else {
      res.status(400).json({ error: 'Name and email are required!' });
    }
  },

  GET: async (req, res) =>  {
    const cat = await db.category.findMany({})
    console.log(cat)
    res.status(200).json({ message: 'This is a GET request. Send a POST request to interact.', data: cat });
  },
};

export  default async function handler(req: NextApiRequest, res: NextApiResponse) {

  /*const cat = await db.category.findMany({})
    console.log(cat)
    res.status(200).json({ message: 'This is a GET request. Send a POST request to interact.', data: cat });*/


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