import httpStatus from 'http-status';
import {generateAuthorizationHeader} from '@natlibfi/melinda-commons';
import {generateJwtToken} from '@natlibfi/passport-melinda-jwt';
import {Router} from 'express';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import {sanitizeString} from '../../services/authService.js';
import {handleError} from '../routerUtils/routerUtils.js';

export function createAuthRouter(passport, jwtOptions) {
  const logger = createLogger();
  //expected cookie name for jwt token is from passport-melinda-jwt-js cookieExtractor function,
  //set to be used in app.js MelindaJwtStrategy jwtFromRequest
  const cookieNames = {
    userToken: 'melinda'
  };

  return new Router()
    .post('/getBaseToken', getBaseToken)
    .get('/verifyBasic', passport.authenticate('melinda', {session: false}), verifyBasic)
    .get('/verifyJwt', passport.authenticate('jwt', {session: false}), verifyJwt)
    .get('/logout', passport.authenticate('jwt', {session: false}), logout)
    .use(handleError);

  function getBaseToken(req, res) {
    const {username, password} = req.body;
    if (!username || !password) {
      res.status(500).json({error: 'username or password malformed or missing'});
      return;
    }
    try {
      const cleanUserName = sanitizeString({value: username, options: {allowedPattern: 'a-zA-Z0-9_\\-äöåÄÖÅ'}});
      const authToken = generateAuthorizationHeader(cleanUserName, password);

      res.json({token: authToken});
    } catch (error) {
      res.status(500).json({error: 'Failed to either process user info or generate token.'});
    }
  }

  function verifyBasic(req, res) {
    logger.info('auth/ - verifyBasic');
    const {displayName, id, authorization, emails} = req.user;
    const token = generateJwtToken({displayName, id, authorization, emails}, jwtOptions);
    res.cookie(cookieNames.userToken, token, {httpOnly: true, SameSite: 'None', secure: process.env.NODE_ENV === 'production', maxAge: getCookieMaxAge()});
    res.status(httpStatus.OK).json(req.user);
  }

  function verifyJwt(req, res) {
    logger.info('auth/ - verifyJwt');
    const {displayName, id, authorization, emails} = req.user;
    const token = generateJwtToken({displayName, id, authorization, emails}, jwtOptions);
    res.cookie(cookieNames.userToken, token, {httpOnly: true, SameSite: 'None', secure: process.env.NODE_ENV === 'production', maxAge: getCookieMaxAge()});
    res.status(httpStatus.OK).json(req.user);
  }

  function logout(req, res) {
    Object.keys(cookieNames).forEach(cookieKey => {
      const cookieName = cookieNames[cookieKey];
      res.clearCookie(cookieName);
    });
    //res.sendStatus(HttpStatus.OK);
    res.redirect('/');
  }

  function getCookieMaxAge() {
    //set required data to cookie with proper options
    const isInProduction = process.env.NODE_ENV === 'production';
    //cookie age in hours
    const cookieAgeDevelopment = 12;
    const cookieAgeProduction = 9;
    const cookieAge = getHoursInMilliSeconds(isInProduction ? cookieAgeDevelopment : cookieAgeProduction);

    return cookieAge;

    function getHoursInMilliSeconds(requestedHourCount) {
      return requestedHourCount * 60 * 60 * 1000;
    }
  }
}
