import type { NextApiRequest, NextApiResponse } from 'next'
const Joi = require("joi");
const validateRequest = require("../_middleware/validate-request");
const authorize = require("../_middleware/auth");
const userService = require("./user.service");
const { page } = require("../config");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sharp = require("sharp");
const { storage } = require("../config");
const upload = multer(storage);
const path = require("path");
const fs = require("fs");
const { initVillage } = require("../newUser/init-village");

export const router = {}
router.post("/authenticate", authenticateSchema, authenticate);
router.post("/register", registerSchema, register);
router.get("/", authorize(), getAll);
router.get("/current", authorize(), getCurrent);
router.put("/:id", authorize(), updateSchema, update);
router.delete("/:id", authorize(), _delete);
router.post("/logoutCurrent", authorize(), logoutCurrent);
router.post("/logoutAll", authorize(), logoutAll);
router.get("/verify", verify);
router.post("/sendEmailToResetPassword", startResetPassword);
router.post("/resetPassword/:token", changePasswordSchema, resetPwd);
router.get("/checkResetMail", checkResetMail);
// router.post('/addAvatar', authorize(), addAvatar);
// router.get('/:id', authorize(), getById);
router.get("/avatar/:name", authorize(), getAvatar);


async function getAvatar(req, res, next) {
  if (req.params.name) {
    const user = await userService
      .getPath(req.params.name)
      .catch((e) => console.log(e));
      await res.send(user.avatar);
    } else {
    res.send("Nok");
  }
}

router.post("/addAvatar", upload.single("avatar"), async (req, res, next) => {
  console.log(req.file);
  if (!req.file) {
    console.log("image not attached");
    return;
  }

  const dir = `public/avatars/${req.body.name}`;
  //delete from avatars/ ??

  if (!fs.existsSync(`${dir}`)) {
    fs.mkdirSync(dir, { recursive: true });
  } else {
    fs.readdir(dir, (err, files) => {
      if (err) {
        throw err;
      }
      for (let file of files) {
        fs.unlink(path.join(dir, file), (err) => {
          if (err) throw err;
        });
      }
    });
  }
  
  if (!req.file.path) {
    console.log("lack of image");
    return;
  }
  await sharp(req.file.path)
  .resize(300)
  .jpeg({quality: 50})
  .toFile(path.resolve(`${dir}/${req.body.time}.jpeg`)).catch(e => console.log(e))
  fs.unlinkSync(req.file.path)
  await db.User.update(
    {
      avatar: `avatars/${req.body.name}/${req.body.time}.jpeg`,
    },
    { where: { name: req.body.name } }
  ).catch((e) => console.log(e));
  const user = await db.User.scope("defaultScope")
  .findOne({ where: { name: req.body.name } })
    .catch((e) => console.log(e));
  res.send(user.avatar);
});

async function verify(req, res, next) {
  const response = await userService.verify(req.query.token).catch((e) => {
    if (Object.values(e).includes("jwt expired")) {
      res.redirect(`${page}tokenExpired`);
    }
    console.log(e);
  });
  if (response === '0') {
    res.redirect(`${page}tokenUsed`);
  }
  if (response === '1') {
    res.redirect(`${page}userExist`);
  }
  // if (response === '3') {
  //   console.log('dupa')
  // }
  if (response.return === '2') {
    await initVillage(req.query.code, response.userID);
    await res.redirect(`${page}login`);
  }
}

async function startResetPassword(req, res, next) {
  const response = await userService
    .startResetPassword(req.body.email)
    .catch(next);
  if (response === null) {
    res.send("not done");
  }
  if (response === "done") res.send(JSON.stringify(response));
}
async function checkResetMail(req, res, next) {
  const response = await userService
  .checkResetMail(req.query.token)
    .catch((e) => {
      if (Object.values(e).includes("jwt expired")) {
        res.redirect(`${page}tokenExpired`);
      }
      console.log(e);
    });
  console.log(response);
  if (response === "mail not ok") {
    res.redirect(`${page}`);
  }
  if (response.token === req.query.token) {
    res.redirect(`${page}resetMyPassword/${response.token}`);
  }
}
async function changePasswordSchema(req, res, next) {
  const schema = Joi.object({
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}
async function resetPwd(req, res, next) {
  const { token } = req.params;
  const { password } = await req.body;
  userService
  .resetPwd(password, token)
    .then((data) => res.send(data))
    .catch(next);
}

function authenticateSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}


export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
  ) {
    res.status(200).json({ name: 'John Doe' })
  }

function authenticate(req, res, next) {
  userService
    .authenticate(req.body)
    .then((response) => {
      res.send(response);
    })
    .catch((e) => console.log(e));
}

function registerSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string(),
    name: Joi.string().required(),
    password: Joi.string().min(8).required(),
    race: Joi.string().valid("0", "1", "2").required(),
  });
  validateRequest(req, next, schema);
}

function register(req, res, next) {
  userService
    .create(req.body)
    .then(() => res.json({ message: "jest nowy" }))
    .catch(next);
  }

function getAll(req, res, next) {
  userService
    .getAll()
    .then((users) => res.json(users))
    .catch(next);
}

function getCurrent(req, res, next) {
  console.log("nizej");
  console.log(req);
  console.log(req.user.details);
  res.json(req.user);
}
//to nie działa
function getById(req, res, next) {
  userService
  .getById(req.params.id)
    .then((user) => res.json(user))
    .catch(next);
}

function updateSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().empty(""),
    name: Joi.string().empty(""),
    password: Joi.string().min(8).empty(""),
  });
  validateRequest(req, next, schema);
}

function update(req, res, next) {
  userService
    .update(req.params.id, req.body)
    .then((user) => res.json(user))
    .catch(next);
  }

async function logoutCurrent(req, res, next) {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send("logoutCurrent done");
  } catch (e) {
    res.status(500).send(e);
  }
}

async function logoutAll(req, res, next) {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.send("Wylogowałeś się ze wszystkiego");
  } catch (e) {
    res.status(500).send(e);
  }
}

function _delete(req, res, next) {
  userService
  .delete(req.params.id)
    .then(() => res.json({ message: "User deleted successfully" }))
    .catch(next);
  }