const secret = require('../config').secret;
const tempSecret = require('../config').tempSecret;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const { sendVerificationMail, sendResetPwd } = require('../emails/account');
const multer = require('multer');


async function getPath(name) {
    return await db.User.scope('withHash').findOne({ where: { name }}).catch(e => console.log(e))
}

const uploadAvatars = multer({ dest: 'uploads/avatars/' });

async function addAvatar(file) {
    await uploadAvatars.single('avatar');
}

async function authenticate(body) {
    const user = await db.User.scope('withHash').findOne({ where: { email: body.email } }).catch(e=>console.log(e));
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))){
        return 'Email or password is incorrect';
    }
    if (user.validated !== true) {
        return 'You must activate your account'
    }
    const token = jwt.sign({ sub: user.userID }, secret, { expiresIn: '30d' });
    user.tokens.push({token});
    await db.User.update({tokens: user.tokens},{where: {userID: user.userID}}).catch(e=> console.log(e));
    const response = { ...omitHash(user.get()) };
    return {response, token};
}

async function verify(token) {
    const decoded = jwt.verify(token, secret)
    const user = await db.User.scope('withHash').findOne({ where: {userID: decoded.id}}).catch(e => console.log(e))

    const tokenTrue = jwt.sign({ id: user.userID, valid: user.validated }, secret, { expiresIn: '1d' });
    const decodedTrue = jwt.verify(tokenTrue, secret)
    if(decodedTrue.valid === true) {
        return '0'
    }
        //update usera, jeśli nie to za 24h usunac go
    if(user.validated === true) {
        return '1';
    }
    // const defaultAvatarPath = 
    if(user.validated === false) {
        await db.User.update({validated: true, avatar: 'avatars/fighter.jpg'}, { where: { userID: decoded.id, }}).catch(e=> console.log(e));
        return {return: '2', userID: user.userID};
    }
}

async function startResetPassword(email) {
    const user = await db.User.scope('withHash').findOne({ where: { email }}).catch(e => console.log(e));
    if(user === null) {
        return null;
    }
    await sendResetPwd(email).catch(e => console.log(e));
    return 'done';
    }

async function checkResetMail(mailToken) {
    const decoded = jwt.verify(mailToken, tempSecret)
    const user = await db.User.scope('withHash').findOne({ where: {userID: decoded.id}}).catch(e => console.log(e));
    if(!user) {
        return 'no user'
    }
    const token = await db.Token.findOne({ where: { token: mailToken, userID: decoded.id }}).catch(e => console.log(e))    
    if(token) {
        return token
    } else {
        return 'mail not ok'
    }
}

async function resetPwd(password, token) {
    const isToken = await db.Token.findOne({ where: { token }}).catch(e => console.log(e))
    if(!isToken) {
        return 'there is no such token';
    }
    const reseted = await bcrypt.hash(password, 10);
    const decoded = await jwt.verify(isToken.token, tempSecret);
    await db.User.update({ passwordHash: reseted },{where: { userID: decoded.id }}).catch(e=> console.log(e));
    await db.Token.destroy({ where: { token }}).catch(e=> console.log(e));;
    return 'password changed'
}

async function getAll() {
    return await db.User.findAll();
}

async function getById(id) {
    return await getUser(id);
}

async function create(body) {
    // validate
    if (await db.User.findOne({ where: { name: body.name }})) {
        throw 'Username "' + body.name + '" is already taken';
    }
    if (await db.User.findOne({ where: { email: body.email }})) {
        throw 'Email "' + body.email + '" is already taken';
    }
    // hash password
    if (body.password) {
        body.passwordHash = await bcrypt.hash(body.password, 10);
    
    }
    // save user
    await db.User.create(body).catch(e=> console.log(e));
    await sendVerificationMail(body.email, body.name).catch(e=> console.log(e));
}

async function update(id, params) {
    const user = await getUser(id);

    // validate
    const nameChanged = params.name && user.name !== params.name;
    if (nameChanged && await db.User.findOne({ where: { name: params.name } })) {
        throw 'Username "' + params.name + '" is already taken';
    }

    // hash password if it was entered
    if (params.password) {
        params.hash = await bcrypt.hash(params.password, 10);
    }

    // copy params to user and save
    Object.assign(user, params);
    await user.save();

    return omitHash(user.get());
}

async function _delete(id) {
    const user = await getUser(id);
    await user.destroy();
}

// helper functions

async function getUser(id) {
    const user = await db.User.findByPk(id);
    if (!user) throw 'User not found';
    return user;
}

function omitHash(user) {
    const { passwordHash, userID, tokens, email, ...userWithoutHash } = user;
    return userWithoutHash;
}
export const user = {
        authenticate,
        getAll,
        getById,
        create,
        update,
        delete: _delete,
        verify,
        startResetPassword,
        checkResetMail,
        resetPwd,
        addAvatar,
        getPath,
    };