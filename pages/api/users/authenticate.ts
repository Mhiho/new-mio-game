// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  name: string;
};

const db = require('../_helpers/db');

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  router.post('/authenticate', authenticateSchema, authenticate);
  {
    const user = await db.User.scope('withHash')
      .findOne({ where: { email: body.email } })
      .catch(e => console.log(e));
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return 'Email or password is incorrect';
    }
    if (user.validated !== true) {
      return 'You must activate your account';
    }
    const token = jwt.sign({ sub: user.userID }, secret, { expiresIn: '30d' });
    user.tokens.push({ token });
    await db.User.update(
      { tokens: user.tokens },
      { where: { userID: user.userID } },
    ).catch(e => console.log(e));
    const response = { ...omitHash(user.get()) };
    return { response, token };
  }
  res.status(200).json({ name: 'John' });
}
