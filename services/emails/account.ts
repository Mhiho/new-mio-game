import jwt from 'jsonwebtoken';
const nodemailer = require('nodemailer');
const { myMail, secret, tempSecret, server } = require('../config');
const db = require('../_helpers/db');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: myMail.user,
    pass: myMail.password,
  },
});

export const sendVerificationMail = async (email, name) => {
  const user = await db.User.scope('withHash').findOne({ where: { email } });
  const token = jwt.sign({ id: user.userID, valid: user.validated }, secret, { expiresIn: '1d' });
  await transporter
    .sendMail({
      from: '"Administrator" m.pelka7@gmail.com',
      to: email,
      subject: 'Zweryfikuj swoje konto',
      //UWAGA
      html: `<div><h1>Cześć ${name},</h1> <hr></hr> </br> <h3>Zweryfikuj swoje konto:</h3> </br> <button style="background: #2e2b22; color: #eee; height: 50px; width: 90px; border-radius: 5px"><a style="color: white; text-decoration: none; font-weight: bold" href="${server}users/verify?token=${token}&code=${user.race}">Zweryfikuj</a></button>\n <hr></hr> </br> <h3 style="color:darkgrey">Jeśli to nie ty, zignoruj tego maila.</h3>\n <h2> Pozdrawiamy! \n Obsługa</h2></div>`,
      //
    })
    .catch((e) => console.log(e));
};

export const sendResetPwd = async (email) => {
  const user = await db.User.scope('withHash')
    .findOne({ where: { email } })
    .catch((e) => console.log(e));
  const name = user.name;
  const token = jwt.sign({ id: user.userID }, tempSecret, { expiresIn: '3600s' });
  await db.Token.create({ token, userID: user.userID });
  await transporter
    .sendMail({
      from: '"Administrator" m.pelka7@gmail.com',
      to: email,
      subject: 'Zresetuj hasło',
      //UWAGA
      html: `<div><h1>Cześć ${name},</h1> <hr></hr> </br> <h3>Zresetuj swoje hasło:</h3> </br> <a style="color: white; text-decoration: none; font-weight: bold" href="${server}users/checkResetMail?token=${token}"><button style="background: #2e2b22; color: #eee; height: 50px; width: 90px; border-radius: 5px">Reset</button></a> \n  <hr></hr> </br>  <h3 style="color:darkgrey">Jeśli nie wysłałeś prośby o zmianę hasła, skontaktuj się z nami jak najszybciej.\n <h2> Pozdrawiamy! \n Obsługa</h2></div>`,
      //
    })
    .catch((e) => console.log(e));
};
