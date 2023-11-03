import type { NextApiRequest, NextApiResponse } from 'next'
 
type ResponseData = {
    message: string
}
 
export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
) {
    if (req.method === 'GET') {
        res.status(200).send('Hello')
    } else {
        res.status(405).send('Method Not Allowed')
    }
}